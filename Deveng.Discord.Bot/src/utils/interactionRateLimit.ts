/**
 * Slash / etkileşim kötüye kullanımına karşı limit (Redis; yoksa dev'de bellek).
 *
 * İki katmanlı:
 *  - Per-user/guild: 25 etkileşim/dk (yeniden kullanılabilir spam koruması)
 *  - Per-guild: 200 etkileşim/dk (cross-user noisy-neighbor + flood koruması)
 */

import { getRedisClient } from './redisCache';

const WINDOW_MS = 60_000;
const MAX_PER_USER = 25;
const MAX_PER_GUILD = 200;
const memUserBuckets = new Map<string, number[]>();
const memGuildBuckets = new Map<string, number[]>();

function prune(now: number, timestamps: number[]): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

function allowMemory(bucket: Map<string, number[]>, key: string, max: number): boolean {
  const now = Date.now();
  const prev = bucket.get(key) ?? [];
  const next = prune(now, prev);
  if (next.length >= max) {
    bucket.set(key, next);
    return false;
  }
  next.push(now);
  bucket.set(key, next);
  return true;
}

async function checkRedisCounter(redis: ReturnType<typeof getRedisClient>, key: string, max: number): Promise<boolean> {
  if (!redis) return false;
  try {
    const n = await redis.incr(key);
    if (n === 1) await redis.pexpire(key, WINDOW_MS + 2000);
    return n <= max;
  } catch (e) {
    console.error('[RateLimit] Redis hatası:', e);
    return false;
  }
}

/** true = işleme devam; false = limit aşıldı (user veya guild katmanında) */
export async function allowInteractionForUser(
  userId: string | undefined,
  guildId?: string | null,
): Promise<boolean> {
  if (!userId) return true;

  const g = guildId || 'dm';
  const redis = getRedisClient();

  if (!redis) {
    // FAIL-OPEN: Redis erişilemezken de çekirdek etkileşim akışı (ticket, poll, müzik,
    // hatırlatıcı vb.) asla tamamen bloke edilmemelidir. Bir yardımcı bağımlılığın
    // (Redis) yokluğu, botun hiçbir komuta yanıt vermemesine yol açmamalı. Bu yüzden
    // Redis yokken production'da da süreç-içi bellek sayaçlarına düşeriz — bu, tek
    // süreçte hâlâ spam koruması sağlar; çok süreçli dağıtımda koruma zayıflar ama
    // özellik çalışmaya devam eder (güvenli taraf: reddetmek değil, izin vermek).
    if (process.env.NODE_ENV === 'production') {
      console.warn('[RateLimit] Redis yok — bellek sayaçlarına düşülüyor (fail-open)');
    }
    if (!allowMemory(memUserBuckets, `${g}:${userId}`, MAX_PER_USER)) return false;
    if (g !== 'dm' && !allowMemory(memGuildBuckets, g, MAX_PER_GUILD)) return false;
    return true;
  }

  const slice = Math.floor(Date.now() / WINDOW_MS);
  const userKey = `rl:ia:${g}:${userId}:${slice}`;
  if (!(await checkRedisCounter(redis, userKey, MAX_PER_USER))) return false;

  // DM için guild cap'i atlıyoruz
  if (g === 'dm') return true;

  const guildKey = `rl:ia:guild:${g}:${slice}`;
  if (!(await checkRedisCounter(redis, guildKey, MAX_PER_GUILD))) {
    console.warn(`[RateLimit] Guild ${g} interaction cap (${MAX_PER_GUILD}/dk) aşıldı`);
    return false;
  }
  return true;
}
