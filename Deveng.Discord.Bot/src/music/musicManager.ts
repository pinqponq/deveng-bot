import { ChannelType, PermissionFlagsBits, type Client } from 'discord.js';
import { LavalinkManager, type Player, type SearchResult, type Track, type UnresolvedSearchResult } from 'lavalink-client';
import type { BotConfig } from '../types/config';
import { getMusicFavorites, getMusicHistory, getMusicSettings, recordMusicHistory, toggleMusicFavorite } from '../utils/apiClient';
import { createNowPlayingMessage } from './musicEmbeds';
import { fallbackSourcesFor, normalizeDurationMs, playableQueryFor, sourceToSearchPlatform } from './playbackResolver';
import { realtimePublisher } from './realtimePublisher';
import { searchService } from './searchService';
import { logError } from '../utils/logger';
import type {
  MusicBulkPlayRequest,
  MusicFavoriteResponse,
  MusicHistoryItem,
  MusicLyricsResponse,
  MusicControlRequest,
  MusicLoopMode,
  MusicPlayRequest,
  MusicQueueItem,
  MusicState,
  MusicTrack,
} from './types';

const DEFAULT_VOLUME = 1;
const MAX_QUEUE_SIZE = 500;
const YOUTUBE_RESTRICTED_MESSAGE = 'Bu YouTube videosu kısıtlı veya YouTube tarafından oturum gerektiriyor. SoundCloud ya da farklı bir YouTube Music sonucu deneyin.';
type ManagedClient = {
  client: Client;
  manager?: LavalinkManager;
  rawHandler: (packet: unknown) => void;
};
type ActiveManagedClient = ManagedClient & { manager: LavalinkManager };
type PlayerMessageRef = { channelId: string; messageId: string };
type LyricsCandidate = { title: string; artist?: string; source: string };
type LrcLibResult = {
  plainLyrics?: string;
  syncedLyrics?: string;
  source?: string;
  name?: string;
  trackName?: string;
  artistName?: string;
};
type LavaLyricsResponse = {
  text?: string;
  source?: string;
  provider?: string;
  lines?: Array<{ line?: string; text?: string }>;
};
type PlayContext = {
  entry: ActiveManagedClient;
  player: Player;
  voiceChannelId: string;
  textChannelId?: string;
  created: boolean;
  generation: number;
};

function now(): string {
  return new Date().toISOString();
}

function emptyState(guildId: string, clientId?: string): MusicState {
  return {
    guildId,
    clientId,
    status: 'idle',
    queue: [],
    volume: DEFAULT_VOLUME,
    loopMode: 'off',
    paused: false,
    positionMs: 0,
    autoplay: true,
    updatedAt: now(),
  };
}

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(150, Math.round(volume)));
}

function isYoutubeRestrictedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return normalized.includes('requires login') ||
    normalized.includes('allclientsfailed') ||
    normalized.includes('player configuration') ||
    normalized.includes('sign in to confirm') ||
    normalized.includes('not a bot') ||
    normalized.includes('invalid status code for player api response') ||
    normalized.includes('sign in') ||
    normalized.includes('age') ||
    normalized.includes('private video');
}

function musicTrackFromLavalinkTrack(track: Track | any, requester?: MusicTrack['requester']): MusicTrack {
  const info = track?.info ?? {};
  const source = (info.sourceName || 'unknown').toLowerCase() as MusicTrack['source'];
  const identifier = info.identifier || info.uri || info.title || track?.encoded || `${Date.now()}`;
  return {
    id: `${source}:${identifier}`,
    encodedTrack: track?.encoded,
    title: info.title || 'Bilinmeyen şarkı',
    author: info.author,
    durationMs: normalizeDurationMs(typeof info.duration === 'number' ? info.duration : info.length, info.isStream),
    isStream: info.isStream,
    uri: info.uri,
    source,
    thumbnailUrl: info.artworkUrl,
    requester,
  };
}

function queueItemFromTrack(track: Track | any, position: number): MusicQueueItem {
  const base = musicTrackFromLavalinkTrack(track, track?.requester as MusicTrack['requester']);
  return {
    ...base,
    queueItemId: track?.encoded || `${base.id}:${position}`,
    position,
    addedAt: now(),
  };
}

function cleanLyricsText(value?: string): string {
  return (value || '')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/\([^)]*(official|video|audio|lyrics?|remaster(?:ed)?|visualizer|clip|hd|hq|4k)[^)]*\)/gi, ' ')
    .replace(/\b(official\s+)?(music\s+)?video\b/gi, ' ')
    .replace(/\b(official\s+)?audio\b/gi, ' ')
    .replace(/\blyrics?\b/gi, ' ')
    .replace(/\bremaster(?:ed)?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function withoutTopicSuffix(value?: string): string | undefined {
  const next = cleanLyricsText(value).replace(/\s*-\s*topic$/i, '').trim();
  return next || undefined;
}

function splitArtistTitle(title: string, fallbackArtist?: string): { title: string; artist?: string } {
  const cleanedTitle = cleanLyricsText(title);
  const separators = [' - ', ' – ', ' — '];
  for (const separator of separators) {
    const parts = cleanedTitle.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        artist: withoutTopicSuffix(parts[0]) || withoutTopicSuffix(fallbackArtist),
        title: cleanLyricsText(parts.slice(1).join(' - ')),
      };
    }
  }
  return {
    title: cleanedTitle,
    artist: withoutTopicSuffix(fallbackArtist),
  };
}

