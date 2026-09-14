import type { MusicTrack } from './types';

type Entry = { tracks: MusicTrack[]; createdAt: number };

const TTL_MS = 10 * 60 * 1000;
const store = new Map<string, Entry>();

/** Stores search results under a short token so a select menu can reference them. */
export function rememberSearch(tracks: MusicTrack[]): string {
  const token = Math.random().toString(36).slice(2, 10);
  store.set(token, { tracks, createdAt: Date.now() });
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.createdAt > TTL_MS) store.delete(key);
  }
  return token;
}

/** Resolves a picked option back to its track. Returns undefined when expired. */
export function resolvePick(token: string, index: number): MusicTrack | undefined {
  return store.get(token)?.tracks[index];
}
