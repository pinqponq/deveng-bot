/**
 * Redis tabanlı cache - in-memory cache yerine kullanılır.
 * Bot ve API aynı Redis instance'ını paylaşır, cache key'leri tutarlı olmalı.
 */

import Redis, { type RedisOptions } from 'ioredis';
import type { RedisConfig } from '../types/config';

const CACHE_TTL_SECONDS = 300; // 5 dakika
let redisClient: Redis | null = null;

function buildRedisOptions(config: RedisConfig): RedisOptions {
  const raw = config.url.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Geçersiz Redis URL: ${raw}`);
  }
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error(`Redis URL redis:// veya rediss:// ile başlamalı: ${raw}`);
  }

  const fromUrlUser = url.username ? decodeURIComponent(url.username) : '';
  const fromUrlPass = url.password ? decodeURIComponent(url.password) : '';
  const username =
    fromUrlUser || config.user?.trim() || process.env.REDIS_USER?.trim() || undefined;
  const password =
    fromUrlPass ||
    config.password?.trim() ||
    process.env.REDIS_PASSWORD?.trim() ||
    undefined;

  const port = url.port ? parseInt(url.port, 10) : 6379;
  const dbSegment = url.pathname.replace(/^\//, '');
  const db = dbSegment ? parseInt(dbSegment, 10) : 0;

  const base: RedisOptions = {
    host: url.hostname,
    port,
    db: Number.isFinite(db) ? db : 0,
    username,
    password,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 100, 3000),
  };

  if (url.protocol === 'rediss:') {
    return { ...base, tls: {} };
  }
  return base;
}

/** Tek string (tam URL) veya url + isteğe bağlı user/password (yerel host + API ile aynı şifre). */
export function initializeRedisCache(config: RedisConfig | string): void {
  const resolved: RedisConfig =
    typeof config === 'string' ? { url: config } : config;
  if (!resolved.url?.trim()) return;
  if (redisClient) {
    redisClient.disconnect();
  }
  redisClient = new Redis(buildRedisOptions(resolved));
  redisClient.on('error', (err: Error) => {
    const msg = err.message || String(err);
    const hint =
      msg.includes('NOAUTH') || msg.includes('Authentication required')
        ? ' (Kimlik bilgisi eksik/yanlış: redis URL’inde user:pass@ veya RedisConfig user/password / REDIS_PASSWORD kullanın.)'
        : '';
    console.error('[Redis] Bağlantı hatası:', msg + hint);
  });
  redisClient.on('ready', () => console.log('[STARTUP] Redis bağlantısı doğrulandı ✓'));
}

export function closeRedisCache(): void {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
}

async function getRedis(): Promise<Redis | null> {
  return redisClient;
}

export async function tryAcquireRedisLock(key: string, ttlSeconds: number): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error('[Redis] lock: istemci yok — replay koruması devre dışı (fail-closed)');
      return false;
    }
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    console.error('[Redis] lock hatası:', err);
    return false;
  }
}

/**
 * Lider seçimi / çok-süreç dedup için kilit — replay/güvenlik kilidinden AYRI semantik:
 *
 *  - Redis YOKSA (tek süreç / Redis yapılandırılmamış) → **fail-OPEN**: lider olduğunu varsay
 *    (return true). Böylece Redis'siz tek-süreç dağıtımda periyodik işler (istatistik, hatırlatıcı
 *    süpürmesi, goodbye dedup vb.) çalışmaya devam eder. Tek süreçte zaten çift-çalıştırma olmaz.
 *  - Redis VARSA → `SET NX`; yalnız kilidi alan süreç true alır (doğru lider seçimi).
 *  - Redis hata verirse → **fail-CLOSED** (false): çok-süreçli kurulumda geçici hatada çift
 *    çalıştırmayı önlemek daha güvenli; iş bir sonraki turda tekrar denenir.
 *
 * NOT: HMAC replay koruması gibi GÜVENLİK kilitleri için bunu KULLANMA; orada `tryAcquireRedisLock`
 * (Redis yoksa fail-closed) doğrudur.
 */
export async function tryBecomeLeader(key: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return true; // tek süreç varsay — fail-open
  try {
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    console.error('[Redis] leader-lock hatası:', err);
    return false;
  }
}

/** Worker/bot çift teslim önleme: NX ile tek sahiplik; false = başka işlem veya yakın zamanda işlendi. */
export async function tryReminderDispatchDedupe(dedupeKey: string, ttlSeconds: number): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('[Redis] reminder dedupe: istemci yok — çift teslim riski (NX atlanıyor)');
      return true;
    }
    const key = `scheduling:reminder:dispatch:${dedupeKey}`;
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    console.error('[Redis] reminder dedupe hatası:', err);
    return true;
  }
}

/** Replay / rate-limit gibi kritik yollar için */
export function getRedisClient(): Redis | null {
  return redisClient;
}

export interface RedisCacheInterface {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

function createRedisCache(): RedisCacheInterface {
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const redis = await getRedis();
        if (!redis) return null;
        const json = await redis.get(key);
        if (!json) return null;
        return JSON.parse(json) as T;
      } catch (err) {
        console.error('[Redis] get hatası:', err);
        return null;
      }
    },
    async set(key: string, value: unknown, ttlSeconds: number = CACHE_TTL_SECONDS): Promise<void> {
      try {
        const redis = await getRedis();
        if (!redis) return;
        const json = JSON.stringify(value);
        await redis.setex(key, ttlSeconds, json);
      } catch (err) {
        console.error('[Redis] set hatası:', err);
      }
    },
    async delete(key: string): Promise<void> {
      try {
        const redis = await getRedis();
        if (!redis) return;
        await redis.del(key);
      } catch (err) {
        console.error('[Redis] delete hatası:', err);
      }
    },
  };
}

const redisCache = createRedisCache();

export const reactionRoleCache = redisCache;
export const welcomeCache = redisCache;
export const goodbyeCache = redisCache;
export const moderatorCache = redisCache;
export const ticketPanelCache = redisCache;
export const temporaryVoiceChannelCache = redisCache;
export const logChannelCache = redisCache;
