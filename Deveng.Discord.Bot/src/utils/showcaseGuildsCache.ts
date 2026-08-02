import type { Client } from 'discord.js';
import { getRedisClient } from './redisCache';

/**
 * API (StackExchange.Redis) ile aynı anahtar — deveng: prefix bot/API ortak sözlüğü.
 * Bot: SETEX · API: StringGet + JSON deserialize
 */
export const SHOWCASE_GUILDS_REDIS_KEY = 'deveng:public:showcase-guilds:v1';

/** Vitrin listesi periyodik yenileme aralığı (~1 saat). */
export const SHOWCASE_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

// TTL ~2 saat — yenileme aralığından uzun; anahtarın boş kalmasını engeller.
const CACHE_TTL_SECONDS = 2 * 60 * 60; // 2 saat

/** İstemciye giden vitrin kaydı — CDN URL’si yok; ikon/banner data URL (base64) veya null. */
export interface ShowcaseGuildEntry {
  id: string;
  name: string;
  iconDataUrl: string | null;
  bannerDataUrl: string | null;
  memberCount: number;
}

export interface ShowcaseGuildsPayload {
  updatedAt: string;
  totalGuilds: number;
  totalMembersApprox: number;
  guilds: ShowcaseGuildEntry[];
}

interface ShowcaseGuildRaw {
  id: string;
  name: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
}

/** Üye sayısına göre ilk N sunucunun ikonu; banner yalnızca ilk M (daha büyük dosya). */
const ICON_DATA_URL_GUILD_LIMIT = 48;
const BANNER_DATA_URL_GUILD_LIMIT = 12;
const CDN_FETCH_CONCURRENCY = 8;
const CDN_FETCH_TIMEOUT_MS = 12_000;

async function cdnUrlToDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CDN_FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const mime = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const chunk = await Promise.all(slice.map((item, j) => fn(item, i + j)));
    for (let k = 0; k < chunk.length; k++) results[i + k] = chunk[k];
  }
  return results;
}

async function rawListToPayloadEntries(sorted: ShowcaseGuildRaw[]): Promise<ShowcaseGuildEntry[]> {
  const head = sorted.slice(0, ICON_DATA_URL_GUILD_LIMIT);
  const tail = sorted.slice(ICON_DATA_URL_GUILD_LIMIT);

  const enrichedHead = await mapWithConcurrency(head, CDN_FETCH_CONCURRENCY, async (g, index) => {
    const iconDataUrl = await cdnUrlToDataUrl(g.iconUrl);
    const bannerDataUrl =
      index < BANNER_DATA_URL_GUILD_LIMIT ? await cdnUrlToDataUrl(g.bannerUrl) : null;
    return {
      id: g.id,
      name: g.name,
      memberCount: g.memberCount,
      iconDataUrl,
      bannerDataUrl,
    } satisfies ShowcaseGuildEntry;
  });

  const tailEntries: ShowcaseGuildEntry[] = tail.map((g) => ({
    id: g.id,
    name: g.name,
    memberCount: g.memberCount,
    iconDataUrl: null,
    bannerDataUrl: null,
  }));

  return [...enrichedHead, ...tailEntries];
}

function collectShowcaseRawForClient(c: Client): ShowcaseGuildRaw[] {
  const list: ShowcaseGuildRaw[] = [];
  for (const g of c.guilds.cache.values()) {
    const iconUrl = g.iconURL({ size: 256, extension: 'png' });
    const bannerUrl = g.bannerURL({ size: 512, extension: 'png' });
    const memberCount = g.memberCount ?? 0;
    list.push({
      id: g.id,
      name: g.name,
      iconUrl: iconUrl ?? null,
      bannerUrl: bannerUrl ?? null,
      memberCount,
    });
  }
  return list;
}

/**
 * Üye sayısına göre sıralanmış sunucu vitrin listesini Redis’e yazar. Ana bot hazır
 * olunca bir kez, ardından periyodik olarak (~1 saat, bkz. SHOWCASE_REFRESH_INTERVAL_MS)
 * tazelenir; böylece ana sayfadaki liste drift etmez.
 * İkon/banner görselleri bot tarafında CDN’den indirilip data URL olarak gömülür; panel tarayıcısı Discord CDN’ine gitmez.
 * Redis yoksa sessizce atlanır.
 */
export async function refreshShowcaseGuildsCache(client: Client): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn('[Showcase] Redis yok, vitrin sunucu listesi atlandı');
    return;
  }

  let rawList: ShowcaseGuildRaw[] = [];
  if (client.shard) {
    try {
      const perShard = (await client.shard.broadcastEval((inner) => {
        const out: ShowcaseGuildRaw[] = [];
        for (const g of inner.guilds.cache.values()) {
          const iconUrl = g.iconURL({ size: 256, extension: 'png' });
          const bannerUrl = g.bannerURL({ size: 512, extension: 'png' });
          const memberCount = g.memberCount ?? 0;
          out.push({
            id: g.id,
            name: g.name,
            iconUrl: iconUrl ?? null,
            bannerUrl: bannerUrl ?? null,
            memberCount,
          });
        }
        return out;
      })) as ShowcaseGuildRaw[][];
      rawList = perShard.flat();
    } catch (e) {
      console.error('[Showcase] broadcastEval ile vitrin toplanamadı, yalnızca bu shard kullanılıyor:', e);
      rawList = collectShowcaseRawForClient(client);
    }
  } else {
    rawList = collectShowcaseRawForClient(client);
  }

  const byId = new Map<string, ShowcaseGuildRaw>();
  for (const entry of rawList) {
    byId.set(entry.id, entry);
  }
  rawList = Array.from(byId.values());

  rawList.sort((a, b) => b.memberCount - a.memberCount);
  const totalMembersApprox = rawList.reduce((s, g) => s + g.memberCount, 0);

  const guilds = await rawListToPayloadEntries(rawList);

  const payload: ShowcaseGuildsPayload = {
    updatedAt: new Date().toISOString(),
    totalGuilds: guilds.length,
    totalMembersApprox,
    guilds,
  };

  try {
    await redis.setex(SHOWCASE_GUILDS_REDIS_KEY, CACHE_TTL_SECONDS, JSON.stringify(payload));
    console.log(
      `[Showcase] ${guilds.length} sunucu, ~${totalMembersApprox} üye (yaklaşık) — Redis’e yazıldı (ikon data URL, ilk ${ICON_DATA_URL_GUILD_LIMIT} sunucu)`
    );
  } catch (e) {
    console.error('[Showcase] Redis yazılamadı:', e);
  }
}
