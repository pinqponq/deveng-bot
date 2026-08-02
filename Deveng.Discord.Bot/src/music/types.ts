export type MusicSource = 'youtube' | 'soundcloud' | 'spotify' | 'direct' | 'unknown';
export type MusicLoopMode = 'off' | 'track' | 'queue';
export type MusicPlayerStatus = 'idle' | 'playing' | 'paused' | 'stopped' | 'error';

export interface MusicRequester {
  id: string;
  username?: string;
}

export interface MusicTrack {
  id: string;
  encodedTrack?: string;
  title: string;
  author?: string;
  durationMs?: number;
  isStream?: boolean;
  uri?: string;
  source: MusicSource;
  thumbnailUrl?: string;
  externalProvider?: string;
  spotifyTrackId?: string;
  spotifyUrl?: string;
  releaseDate?: string;
  requester?: MusicRequester;
  confidence?: number;
}

export interface MusicQueueItem extends MusicTrack {
  queueItemId: string;
  position: number;
  addedAt: string;
}

export interface MusicState {
  guildId: string;
  clientId?: string;
  status: MusicPlayerStatus;
  voiceChannelId?: string;
  textChannelId?: string;
  nowPlaying?: MusicQueueItem;
  queue: MusicQueueItem[];
  volume: number;
  loopMode: MusicLoopMode;
  paused: boolean;
  positionMs: number;
  autoplay: boolean;
  updatedAt: string;
  errorMessage?: string;
}

export interface MusicSearchOptions {
  query: string;
  source?: MusicSource | 'auto';
  requester?: MusicRequester;
  limit?: number;
}

export interface MusicPlayRequest extends MusicSearchOptions {
  guildId: string;
  clientId?: string;
  track?: MusicTrack;
  voiceChannelId?: string;
  textChannelId?: string;
  playNext?: boolean;
}

export interface MusicBulkPlayRequest {
  guildId: string;
  clientId?: string;
  mode?: 'start' | 'shuffle-start' | 'enqueue' | 'play-next';
  tracks: MusicTrack[];
  requester?: MusicRequester;
  voiceChannelId?: string;
  textChannelId?: string;
}

export type MusicControlAction =
  | 'pause'
  | 'resume'
  | 'skip'
  | 'skipto'
  | 'stop'
  | 'disconnect'
  | 'shuffle'
  | 'clear'
  | 'removedupes'
  | 'seek'
  | 'rewind'
  | 'forward'
  | 'replay'
  | 'volume'
  | 'loop-off'
  | 'loop-track'
  | 'loop-queue'
  | 'autoplay-toggle';

export interface MusicControlRequest {
  guildId: string;
  clientId?: string;
  action: MusicControlAction;
  volume?: number;
  seekMs?: number;
  deltaMs?: number;
  position?: number;
}

export interface MusicLyricsResponse {
  track?: MusicTrack;
  lyrics?: string;
  source?: string;
  provider?: string;
}

export interface MusicFavoriteResponse {
  liked: boolean;
  tracks: MusicTrack[];
}

export interface MusicHistoryItem extends MusicTrack {
  playedAt: string;
  guildId: string;
  userId?: string;
  requesterUsername?: string;
  voiceChannelId?: string;
  textChannelId?: string;
}

export interface MusicEvent {
  type:
    | 'stateUpdated'
    | 'trackStarted'
    | 'queueUpdated'
    | 'playerPaused'
    | 'playerResumed'
    | 'playerStopped'
    | 'trackSkipped'
    | 'volumeChanged'
    | 'loopChanged'
    | 'playerError';
  guildId: string;
  state: MusicState;
  createdAt: string;
}
