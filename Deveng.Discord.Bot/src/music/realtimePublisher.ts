import { getRedisClient } from '../utils/redisCache';
import type { MusicEvent, MusicState } from './types';

const STATE_TTL_SECONDS = 60 * 60 * 12;

export function musicStateKey(guildId: string): string {
  return `music:state:${guildId}`;
}

export function musicEventsChannel(guildId: string): string {
  return `music:events:${guildId}`;
}

export class RealtimePublisher {
  // FAIL-OPEN: Bu üçü çalma/kontrol akışında await ediliyor (persist). Redis çalışma anında
  // hata verirse (bağlantı düştü) çekirdek müzik akışı BLOKE OLMAMALI — state kaybı gerçek
  // zamanlı panel güncellemesini etkiler ama çalmayı durdurmaz. Bu yüzden hataları yutarız.
  async saveState(state: MusicState): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    try {
      await redis.setex(musicStateKey(state.guildId), STATE_TTL_SECONDS, JSON.stringify(state));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Music] Redis saveState başarısız (guild=${state.guildId}): ${message}`);
    }
  }

  async getState(guildId: string): Promise<MusicState | null> {
    const redis = getRedisClient();
    if (!redis) return null;
    try {
      const json = await redis.get(musicStateKey(guildId));
      if (!json) return null;
      try {
        return JSON.parse(json) as MusicState;
      } catch {
        await redis.del(musicStateKey(guildId)).catch(() => {});
        return null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Music] Redis getState başarısız (guild=${guildId}): ${message}`);
      return null;
    }
  }

  async deleteState(guildId: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    try {
      await redis.del(musicStateKey(guildId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Music] Redis deleteState başarısız (guild=${guildId}): ${message}`);
    }
  }

  async publish(type: MusicEvent['type'], state: MusicState): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    const event: MusicEvent = {
      type,
      guildId: state.guildId,
      state,
      createdAt: new Date().toISOString(),
    };
    try {
      await redis.publish(musicEventsChannel(state.guildId), JSON.stringify(event));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Music] Redis pub/sub yayını başarısız (guild=${state.guildId}): ${message}`);
    }
  }
}

export const realtimePublisher = new RealtimePublisher();
