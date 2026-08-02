import type { LavalinkConfig } from '../types/config';
import type { MusicSearchOptions, MusicSource, MusicTrack } from './types';
import { createHash } from 'crypto';
import { getRedisClient } from '../utils/redisCache';
import { detectMusicSource, fallbackSourcesFor, isUrl, normalizeDurationMs, sourcePrefix } from './playbackResolver';

interface LavalinkTrackInfo {
  identifier?: string;
  title?: string;
  author?: string;
  length?: number;
  isStream?: boolean;
  uri?: string;
  artworkUrl?: string;
  sourceName?: string;
}

interface LavalinkTrack {
  encoded?: string;
  info?: LavalinkTrackInfo;
}

interface LavalinkLoadResult {
  loadType?: string;
  data?: LavalinkTrack | LavalinkTrack[] | { tracks?: LavalinkTrack[]; message?: string; severity?: string; cause?: string };
}

const SEARCH_CACHE_TTL_SECONDS = 60;

function thumbnailFor(info: LavalinkTrackInfo, source: MusicSource): string | undefined {
  if (info.artworkUrl) return info.artworkUrl;
  if (source === 'youtube' && info.identifier) {
    return `https://img.youtube.com/vi/${info.identifier}/hqdefault.jpg`;
  }
  return undefined;
}

function normalizeTrack(track: LavalinkTrack, requester: MusicSearchOptions['requester']): MusicTrack | null {
  const info = track.info;
  if (!info?.title) return null;
  const source = (info.sourceName || 'unknown').toLowerCase() as MusicSource;
  const idSource = info.identifier || info.uri || `${info.title}:${info.author ?? ''}`;
  const id = createHash('sha1').update(`${source}:${idSource}`).digest('hex');
  return {
    id,
    encodedTrack: track.encoded,
    title: info.title,
    author: info.author,
    durationMs: normalizeDurationMs(info.length, info.isStream),
    isStream: info.isStream,
    uri: info.uri,
    source,
    thumbnailUrl: thumbnailFor(info, source),
    requester,
    confidence: 1,
  };
}

export class SearchService {
  private lavalink?: LavalinkConfig;
  private nodeIndex = 0;

  configure(lavalink?: LavalinkConfig): void {
    this.lavalink = lavalink;
  }

  async search(options: MusicSearchOptions): Promise<MusicTrack[]> {
    const query = options.query.trim();
    if (!query) return [];

    const source = detectMusicSource(query, options.source);
    const cacheKey = `music:search:${createHash('sha1').update(`${source}:${query}`).digest('hex')}`;
    const redis = getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as MusicTrack[];
    }

    let results = await this.searchLavalink(query, source, options);
    for (const fallbackSource of fallbackSourcesFor(source, query)) {
      if (results.length > 0) break;
      results = await this.searchLavalink(query, fallbackSource, options).catch(() => []);
    }
    if (redis) {
      await redis.setex(cacheKey, SEARCH_CACHE_TTL_SECONDS, JSON.stringify(results));
    }
    return results;
  }

  private async searchLavalink(query: string, source: MusicSource, options: MusicSearchOptions): Promise<MusicTrack[]> {
    const nodes = this.lavalink?.nodes?.length ? this.lavalink.nodes : this.lavalink ? [this.lavalink] : [];
    if (nodes.length === 0) {
      return [];
    }

    const identifier = isUrl(query) ? query : `${sourcePrefix(source)}${query}`;
    const orderedNodes = [...nodes.slice(this.nodeIndex), ...nodes.slice(0, this.nodeIndex)];
    let lastError: unknown;

    for (const node of orderedNodes) {
      try {
        const protocol = node.secure ? 'https' : 'http';
        const url = `${protocol}://${node.host}:${node.port}/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`;
        const response = await fetch(url, {
          headers: {
            Authorization: node.password,
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
          throw new Error(`Lavalink arama hatası (${node.id}): ${response.status} ${response.statusText}`);
        }
        this.nodeIndex = (nodes.findIndex((candidate) => candidate.id === node.id) + 1) % nodes.length;
        const body = (await response.json()) as LavalinkLoadResult;
        if (body.loadType === 'error') {
          const errData = body.data && !Array.isArray(body.data) && 'message' in body.data
            ? body.data as { message?: string; cause?: string }
            : undefined
          const detail = [errData?.message, errData?.cause].filter(Boolean).join(' — ')
          const isSpotify = /spotify\.com|spotify:/i.test(identifier)
          throw new Error(
            detail ||
              (isSpotify
                ? 'Spotify içeriği yüklenemedi. SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET tanımlı olmalı (LavaSrc).'
                : 'YouTube/Lavalink parça yüklenemedi'),
          )
        }
        if (body.loadType === 'empty') {
          return []
        }
        const rawTracks = this.extractTracks(body);
        return rawTracks
          .map((track) => normalizeTrack(track, options.requester))
          .filter((track): track is MusicTrack => Boolean(track))
          .slice(0, options.limit ?? 10);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Lavalink arama hatası.');
  }

  private extractTracks(body: LavalinkLoadResult): LavalinkTrack[] {
    if (Array.isArray(body.data)) return body.data;
    if (body.data && 'tracks' in body.data && Array.isArray(body.data.tracks)) return body.data.tracks;
    if (body.data && 'info' in body.data) return [body.data as LavalinkTrack];
    return [];
  }
}

export const searchService = new SearchService();
