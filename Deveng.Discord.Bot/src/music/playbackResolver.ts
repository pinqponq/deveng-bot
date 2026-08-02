import type { MusicPlayRequest, MusicSource, MusicTrack } from './types';

export const LIVE_DURATION_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function isUrl(query: string): boolean {
  return /^https?:\/\//i.test(query);
}

export function normalizeDurationMs(value: unknown, isStream?: boolean): number | undefined {
  if (isStream || typeof value !== 'number') return undefined;
  if (!Number.isFinite(value) || !Number.isSafeInteger(value) || value <= 0) return undefined;
  if (value >= LIVE_DURATION_THRESHOLD_MS) return undefined;
  return Math.round(value);
}

export function detectMusicSource(query: string, requested?: MusicSource | 'auto'): MusicSource {
  if (requested && requested !== 'auto') {
    return requested === 'spotify' ? 'youtube' : requested;
  }

  const lower = query.toLowerCase();
  if (lower.includes('soundcloud.com')) return 'soundcloud';
  if (lower.includes('spotify.com')) return 'spotify';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (isUrl(query)) return 'direct';
  return 'youtube';
}

export function sourceToSearchPlatform(source: MusicSource | 'auto' | undefined): string {
  if (source === 'soundcloud') return 'scsearch';
  if (source === 'spotify' || source === 'youtube' || source === 'auto' || source == null) return 'ytmsearch';
  if (source === 'direct') return 'http';
  return source;
}

export function sourcePrefix(source: MusicSource): string {
  if (source === 'soundcloud') return 'scsearch:';
  if (source === 'youtube' || source === 'spotify') return 'ytmsearch:';
  return '';
}

export function playableQueryFor(request: MusicPlayRequest, track?: MusicTrack): { query: string; source: MusicSource | 'auto' | undefined } {
  if (!track) {
    const query = request.query.trim();
    const source = detectMusicSource(query, request.source);
    return { query, source };
  }

  if (track.source === 'spotify') {
    return {
      query: [track.title, track.author].filter(Boolean).join(' ').trim(),
      source: 'spotify',
    };
  }

  const query = (track.uri || request.query || track.title).trim();
  const source = detectMusicSource(query, track.source || request.source);
  return { query, source };
}

export function fallbackSourcesFor(source: MusicSource | 'auto' | undefined, query: string): MusicSource[] {
  // Spotify URL'leri HTTP kaynağına düşmemeli (LavaSrc / API çözümler)
  if (/spotify\.com|spotify:/i.test(query)) return [];
  if (isUrl(query)) return [];
  if (source === 'youtube' || source === 'spotify' || source === 'auto' || source == null) return ['soundcloud'];
  return [];
}