function lyricsCandidates(query?: string, track?: MusicTrack): LyricsCandidate[] {
  const candidates: LyricsCandidate[] = [];
  const push = (candidate: LyricsCandidate) => {
    const title = cleanLyricsText(candidate.title);
    const artist = withoutTopicSuffix(candidate.artist);
    if (!title) return;
    const key = `${title.toLowerCase()}::${(artist || '').toLowerCase()}`;
    if (candidates.some((item) => `${item.title.toLowerCase()}::${(item.artist || '').toLowerCase()}` === key)) return;
    candidates.push({ title, artist, source: candidate.source });
  };

  if (query?.trim()) {
    const parsed = splitArtistTitle(query);
    push({ ...parsed, source: 'query' });
    push({ title: query, source: 'raw-query' });
  }

  if (track) {
    push({ title: track.title, artist: track.author, source: 'metadata' });
    push({ ...splitArtistTitle(track.title, track.author), source: 'clean-title' });
    push({ title: track.title, source: 'title-only' });
  }

  return candidates;
}

export class MusicManager {
  private clients = new Map<string, ManagedClient>();
  private disconnectGenerations = new Map<string, number>();
  private autoplayByGuild = new Map<string, boolean>();
  /** Yeni oynatıcılar için varsayılan olarak autoplay'i açar; kullanıcının açık tercihini ezmez. */
  private ensureAutoplayEnabled(guildId: string): void {
    if (!this.autoplayByGuild.has(guildId)) {
      this.autoplayByGuild.set(guildId, true);
    }
  }
  /** Guild için autoplay durumunu döndürür (varsayılan: açık). */
  private getAutoplay(guildId: string): boolean {
    return this.autoplayByGuild.get(guildId) ?? true;
  }
  private playerMessagesByGuild = new Map<string, PlayerMessageRef>();
  /** Guild başına now-playing güncellemesini sıraya alır. */
  private nowPlayingUpdateChainByGuild = new Map<string, Promise<void>>();
  /** Son bilinen metin kanalı — player.textChannelId boş kaldığında now-playing kartı için fallback. */
  private lastTextChannelByGuild = new Map<string, string>();
  private config?: BotConfig;

  configure(config: BotConfig): void {
    this.config = config;
    searchService.configure(config.lavalink);
    for (const [clientId, entry] of this.clients) {
      entry.rawHandler = this.recreateManager(clientId, entry.client, entry.rawHandler).rawHandler;
    }
  }

  registerClient(client: Client, clientId?: string): void {
    const resolvedClientId = clientId || client.application?.id || client.user?.id || 'default';
    const existing = this.clients.get(resolvedClientId);
    if (existing) {
      existing.client.off('raw', existing.rawHandler);
    }
    this.recreateManager(resolvedClientId, client);
  }

  unregisterClient(clientId?: string): void {
    if (!clientId) return;
    const existing = this.clients.get(clientId);
    if (!existing) return;
    existing.client.off('raw', existing.rawHandler);
    void existing.manager?.nodeManager.disconnectAll(true, true).catch((error: unknown) => {
      console.error('[Music] Lavalink manager kapatılırken hata:', error);
    });
    this.clients.delete(clientId);
  }

  /** Süreç kapanışında tüm kayıtlı client'lerin Lavalink bağlantılarını düzgünce kapatır. */
  async shutdown(): Promise<void> {
    for (const entry of this.clients.values()) {
      entry.client.off('raw', entry.rawHandler);
      await entry.manager?.nodeManager.disconnectAll(true, true).catch((error: unknown) => {
        console.error('[Music] Kapanışta Lavalink node kapatılamadı:', error);
      });
    }
    this.clients.clear();
  }

  async getState(guildId: string, clientId?: string): Promise<MusicState> {
    const entry = this.resolveClient(clientId);
    const player = entry?.manager?.getPlayer(guildId);
    if (player) {
      const state = this.stateFromPlayer(player, clientId);
      await realtimePublisher.saveState(state);
      return state;
    }
    const cached = await realtimePublisher.getState(guildId);
    if (cached) return { ...cached, autoplay: this.getAutoplay(guildId) };
    return emptyState(guildId, clientId);
  }

  async search(options: { query: string; source?: MusicPlayRequest['source']; requester?: MusicPlayRequest['requester']; limit?: number }): Promise<MusicTrack[]> {
    return searchService.search(options);
  }

