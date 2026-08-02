/**
 * Custom bot clientId -> token eşlemesi.
 *
 * Çift katmanlı:
 *  - Sıcak in-memory cache (sync getter, geri uyumluluk için)
 *  - Redis kalıcı durum (TLS önerilir, AES-256-GCM at-rest şifreleme isteğe bağlı)
 *
 * BOT_TOKEN_ENCRYPTION_KEY env değişkeni 32-byte hex/base64 olduğunda Redis'e yazılan
 * token AES-256-GCM ile şifrelenir; aksi halde plaintext yazılır (geliştirme).
 *
 * Sync `getCustomBotToken()` çağrıları cache'i okur. Bot startup'ında
 * `hydrateCustomBotTokens()` Redis'ten cache'i doldurur. Yazma/silme async olarak
 * Redis'e yansır; tek instance fail-closed davranır (Redis yoksa cache yetinir).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getRedisClient } from './redisCache';

const REDIS_PREFIX = 'bot:custom-bot-token:';
const ENCRYPTION_KEY_RAW = (process.env.BOT_TOKEN_ENCRYPTION_KEY || '').trim();

let encryptionKey: Buffer | null = null;
if (ENCRYPTION_KEY_RAW) {
  try {
    // hex (64 char) veya base64 (44 char ile 32 byte) destekle
    const hexLooks = /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY_RAW) && ENCRYPTION_KEY_RAW.length === 64;
    const buf = hexLooks ? Buffer.from(ENCRYPTION_KEY_RAW, 'hex') : Buffer.from(ENCRYPTION_KEY_RAW, 'base64');
    if (buf.length === 32) {
      encryptionKey = buf;
    } else {
      console.error('[CustomBotTokenStore] BOT_TOKEN_ENCRYPTION_KEY 32-byte değil; şifreleme devre dışı.');
    }
  } catch {
    console.error('[CustomBotTokenStore] BOT_TOKEN_ENCRYPTION_KEY çözümlenemedi; şifreleme devre dışı.');
  }
}

function encrypt(plain: string): string {
  if (!encryptionKey) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // versiyon|iv|tag|ciphertext (hepsi base64)
  return ['v1', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('|');
}

function decrypt(stored: string): string | null {
  if (!stored.startsWith('v1|')) return stored; // legacy plaintext
  if (!encryptionKey) return null;
  try {
    const [, ivB64, tagB64, encB64] = stored.split('|');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const enc = Buffer.from(encB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  } catch (err) {
    console.error('[CustomBotTokenStore] decrypt hatası:', (err as Error).message);
    return null;
  }
}

const tokenCache = new Map<string, string>();

export async function setCustomBotToken(clientId: string, token: string): Promise<void> {
  tokenCache.set(clientId, token);
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(REDIS_PREFIX + clientId, encrypt(token));
  } catch (err) {
    console.error('[CustomBotTokenStore] Redis SET hatası:', (err as Error).message);
  }
}

export async function deleteCustomBotToken(clientId: string): Promise<void> {
  tokenCache.delete(clientId);
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(REDIS_PREFIX + clientId);
  } catch (err) {
    console.error('[CustomBotTokenStore] Redis DEL hatası:', (err as Error).message);
  }
}

/** Sync read — startup hydration sonrası cache'ten döner. */
export function getCustomBotToken(clientId: string): string | null {
  return tokenCache.get(clientId) ?? null;
}

/**
 * Bot başlangıcında çağırılır; Redis'teki token'ları cache'e yükler.
 * Redis yoksa sessizce no-op (eski memory-only davranış).
 */
export async function hydrateCustomBotTokens(): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;
  let cursor = '0';
  let count = 0;
  try {
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', REDIS_PREFIX + '*', 'COUNT', 200);
      cursor = next;
      if (keys.length === 0) continue;
      const values = await redis.mget(...keys);
      for (let i = 0; i < keys.length; i++) {
        const v = values[i];
        if (!v) continue;
        const plain = decrypt(v);
        if (!plain) continue;
        const clientId = keys[i].slice(REDIS_PREFIX.length);
        tokenCache.set(clientId, plain);
        count++;
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('[CustomBotTokenStore] hydrate hatası:', (err as Error).message);
  }
  return count;
}
