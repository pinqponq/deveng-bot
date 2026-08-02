import { GuildMember, PartialGuildMember } from 'discord.js';
import { loadConfig } from '../utils/config';
import { getGoodbyeMessage } from '../utils/database';
import { getGuildLocale } from '../utils/apiClient';
import { createGoodbyeEmbed } from '../utils/embedBuilder';
import { replaceGoodbyePlaceholders } from '../utils/placeholders';
import { sendMessage } from '../utils/messageSender';
import { getTextChannel } from '../utils/channelHelper';
import { updateStatisticsChannelByType } from '../utils/statisticsChannel';
import { tryBecomeLeader } from '../utils/redisCache';
import { apiRecordGuildMemberEvent } from '../utils/apiClient';

const LOCAL_DEDUPE_TTL_MS = 30_000;
const localGoodbyeDedupe = new Map<string, number>();

function acquireLocalGoodbyeLock(key: string): boolean {
  const now = Date.now();
  const lockedUntil = localGoodbyeDedupe.get(key);
  if (lockedUntil && lockedUntil > now) {
    return false;
  }

  localGoodbyeDedupe.set(key, now + LOCAL_DEDUPE_TTL_MS);
  for (const [k, expiresAt] of localGoodbyeDedupe) {
    if (expiresAt <= now) {
      localGoodbyeDedupe.delete(k);
    }
  }
  return true;
}

export async function handleGuildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
  try {
    const config = loadConfig();
    const guildId = member.guild.id;
    const username = member.user ? member.user.tag : 'Birisi';
    const dedupeKey = `dedupe:goodbye:${guildId}:${member.id}`;

    const localLockAcquired = acquireLocalGoodbyeLock(dedupeKey);
    if (!localLockAcquired) {
      console.log(`[WARN] ${username} için local duplicate GuildMemberRemove algılandı, ayrılma gönderimi atlandı.`);
      return;
    }

    // Çok-süreç dedup (tek süreçte yukarıdaki local lock yeterlidir). Redis yoksa fail-OPEN:
    // ayrılma mesajı Redis kesintisinde de gönderilebilmeli.
    const redisLockAcquired = await tryBecomeLeader(dedupeKey, 30);
    if (!redisLockAcquired) {
      console.log(`[WARN] ${username} için Redis duplicate GuildMemberRemove algılandı, ayrılma gönderimi atlandı.`);
      return;
    }

    await apiRecordGuildMemberEvent(guildId, { userId: member.id, eventType: 1 });
    
    // Veritabanından ayrılma mesajını al
    const locale = await getLocaleOrDefault(guildId, config.defaultLanguage);
    const goodbyeData = await getGoodbyeMessage(guildId, locale.defaultLocale, locale.fallbackLocale);
    
    if (!goodbyeData) {
      console.error(`[ERROR] Ayrılma mesajı bulunamadı sunucu için: ${guildId}`);
      return;
    }
    
    const channel = getTextChannel(member.guild, goodbyeData.channelId);

    if (!channel) {
      console.error(`[ERROR] Ayrılma kanalı bulunamadı: ${goodbyeData.channelId}`);
      return;
    }

    // Placeholder'ları değiştir
    const finalMessage = replaceGoodbyePlaceholders(member, goodbyeData.message);

    // Embed veya normal mesaj olarak gönder
    const content = goodbyeData.isEmbed 
      ? createGoodbyeEmbed(member, goodbyeData, finalMessage)
      : finalMessage;
    
    await sendMessage(channel, content, goodbyeData.isEmbed, 'Ayrılma mesajı gönderilemedi');

    console.log(`[INFO] ${username} için ayrılma mesajı gönderildi (Sunucu: ${guildId}, Embed: ${goodbyeData.isEmbed}).`);
    
    // İstatistik kanallarını güncelle
    await updateStatisticsChannelByType(guildId, 'Üye Sayısı');
    await updateStatisticsChannelByType(guildId, 'Toplam Üye');
    await updateStatisticsChannelByType(guildId, 'Çevrimiçi Üye');
    if (member.user?.bot) {
      await updateStatisticsChannelByType(guildId, 'Botlar');
    }
  } catch (error) {
    const username = member.user ? member.user.tag : 'Birisi';
    console.error(`[ERROR] GuildMemberRemove event handler hatası (${username}, Sunucu: ${member.guild.id}):`, error instanceof Error ? error.message : error);
  }
}

async function getLocaleOrDefault(guildId: string, defaultLanguage: string): Promise<{ defaultLocale: string; fallbackLocale: string }> {
  try {
    const locale = await getGuildLocale(guildId);
    return {
      defaultLocale: locale?.defaultLocale || defaultLanguage,
      fallbackLocale: locale?.fallbackLocale || defaultLanguage,
    };
  } catch (error) {
    console.warn(`[WARN] Guild locale alınamadı, config dili kullanılacak (GuildId: ${guildId}):`, error);
    return { defaultLocale: defaultLanguage, fallbackLocale: defaultLanguage };
  }
}

