import { Client, TextChannel } from 'discord.js';
import { createHash } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { apiRequest } from './apiClient';
import { logError } from './logger';

interface FeedSubscription {
  id: number;
  guildId: string;
  type: string;
  url: string;
  targetChannelId: string;
  mentionRoleId?: string | null;
  lastEtag?: string | null;
  lastModified?: string | null;
  lastItemId?: string | null;
}

interface FeedItem {
  id: string;
  title: string;
  link?: string;
  publishedAt?: string;
}

export async function checkAndSendFeedAnnouncements(
  client: Client,
  isGuildHandledByCustomBot: (guildId: string) => boolean,
): Promise<void> {
  const subscriptions = await apiRequest<FeedSubscription[]>('/api/FeedAnnouncement/due?batchSize=50');
  for (const subscription of subscriptions ?? []) {
    if (isGuildHandledByCustomBot(subscription.guildId)) continue;
    await processSubscription(client, subscription);
  }
}

async function processSubscription(client: Client, subscription: FeedSubscription): Promise<void> {
  try {
    await ensureSafeUrl(subscription.url);
    const response = await fetch(subscription.url, {
      headers: {
        ...(subscription.lastEtag ? { 'If-None-Match': subscription.lastEtag } : {}),
        ...(subscription.lastModified ? { 'If-Modified-Since': subscription.lastModified } : {}),
        'User-Agent': 'DevengDiscordBot/1.0',
      },
    });

    if (response.status === 304) return;
    if (!response.ok) throw new Error(`Feed HTTP ${response.status}`);

    const xml = await response.text();
    const items = parseFeedItems(xml).slice(0, 5);
    const channel = await resolveTextChannel(client, subscription.guildId, subscription.targetChannelId);
    if (!channel) throw new Error('Hedef kanal bulunamadi veya metin kanali degil.');

    for (const item of items.reverse()) {
      if (item.id === subscription.lastItemId) continue;
      const sent = await channel.send(buildMessage(subscription, item));
      await apiRequest(`/api/FeedAnnouncement/${subscription.id}/delivery`, {
        method: 'POST',
        body: JSON.stringify({
          itemId: item.id,
          itemHash: hashItem(item),
          messageId: sent.id,
          lastEtag: response.headers.get('etag'),
          lastModified: response.headers.get('last-modified'),
        }),
      });
    }
  } catch (error) {
    console.error(`[FeedWorker] Feed islenemedi (Subscription: ${subscription.id}):`, error);
    await apiRequest(`/api/FeedAnnouncement/${subscription.id}/error`, { method: 'POST' });
  }
}

async function resolveTextChannel(client: Client, guildId: string, channelId: string): Promise<TextChannel | null> {
  const guild = client.guilds.cache.get(guildId) ?? await client.guilds.fetch(guildId).catch((error) => { logError('feedAnnouncementWorker:fetchGuild', error, 'debug'); return null; });
  if (!guild) return null;
  const channel = guild.channels.cache.get(channelId) ?? await guild.channels.fetch(channelId).catch((error) => { logError('feedAnnouncementWorker:fetchChannel', error, 'debug'); return null; });
  return channel?.isTextBased() ? channel as TextChannel : null;
}

function buildMessage(subscription: FeedSubscription, item: FeedItem): string {
  const mention = subscription.mentionRoleId ? `<@&${subscription.mentionRoleId}> ` : '';
  const published = item.publishedAt ? `\nTarih: ${item.publishedAt}` : '';
  const link = item.link ? `\n${item.link}` : '';
  return `${mention}Yeni ${subscription.type.toUpperCase()} bildirimi: **${item.title}**${published}${link}`;
}

function parseFeedItems(xml: string): FeedItem[] {
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return blocks.map((block) => {
    const title = readTag(block, 'title') || 'Baslik yok';
    const link = readAtomLink(block) || readTag(block, 'link') || undefined;
    const id = readTag(block, 'guid') || readTag(block, 'id') || link || hashString(title);
    const publishedAt = readTag(block, 'pubDate') || readTag(block, 'published') || readTag(block, 'updated') || undefined;
    return { id: decodeXml(id), title: decodeXml(title), link: link ? decodeXml(link) : undefined, publishedAt: publishedAt ? decodeXml(publishedAt) : undefined };
  });
}

function readTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || null;
}

function readAtomLink(block: string): string | null {
  const match = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return match?.[1]?.trim() || null;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function ensureSafeUrl(rawUrl: string): Promise<void> {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Desteklenmeyen feed protokolu.');
  if (url.username || url.password) throw new Error('Kimlik bilgisi içeren feed URL engellendi.');
  if (url.hostname === 'localhost') throw new Error('Localhost feed adresi engellendi.');
  if (isIP(url.hostname) === 4 && isPrivateAddress(url.hostname)) {
    throw new Error('Private IP feed adresi engellendi.');
  }
  const records = await lookup(url.hostname, { all: true });
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error('Private/internal feed adresi engellendi.');
  }
}

function isPrivateAddress(address: string): boolean {
  if (address === '127.0.0.1' || address === '::1') return true;
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  return address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:');
}

function hashItem(item: FeedItem): string {
  return hashString(`${item.id}:${item.title}:${item.link ?? ''}`);
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