  async join(guildId: string, voiceChannelId: string, textChannelId?: string, clientId?: string): Promise<MusicState> {
    const entry = this.requireClient(clientId);
    if (!voiceChannelId) {
      throw new Error('Ses kanalına katılmak için voiceChannelId gerekli.');
    }
    // Lavalink düğümü bağlı değilken player oluşturup zombi bağlantı bırakma; net hata döndür.
    if (!entry.manager.useable) {
      throw new Error('Müzik servisi şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    }
    await this.assertJoinableVoiceChannel(entry, guildId, voiceChannelId);
    const player = entry.manager.createPlayer({
      guildId,
      voiceChannelId,
      textChannelId,
      selfDeaf: true,
      volume: DEFAULT_VOLUME,
    });
    this.syncPlayerTextChannel(player, textChannelId);
    this.ensureAutoplayEnabled(guildId);
    try {
      await player.connect();
    } catch (error) {
      // Bağlantı hatasında zombi player bırakma.
      await player.destroy('Ses kanalına bağlanılamadı', true).catch((err) => logError('musicManager:destroyOnConnectFail', err, 'warn'));
      throw error;
    }
    const state = this.stateFromPlayer(player, clientId);
    await this.persist(state, 'stateUpdated');
    return state;
  }

  /**
   * Ses kanalının var olduğunu, gerçekten bir ses kanalı olduğunu ve botun
   * bağlanma/konuşma yetkisine sahip olduğunu doğrular. Aksi halde açık bir hata fırlatır.
   */
  private async assertJoinableVoiceChannel(
    entry: ActiveManagedClient,
    guildId: string,
    voiceChannelId: string,
  ): Promise<void> {
    const guild = entry.client.guilds.cache.get(guildId)
      ?? await entry.client.guilds.fetch(guildId).catch((error) => { logError('musicManager:fetchGuildForJoin', error, 'debug'); return null; });
    if (!guild) {
      throw new Error('Sunucu bulunamadı.');
    }
    const channel = guild.channels.cache.get(voiceChannelId)
      ?? await guild.channels.fetch(voiceChannelId).catch((error) => { logError('musicManager:fetchVoiceChannelForJoin', error, 'debug'); return null; });
    if (!channel) {
      throw new Error('Belirtilen ses kanalı bulunamadı.');
    }
    if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) {
      throw new Error('Belirtilen kanal bir ses kanalı değil.');
    }
    const me = guild.members.me ?? await guild.members.fetchMe().catch((error) => { logError('musicManager:fetchMeForJoin', error, 'debug'); return null; });
    const perms = me ? channel.permissionsFor(me) : null;
    if (!perms?.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
      throw new Error('Bu ses kanalına bağlanmak veya konuşmak için yetkim yok.');
    }
  }

  async getLyrics(guildId: string, query?: string, clientId?: string): Promise<MusicLyricsResponse> {
    const state = await this.getState(guildId, clientId);
    const track = state.nowPlaying;
    const candidates = lyricsCandidates(query, track);
    if (candidates.length === 0) {
      throw new Error('Söz aramak için çalan şarkı veya arama metni gerekli.');
    }

    const lavalinkLyrics = track ? await this.getLavalinkLyrics(track).catch((error) => { logError('musicManager:lavalinkLyricsFallback', error, 'warn'); return undefined; }) : undefined;
    if (lavalinkLyrics?.lyrics) {
      return lavalinkLyrics;
    }

    for (const candidate of candidates) {
      const params = new URLSearchParams();
      params.set('track_name', candidate.title);
      if (candidate.artist) params.set('artist_name', candidate.artist);

      const response = await fetch(`https://lrclib.net/api/search?${params.toString()}`, {
        headers: { 'User-Agent': 'DevengDiscordBot/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        continue;
      }

      const results = await response.json() as LrcLibResult[];
      const match = this.pickLyricsMatch(results, candidate);
      const lyrics = match?.syncedLyrics || match?.plainLyrics;
      if (lyrics) {
        console.info(`[Music] Lyrics bulundu provider=lrclib source=${candidate.source} title="${candidate.title}" artist="${candidate.artist || ''}"`);
        return {
          track,
          lyrics,
          source: match?.source || match?.name || match?.trackName,
          provider: 'lrclib',
        };
      }
    }

    return {
      track,
      lyrics: '',
      provider: 'lrclib',
    };
  }

  async toggleFavorite(guildId: string, userId: string, track?: MusicTrack, clientId?: string): Promise<MusicFavoriteResponse> {
    const state = await this.getState(guildId, clientId);
    const selected = track || state.nowPlaying;
    if (!selected) {
      throw new Error('Beğenilecek aktif şarkı yok.');
    }
    return toggleMusicFavorite(guildId, userId, selected, clientId);
  }

  async getFavorites(guildId: string, userId: string): Promise<MusicTrack[]> {
    return getMusicFavorites(guildId, userId);
  }

  async getHistory(guildId: string, userId?: string, clientId?: string): Promise<MusicHistoryItem[]> {
    return getMusicHistory(guildId, userId, clientId);
  }

  private pickLyricsMatch(results: LrcLibResult[], candidate: LyricsCandidate): LrcLibResult | undefined {
    const withLyrics = results.filter((item) => item.syncedLyrics || item.plainLyrics);
    if (withLyrics.length === 0) return undefined;

    const normalizedTitle = candidate.title.toLowerCase();
    const normalizedArtist = candidate.artist?.toLowerCase();
    return withLyrics.find((item) => {
      const title = (item.trackName || item.name || '').toLowerCase();
      const artist = (item.artistName || '').toLowerCase();
      return title.includes(normalizedTitle) && (!normalizedArtist || artist.includes(normalizedArtist));
    }) ?? withLyrics[0];
  }

  private async getLavalinkLyrics(track: MusicTrack): Promise<MusicLyricsResponse | undefined> {
    const encodedTrack = track.encodedTrack;
    const nodes = this.config?.lavalink?.nodes ?? [];
    if (!encodedTrack || nodes.length === 0) return undefined;

    for (const node of nodes) {
      try {
        const protocol = node.secure ? 'https' : 'http';
        const url = `${protocol}://${node.host}:${node.port}/v4/lyrics?track=${encodeURIComponent(encodedTrack)}&skipTrackSource=false`;
        const response = await fetch(url, {
          headers: { Authorization: node.password },
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) continue;

        const payload = await response.json() as LavaLyricsResponse;
        const lyrics = payload.text || payload.lines?.map((line) => line.line || line.text || '').filter(Boolean).join('\n');
        if (!lyrics?.trim()) continue;

        console.info(`[Music] Lyrics bulundu provider=lavalyrics node=${node.id}`);
        return {
          track,
          lyrics,
          source: payload.source,
          provider: payload.provider || 'lavalyrics',
        };
      } catch (error) {
        logError('musicManager:lavalinkLyricsNode', error, 'debug');
      }
    }

    return undefined;
  }

  async play(request: MusicPlayRequest): Promise<MusicState> {
    const context = await this.preparePlayContext(request);
    this.throwIfDisconnected(request.guildId, context.generation);
    try {
      await this.enqueuePlayableTrack(context.player, request, request.track, request.playNext ? 0 : undefined);
    } catch (error) {
      if (context.created) await context.player.destroy('Playback search failed', true).catch((err) => logError('musicManager:destroyOnPlaybackFail', err, 'warn'));
      throw error;
    }
    this.throwIfDisconnected(request.guildId, context.generation);
    await this.connectOrCleanup(context);
    this.throwIfDisconnected(request.guildId, context.generation);
    if (!context.player.playing && !context.player.paused) {
      await context.player.play();
    }
    const state = this.stateFromPlayer(context.player, request.clientId);
    await this.persist(state, 'queueUpdated');
    if (state.nowPlaying) {
      await this.updateNowPlayingMessage(state, 'trackStarted').catch((error: unknown) => {
        logError('musicManager:ensureNowPlayingAfterPlay', error, 'warn');
      });
    }
    return state;
  }

  /** Player'a bağlanır; hata olursa yeni oluşturulan player'ı yok ederek sızıntıyı önler. */
  private async connectOrCleanup(context: PlayContext): Promise<void> {
    if (
      context.player.connected
      && context.player.voiceChannelId
      && context.player.voiceChannelId === context.voiceChannelId
    ) {
      return;
    }
    try {
      await context.player.connect();
    } catch (error) {
      if (context.created) {
        await context.player.destroy('Ses kanalına bağlanılamadı', true).catch((err) => logError('musicManager:destroyOnConnectCleanup', err, 'warn'));
      }
      throw error;
    }
  }

  async bulkPlay(request: MusicBulkPlayRequest): Promise<MusicState> {
    const tracks = request.tracks.slice(0, MAX_QUEUE_SIZE);
    if (tracks.length === 0) {
      throw new Error('Kuyruğa alınacak şarkı bulunamadı.');
    }
    const context = await this.preparePlayContext({
      guildId: request.guildId,
      clientId: request.clientId,
      query: tracks[0]?.title ?? '',
      source: 'auto',
      requester: request.requester,
      voiceChannelId: request.voiceChannelId,
      textChannelId: request.textChannelId,
    });
    this.throwIfDisconnected(request.guildId, context.generation);
    const shouldPlayNext = request.mode === 'play-next';
    const ordered = request.mode === 'shuffle-start'
      ? this.shuffleTracks(tracks)
      : shouldPlayNext
        ? [...tracks].reverse()
        : tracks;
    try {
      for (const track of ordered) {
        await this.enqueuePlayableTrack(
          context.player,
          {
            guildId: request.guildId,
            clientId: request.clientId,
            query: track.title,
            source: track.source === 'spotify' ? 'spotify' : 'auto',
            requester: request.requester,
            track,
            voiceChannelId: context.voiceChannelId,
            textChannelId: context.textChannelId,
          },
          track,
          shouldPlayNext ? 0 : undefined,
        );
      }
    } catch (error) {
      if (context.created) await context.player.destroy('Bulk playback search failed', true).catch((err) => logError('musicManager:destroyOnBulkPlaybackFail', err, 'warn'));
      throw error;
    }
    this.throwIfDisconnected(request.guildId, context.generation);
    await this.connectOrCleanup(context);
    if (!context.player.playing && !context.player.paused) {
      await context.player.play();
    }
    const state = this.stateFromPlayer(context.player, request.clientId);
    await this.persist(state, 'queueUpdated');
    if (state.nowPlaying) {
      await this.updateNowPlayingMessage(state, 'trackStarted').catch((error: unknown) => {
        logError('musicManager:ensureNowPlayingAfterBulkPlay', error, 'warn');
      });
    }
    return state;
  }

  private async preparePlayContext(request: MusicPlayRequest): Promise<PlayContext> {
    const entry = this.requireClient(request.clientId);
    const generation = this.disconnectGenerations.get(request.guildId) ?? 0;
    if (!entry.manager.useable) {
      throw new Error('Lavalink bağlantısı hazır değil.');
    }
    const requestedVoiceChannelId = request.voiceChannelId || await this.resolveRequesterVoiceChannelId(entry, request.guildId, request.requester?.id);
    if (!requestedVoiceChannelId) {
      throw new Error('Müzik başlatmak için önce bir ses kanalına katılmalısın.');
    }
    const existing = entry.manager.getPlayer(request.guildId);
    if (existing?.voiceChannelId && existing.voiceChannelId !== requestedVoiceChannelId) {
      const channelName = await this.resolveChannelName(entry, request.guildId, existing.voiceChannelId);
      throw new Error(`Bot zaten ${channelName} kanalında çalıyor; müzik eklemek için aynı kanala katılmalısın.`);
    }
    const resolvedTextChannelId = await this.resolveAnnounceTextChannelId(
      request.guildId,
      request.clientId,
      request.textChannelId,
    );
    if (existing) {
      this.ensureAutoplayEnabled(request.guildId);
      this.syncPlayerTextChannel(existing, resolvedTextChannelId);
      return {
        entry,
        player: existing,
        voiceChannelId: requestedVoiceChannelId,
        textChannelId: this.resolveTextChannelId(request.guildId, existing.textChannelId),
        created: false,
        generation,
      };
    }
    await this.assertJoinableVoiceChannel(entry, request.guildId, requestedVoiceChannelId);
    const player = entry.manager.createPlayer({
      guildId: request.guildId,
      voiceChannelId: requestedVoiceChannelId,
      textChannelId: resolvedTextChannelId,
      selfDeaf: true,
      volume: DEFAULT_VOLUME,
    });
    this.syncPlayerTextChannel(player, resolvedTextChannelId);
    this.ensureAutoplayEnabled(request.guildId);
    return {
      entry,
      player,
      voiceChannelId: requestedVoiceChannelId,
      textChannelId: this.resolveTextChannelId(request.guildId, player.textChannelId),
      created: true,
      generation,
    };
  }

  private async enqueuePlayableTrack(player: Player, request: MusicPlayRequest, track?: MusicTrack, insertAt?: number): Promise<void> {
    if (player.queue.tracks.length >= MAX_QUEUE_SIZE) {
      throw new Error(`Bu işlem en fazla ${MAX_QUEUE_SIZE} şarkı için yapılabilir.`);
    }
    const { query, source } = playableQueryFor(request, track);
    if (!query.trim()) {
      throw new Error('Şarkı aramak için geçerli bir başlık veya bağlantı gerekli.');
    }
    const searchResult = await this.searchForPlayback(player, { ...request, source, track }, query);
    const selected = searchResult.tracks[0];
    if (!selected) {
      throw new Error(`${track?.title ?? request.query} için çalınabilir sonuç bulunamadı.`);
    }
    player.queue.add(selected as any, insertAt);
  }

  private async resolveRequesterVoiceChannelId(entry: ActiveManagedClient, guildId: string, requesterId?: string): Promise<string | undefined> {
    if (!requesterId) return undefined;
    const guild = entry.client.guilds.cache.get(guildId) ?? await entry.client.guilds.fetch(guildId).catch((error) => { logError('musicManager:fetchGuildForRequester', error, 'debug'); return null; });
    if (!guild) return undefined;
    const cached = guild.members.cache.get(requesterId);
    if (cached?.voice?.channelId) return cached.voice.channelId;
    const member = await guild.members.fetch(requesterId).catch((error) => { logError('musicManager:fetchRequesterMember', error, 'debug'); return null; });
    return member?.voice?.channelId ?? undefined;
  }

  private async resolveChannelName(entry: ActiveManagedClient, guildId: string, channelId: string): Promise<string> {
    const guild = entry.client.guilds.cache.get(guildId) ?? await entry.client.guilds.fetch(guildId).catch((error) => { logError('musicManager:fetchGuildForChannelName', error, 'debug'); return null; });
    const channel = guild?.channels.cache.get(channelId) ?? await guild?.channels.fetch(channelId).catch((error) => { logError('musicManager:fetchChannelForName', error, 'debug'); return null; });
    return channel?.name ? `#${channel.name}` : channelId;
  }

  private shuffleTracks(tracks: MusicTrack[]): MusicTrack[] {
    const next = [...tracks];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }

  async control(request: MusicControlRequest): Promise<MusicState> {
    const entry = this.requireClient(request.clientId);
    const player = entry.manager.getPlayer(request.guildId);
    if (!player) {
      throw new Error('Bu sunucu için aktif müzik oynatıcısı yok.');
    }
    let event: Parameters<typeof realtimePublisher.publish>[0] = 'stateUpdated';

    switch (request.action) {
      case 'pause':
        await player.pause();
        event = 'playerPaused';
        break;
      case 'resume':
        await player.resume();
        event = 'playerResumed';
        break;
      case 'skip':
        await player.skip(0, false);
        event = player.queue.current ? 'trackSkipped' : 'playerStopped';
        break;
      case 'skipto': {
        const position = Math.max(1, Math.round(request.position ?? 1));
        const skipCount = Math.min(position - 1, player.queue.tracks.length);
        await player.skip(skipCount, false);
        event = 'trackSkipped';
        break;
      }
      case 'stop':
      case 'disconnect':
        this.bumpDisconnectGeneration(request.guildId);
        await player.stopPlaying(true, false);
        await player.destroy('Panel stop', true);
        event = 'playerStopped';
        break;
      case 'shuffle':
        await player.queue.shuffle();
        event = 'queueUpdated';
        break;
      case 'clear':
        await player.queue.splice(0, player.queue.tracks.length);
        event = 'queueUpdated';
        break;
      case 'removedupes':
        await this.removeDuplicateQueueItems(player);
        event = 'queueUpdated';
        break;
      case 'loop-off':
      case 'loop-track':
      case 'loop-queue':
        await player.setRepeatMode(request.action.replace('loop-', '') as MusicLoopMode);
        event = 'loopChanged';
        break;
      case 'seek':
        if (typeof request.seekMs === 'number') {
          await player.seek(Math.max(0, Math.round(request.seekMs)));
        }
        break;
      case 'rewind':
        await player.seek(Math.max(0, Math.round((player.position || 0) - (request.deltaMs ?? 10_000))));
        break;
      case 'forward':
        await player.seek(Math.max(0, Math.round((player.position || 0) + (request.deltaMs ?? 10_000))));
        break;
      case 'replay':
        await player.seek(0);
        break;
      case 'autoplay-toggle': {
        const nextAutoplay = !this.getAutoplay(request.guildId);
        this.autoplayByGuild.set(request.guildId, nextAutoplay);
        event = 'stateUpdated';
        break;
      }
      case 'volume':
        break;
      default:
        throw new Error(`Desteklenmeyen müzik kontrolü: ${request.action}`);
    }

    if (typeof request.volume === 'number') {
      await player.setVolume(clampVolume(request.volume), true);
      event = 'volumeChanged';
    }
    const next = (player as any).destroyed ? emptyState(request.guildId, request.clientId) : this.stateFromPlayer(player, request.clientId);
    await this.persist(next, event);
    return next;
  }

  async remove(guildId: string, queueItemId: string, clientId?: string): Promise<MusicState> {
    const entry = this.requireClient(clientId);
    const player = entry.manager.getPlayer(guildId);
    if (!player) throw new Error('Bu sunucu için aktif müzik oynatıcısı yok.');
    const index = player.queue.tracks.findIndex((track: any) => track.encoded === queueItemId || musicTrackFromLavalinkTrack(track).id === queueItemId);
    if (index >= 0) {
      await player.queue.remove(index);
    }
    const next = this.stateFromPlayer(player, clientId);
    await this.persist(next, 'queueUpdated');
    return next;
  }

  async move(guildId: string, queueItemId: string, position: number, clientId?: string): Promise<MusicState> {
    const entry = this.requireClient(clientId);
    const player = entry.manager.getPlayer(guildId);
    if (!player) throw new Error('Bu sunucu için aktif müzik oynatıcısı yok.');
    const currentIndex = player.queue.tracks.findIndex((track: any) => track.encoded === queueItemId || musicTrackFromLavalinkTrack(track).id === queueItemId);
    if (currentIndex >= 0) {
      const [track] = await player.queue.splice(currentIndex, 1);
      if (track) {
        player.queue.add(track, Math.max(0, position - 1));
      }
    }
    const next = this.stateFromPlayer(player, clientId);
    await this.persist(next, 'queueUpdated');
    return next;
  }

  private async removeDuplicateQueueItems(player: Player): Promise<void> {
    const seen = new Set<string>();
    for (let index = player.queue.tracks.length - 1; index >= 0; index -= 1) {
      const track = player.queue.tracks[index] as any;
      const item = musicTrackFromLavalinkTrack(track);
      const key = `${item.source}:${item.uri || item.id || item.title}`.toLowerCase();
      if (seen.has(key)) {
        await player.queue.remove(index);
      } else {
        seen.add(key);
      }
    }
  }

  async destroyGuild(guildId: string): Promise<void> {
    this.bumpDisconnectGeneration(guildId);
    this.autoplayByGuild.delete(guildId);
    for (const entry of this.clients.values()) {
      const player = entry.manager?.getPlayer(guildId);
      if (player) {
        await player.destroy('Music feature disabled', true).catch((error: unknown) => {
          console.error(`[Music] Player kapatılamadı (Guild: ${guildId}):`, error);
        });
      }
    }
    await realtimePublisher.deleteState(guildId);
  }

  private recreateManager(clientId: string, client: Client, previousRawHandler?: (packet: unknown) => void): ManagedClient {
    const previous = this.clients.get(clientId);
    if (previousRawHandler) {
      client.off('raw', previousRawHandler);
    } else if (previous?.rawHandler) {
      client.off('raw', previous.rawHandler);
    }
    // Eski LavalinkManager'ı kapatmadan yenisini açmak zombi voice/node bağlantısı bırakır.
    if (previous?.manager) {
      void previous.manager.nodeManager.disconnectAll(true, true).catch((error: unknown) => {
        logError('musicManager:disconnectPreviousManager', error, 'warn');
      });
    }
    if (!this.config?.lavalink) {
      const noop = () => undefined;
      const entry: ManagedClient = { client, rawHandler: noop };
      this.clients.set(clientId, entry);
      return entry;
    }

    const manager = new LavalinkManager({
      nodes: this.config.lavalink.nodes.map((node) => ({
        id: node.id,
        host: node.host,
        port: node.port,
        authorization: node.password,
        secure: node.secure,
        retryAmount: 10,
        retryDelay: 5_000,
      })),
      sendToShard: (guildId, payload) => {
        const shard = client.guilds.cache.get(guildId)?.shard;
        if (!shard) return;
        // shard.send Promise döner; catch edilmezse unhandledRejection üretir.
        void Promise.resolve(shard.send(payload)).catch((error: unknown) => {
          logError('musicManager:sendToShard', error, 'warn');
        });
      },
      autoSkip: true,
      autoMove: true,
      autoSkipOnResolveError: true,
      client: {
        id: client.user?.id ?? clientId,
        username: client.user?.username,
      },
      playerOptions: {
        defaultSearchPlatform: 'ytmsearch',
        onDisconnect: {
          // Sağ tık "Bağlantıyı Kes" sonrası botun eski kanala geri dönmesini engelle.
          autoReconnect: false,
          destroyPlayer: true,
        },
        onEmptyQueue: {
          destroyAfterMs: 30_000,
        },
      },
      advancedOptions: {
        enableDebugEvents: false,
      },
    });

    this.bindManagerEvents(manager, clientId);
    const rawHandler = (packet: unknown) => {
      void manager.sendRawData(packet as any).catch((error: unknown) => {
        logError('musicManager:sendRawData', error, 'warn');
      });
    };
    client.on('raw', rawHandler);
    const entry = { client, manager, rawHandler };
    this.clients.set(clientId, entry);
    void manager.init({ id: client.user?.id ?? clientId, username: client.user?.username }).catch((error: unknown) => {
      logError('musicManager:managerInit', error, 'error');
    });
    return entry;
  }

  /** Fire-and-forget persist — event handler içinde unhandledRejection üretmesin. */
  private firePersist(state: MusicState, event: Parameters<typeof realtimePublisher.publish>[0]): void {
    void this.persist(state, event).catch((error: unknown) => {
      logError(`musicManager:persist:${event}`, error, 'warn');
    });
  }

  private bindManagerEvents(manager: LavalinkManager, clientId: string): void {
    manager.nodeManager.on('error', (node, error) => {
      logError(`musicManager:nodeError:${node?.id ?? 'unknown'}`, error, 'warn');
    });
    manager.nodeManager.on('disconnect', (node, reason) => {
      console.warn(`[Music] Lavalink node koptu (${node?.id ?? 'unknown'}):`, reason?.code ?? reason);
    });
    manager.on('trackStart', (player) => {
      this.firePersist(this.stateFromPlayer(player, clientId), 'trackStarted');
    });
    manager.on('trackEnd', (player) => {
      this.firePersist(this.stateFromPlayer(player, clientId), player.queue.current ? 'trackSkipped' : 'queueUpdated');
    });
    manager.on('playerPaused', (player) => {
      this.firePersist(this.stateFromPlayer(player, clientId), 'playerPaused');
    });
    manager.on('playerResumed', (player) => {
      this.firePersist(this.stateFromPlayer(player, clientId), 'playerResumed');
    });
    manager.on('playerUpdate', (_oldPlayer, player) => {
      void realtimePublisher.saveState(this.stateFromPlayer(player, clientId)).catch((error: unknown) => {
        logError('musicManager:playerUpdateSaveState', error, 'debug');
      });
    });
    manager.on('playerDestroy', (player) => {
      this.bumpDisconnectGeneration(player.guildId);
      this.firePersist(emptyState(player.guildId, clientId), 'playerStopped');
    });
    manager.on('trackError', (player, _track, payload) => {
      const rawMessage = payload.error || payload.exception?.message || 'Parça çalınamadı.';
      const errorMessage = isYoutubeRestrictedError(rawMessage) ? YOUTUBE_RESTRICTED_MESSAGE : rawMessage;
      const state = { ...this.stateFromPlayer(player, clientId), status: 'error' as const, errorMessage };
      this.firePersist(state, 'playerError');
    });
    manager.on('trackStuck', (player) => {
      const state = { ...this.stateFromPlayer(player, clientId), status: 'error' as const, errorMessage: 'Parça takıldı.' };
      this.firePersist(state, 'playerError');
    });
  }

  private resolveClient(clientId?: string): ManagedClient | undefined {
    // clientId verildiğinde yalnızca tam eşleşen client döndürülür.
    if (clientId) return this.clients.get(clientId);
    return this.clients.values().next().value as ManagedClient | undefined;
  }

  private requireClient(clientId?: string): ActiveManagedClient {
    const entry = this.resolveClient(clientId);
    if (!entry?.manager) {
      throw new Error(
        clientId
          ? 'İstenen müzik botu (clientId) hazır değil.'
          : 'Discord/Lavalink müzik client hazır değil.',
      );
    }
    return entry as ActiveManagedClient;
  }

  private async searchForPlayback(player: Player, request: MusicPlayRequest, query: string): Promise<SearchResult | UnresolvedSearchResult> {
    try {
      const result = await player.search(
        { query, source: sourceToSearchPlatform(request.source) as any },
        request.requester,
        false,
      ) as SearchResult | UnresolvedSearchResult;

      if (result.tracks.length === 0) {
        for (const fallbackSource of fallbackSourcesFor(request.source, query)) {
          const fallbackResult = await player.search(
            { query, source: sourceToSearchPlatform(fallbackSource) as any },
            request.requester,
            false,
          ) as SearchResult | UnresolvedSearchResult;
          if (fallbackResult.tracks.length > 0) return fallbackResult;
        }
      }

      return result;
    } catch (error) {
      if (request.source === 'youtube' || request.source === 'spotify' || request.source === 'auto' || request.source == null) {
        for (const fallbackSource of fallbackSourcesFor(request.source, query)) {
          try {
            return await player.search({ query, source: sourceToSearchPlatform(fallbackSource) as any }, request.requester, false) as SearchResult | UnresolvedSearchResult;
          } catch (error) {
            logError('musicManager:searchFallbackSource', error, 'debug');
          }
        }
        if (isYoutubeRestrictedError(error)) {
          throw new Error(YOUTUBE_RESTRICTED_MESSAGE);
        }
      }
      throw error;
    }
  }

  private bumpDisconnectGeneration(guildId: string): void {
    this.disconnectGenerations.set(guildId, (this.disconnectGenerations.get(guildId) ?? 0) + 1);
  }

  private async saveHistory(state: MusicState): Promise<void> {
    if (!state.nowPlaying) return;
    await recordMusicHistory(state.guildId, {
      track: state.nowPlaying,
      userId: state.nowPlaying.requester?.id,
      requesterUsername: state.nowPlaying.requester?.username,
      voiceChannelId: state.voiceChannelId,
      textChannelId: state.textChannelId,
      positionMs: state.positionMs,
      source: 'bot',
    }, state.clientId).catch((error: unknown) => {
      console.error('[Music] SQL history kaydedilemedi:', error);
    });
  }

  private async updateNowPlayingMessage(state: MusicState, event: Parameters<typeof realtimePublisher.publish>[0]): Promise<void> {
    const previous = this.nowPlayingUpdateChainByGuild.get(state.guildId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = previous.catch(() => undefined).then(() => gate);
    this.nowPlayingUpdateChainByGuild.set(state.guildId, chained);
    await previous.catch(() => undefined);
    try {
      await this.updateNowPlayingMessageLocked(state, event);
    } finally {
      release();
      if (this.nowPlayingUpdateChainByGuild.get(state.guildId) === chained) {
        this.nowPlayingUpdateChainByGuild.delete(state.guildId);
      }
    }
  }

  private async updateNowPlayingMessageLocked(state: MusicState, event: Parameters<typeof realtimePublisher.publish>[0]): Promise<void> {
    const shouldUpdate = [
      'trackStarted',
      'queueUpdated',
      'playerPaused',
      'playerResumed',
      'playerStopped',
      'trackSkipped',
      'loopChanged',
      'playerError',
    ].includes(event);
    if (!shouldUpdate) return;

    const entry = this.resolveClient(state.clientId);
    if (!entry?.client) return;

    if (!state.nowPlaying) {
      const existingRef = this.playerMessagesByGuild.get(state.guildId);
      if (existingRef) {
        await this.deleteTrackedNowPlayingMessage(entry.client, existingRef).catch((error) => logError('musicManager:deleteNowPlayingCard', error, 'debug'));
        this.playerMessagesByGuild.delete(state.guildId);
      }
      return;
    }

    const settings = await getMusicSettings(state.guildId, state.clientId).catch((error) => { logError('musicManager:fetchMusicSettings', error, 'warn'); return null; });
    let existingRef = this.playerMessagesByGuild.get(state.guildId);
    if (!existingRef && settings?.announceNowPlaying === false) return;

    const textChannelId = await this.resolveAnnounceTextChannelId(
      state.guildId,
      state.clientId,
      state.textChannelId,
      settings?.allowedTextChannelId,
    );
    if (!textChannelId) return;
    if (textChannelId !== state.textChannelId) {
      state.textChannelId = textChannelId;
    }
    this.rememberTextChannel(state.guildId, textChannelId);
    existingRef = this.playerMessagesByGuild.get(state.guildId);
    if (!existingRef && event !== 'trackStarted') return;

    const channel = entry.client.channels.cache.get(textChannelId)
      ?? await entry.client.channels.fetch(textChannelId).catch((error) => { logError('musicManager:fetchTextChannel', error, 'debug'); return null; });
    if (!channel || !('isTextBased' in channel) || !channel.isTextBased()) return;

    const payload = createNowPlayingMessage(state);
    existingRef = this.playerMessagesByGuild.get(state.guildId);
    if (existingRef) {
      const messageChannel = entry.client.channels.cache.get(existingRef.channelId)
        ?? await entry.client.channels.fetch(existingRef.channelId).catch((error) => { logError('musicManager:fetchMessageChannel', error, 'debug'); return null; });
      if (messageChannel && 'isTextBased' in messageChannel && messageChannel.isTextBased()) {
        const message = await (messageChannel as any).messages.fetch(existingRef.messageId).catch((error: unknown) => { logError('musicManager:fetchNowPlayingMessage', error, 'debug'); return null; });
        if (message) {
          await message.edit(payload).catch((error: unknown) => logError('musicManager:editNowPlayingCard', error, 'debug'));
          return;
        }
      }
      this.playerMessagesByGuild.delete(state.guildId);
    }

    if (!state.nowPlaying) return;
    const sent = await (channel as any).send(payload).catch((error: unknown) => { logError('musicManager:sendNowPlayingCard', error, 'warn'); return null; });
    if (sent?.id) {
      this.playerMessagesByGuild.set(state.guildId, { channelId: textChannelId, messageId: sent.id });
    }
  }

  /** Kaydedilen now-playing mesajını Discord'dan siler (kanal/mesaj bulunamazsa sessizce geçer). */
  private async deleteTrackedNowPlayingMessage(client: Client, ref: PlayerMessageRef): Promise<void> {
    const channel = client.channels.cache.get(ref.channelId)
      ?? await client.channels.fetch(ref.channelId).catch((error) => { logError('musicManager:fetchChannelForDelete', error, 'debug'); return null; });
    if (!channel || !('isTextBased' in channel) || !channel.isTextBased()) return;
    const message = await (channel as any).messages.fetch(ref.messageId).catch((error: unknown) => { logError('musicManager:fetchMessageForDelete', error, 'debug'); return null; });
    await message?.delete().catch((error: unknown) => logError('musicManager:deleteTrackedMessage', error, 'debug'));
  }

  private throwIfDisconnected(guildId: string, generation: number): void {
    if ((this.disconnectGenerations.get(guildId) ?? 0) !== generation) {
      throw new Error('Müzik isteği bağlantı kesme sonrası iptal edildi.');
    }
  }

  private rememberTextChannel(guildId: string, textChannelId?: string | null): void {
    if (textChannelId) {
      this.lastTextChannelByGuild.set(guildId, textChannelId);
    }
  }

  private resolveTextChannelId(guildId: string, playerTextChannelId?: string | null): string | undefined {
    return playerTextChannelId || this.lastTextChannelByGuild.get(guildId) || undefined;
  }

  /** Now-playing duyurusu için metin kanalı: istek/player → bellek → ayar → sistem kanalı. */
  private async resolveAnnounceTextChannelId(
    guildId: string,
    clientId: string | undefined,
    playerTextChannelId?: string | null,
    settingsAllowedTextChannelId?: string | null,
  ): Promise<string | undefined> {
    const known = this.resolveTextChannelId(guildId, playerTextChannelId);
    if (known) return known;

    let allowed = settingsAllowedTextChannelId ?? undefined;
    if (!allowed) {
      const settings = await getMusicSettings(guildId, clientId).catch((error) => {
        logError('musicManager:fetchMusicSettingsForAnnounceChannel', error, 'warn');
        return null;
      });
      allowed = settings?.allowedTextChannelId ?? undefined;
    }
    if (allowed) {
      this.rememberTextChannel(guildId, allowed);
      return allowed;
    }

    const entry = this.resolveClient(clientId);
    const guild = entry?.client.guilds.cache.get(guildId)
      ?? await entry?.client.guilds.fetch(guildId).catch((error) => {
        logError('musicManager:fetchGuildForAnnounceChannel', error, 'debug');
        return null;
      });
    const systemChannelId = guild?.systemChannelId ?? undefined;
    if (systemChannelId) {
      this.rememberTextChannel(guildId, systemChannelId);
      return systemChannelId;
    }
    return undefined;
  }

  /** İstekte gelen textChannelId'yi player'a yazar; yoksa last-known / ayar fallback uygular. */
  private syncPlayerTextChannel(player: Player, textChannelId?: string): void {
    if (textChannelId) {
      player.textChannelId = textChannelId;
      player.options.textChannelId = textChannelId;
      this.rememberTextChannel(player.guildId, textChannelId);
      return;
    }
    if (player.textChannelId) {
      this.rememberTextChannel(player.guildId, player.textChannelId);
      return;
    }
    const fallback = this.lastTextChannelByGuild.get(player.guildId);
    if (fallback) {
      player.textChannelId = fallback;
      player.options.textChannelId = fallback;
    }
  }

  private stateFromPlayer(player: Player, clientId?: string): MusicState {
    const nowPlaying = player.queue.current ? queueItemFromTrack(player.queue.current, 0) : undefined;
    const status: MusicState['status'] = player.paused ? 'paused' : player.playing || nowPlaying ? 'playing' : 'idle';
    return {
      guildId: player.guildId,
      clientId,
      status,
      voiceChannelId: player.voiceChannelId ?? undefined,
      textChannelId: this.resolveTextChannelId(player.guildId, player.textChannelId),
      nowPlaying,
      queue: player.queue.tracks.map((track, index) => queueItemFromTrack(track, index + 1)),
      volume: player.volume ?? DEFAULT_VOLUME,
      loopMode: player.repeatMode as MusicLoopMode,
      paused: player.paused,
      positionMs: Math.max(0, Math.round(player.position || 0)),
      autoplay: this.getAutoplay(player.guildId),
      updatedAt: now(),
    };
  }

  private async persist(state: MusicState, event: Parameters<typeof realtimePublisher.publish>[0]): Promise<void> {
    await realtimePublisher.saveState(state);
    if (event === 'trackStarted') {
      await this.saveHistory(state);
    }
    await realtimePublisher.publish(event, state);
    await this.updateNowPlayingMessage(state, event).catch((error: unknown) => {
      console.error('[Music] Now playing mesajı güncellenemedi:', error);
    });
  }

  /** Kanaldaki now playing mesajını günceller. */
  async syncNowPlayingGuildMessage(guildId: string, clientId?: string): Promise<void> {
    const state = await this.getState(guildId, clientId);
    await this.updateNowPlayingMessage(state, 'queueUpdated');
  }
}

export const musicManager = new MusicManager();
