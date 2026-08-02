import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { LogChannelData, LogChannelTypeData } from '../types/database';
import { getTextChannel } from './channelHelper';
import { getBotClient } from './botClientHelper';
import { buildSingleEmbedFromConfig, toEmbedConfig } from './buildEmbedFromConfig';
import type { EmbedConfig } from '../types/embedConfig';

export type LogType = 
  | 'MESSAGE_DELETE'
  | 'MESSAGE_EDIT'
  | 'MEMBER_BAN'
  | 'MEMBER_KICK'
  | 'MEMBER_ROLE_ADD'
  | 'MEMBER_ROLE_REMOVE'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_DELETE'
  | 'CHANNEL_UPDATE'
  | 'ROLE_CREATE'
  | 'ROLE_DELETE'
  | 'ROLE_UPDATE'
  | 'MEMBER_UPDATE'
  | 'GUILD_UPDATE';

export interface LogData {
  type: LogType;
  guildId: string;
  username?: string;
  userid?: string;
  usermention?: string;
  channel?: string;
  channelid?: string;
  channelmention?: string;
  message?: string;
  messageid?: string;
  oldmessage?: string;
  newmessage?: string;
  moderator?: string;
  moderatorid?: string;
  reason?: string;
  role?: string;
  roleid?: string;
  rolemention?: string;
  oldnickname?: string;
  newnickname?: string;
  oldname?: string;
  newname?: string;
  guildname?: string;
  timestamp?: Date;
}

export async function sendLog(logChannelData: LogChannelData, logData: LogData): Promise<void> {
  try {
    const logType = logChannelData.types.find(t => t.logType === logData.type);
    if (!logType) {
      console.log(`[DEBUG] sendLog: Log türü bulunamadı - Type: ${logData.type}, GuildId: ${logData.guildId}`);
      console.log(`[DEBUG] sendLog: Mevcut log türleri:`, logChannelData.types.map(t => t.logType));
      return;
    }
    if (!logType.enabled) {
      console.log(`[DEBUG] sendLog: Log türü aktif değil - Type: ${logData.type}, GuildId: ${logData.guildId}`);
      return;
    }

    if (!logChannelData.enabled) {
      console.log(`[DEBUG] sendLog: Log channel aktif değil - GuildId: ${logData.guildId}`);
      return;
    }

    const client = getBotClient();
    if (!client) {
      console.error(`[ERROR] Discord client bulunamadı`);
      return;
    }

    const guild = client.guilds.cache.get(logChannelData.guildId);
    if (!guild) {
      console.error(`[ERROR] Guild bulunamadı: ${logChannelData.guildId}`);
      return;
    }

    const channelId = logType.channelId || logChannelData.channelId;
    const channel = getTextChannel(guild, channelId);
    if (!channel) {
      console.error(`[ERROR] Log kanalı bulunamadı: ${channelId}`);
      return;
    }

    // İzin ön-kontrolü: bot log kanalında yazamıyorsa (embed ise EmbedLinks) log sessizce
    // düşerdi; net bir uyarı bırakırız ki yanlış yapılandırma tanısı kolaylaşsın.
    const useEmbed = logType.isEmbed !== undefined ? logType.isEmbed : logChannelData.isEmbed;
    const me = guild.members.me;
    const perms = me ? channel.permissionsFor(me) : null;
    if (
      !perms ||
      !perms.has(PermissionFlagsBits.ViewChannel) ||
      !perms.has(PermissionFlagsBits.SendMessages) ||
      (useEmbed && !perms.has(PermissionFlagsBits.EmbedLinks))
    ) {
      console.error(`[ERROR] Log kanalına yazılamıyor (Görüntüle/Mesaj Gönder/Bağlantı izni eksik): ${channelId} (Sunucu: ${logChannelData.guildId})`);
      return;
    }

    if (useEmbed) {
      const embed = createLogEmbed(logType, logChannelData, logData);
      await channel.send({ embeds: [embed] });
    } else {
      const message = createLogMessage(logType, logChannelData, logData);
      await channel.send(message);
    }
  } catch (error) {
    console.error(`[ERROR] Log gönderme hatası (Type: ${logData.type}, GuildId: ${logData.guildId}):`, error);
  }
}

function pickLogEmbedConfig(logType: LogChannelTypeData, logChannelData: LogChannelData): EmbedConfig {
  return toEmbedConfig({
    isEmbed: true,
    embedTitle: logType.embedTitle || logChannelData.embedTitle || null,
    embedTitleUrl: logType.embedTitleUrl || logChannelData.embedTitleUrl || null,
    embedDescription: logType.embedDescription || logChannelData.embedDescription || null,
    embedColor: logType.embedColor || logChannelData.embedColor || null,
    embedAuthorName: logType.embedAuthorName || logChannelData.embedAuthorName || null,
    embedAuthorIcon: logType.embedAuthorIcon || logChannelData.embedAuthorIcon || null,
    embedAuthorUrl: logType.embedAuthorUrl || logChannelData.embedAuthorUrl || null,
    embedThumbnail: logType.embedThumbnail || logChannelData.embedThumbnail || null,
    embedImage: logType.embedImage || logChannelData.embedImage || null,
    embedFooter: logType.embedFooter || logChannelData.embedFooter || null,
    embedFooterIcon: logType.embedFooterIcon || logChannelData.embedFooterIcon || null,
    embedUseTimestamp: logType.embedUseTimestamp ?? logChannelData.embedUseTimestamp,
    embedFieldsJson: logType.embedFieldsJson || logChannelData.embedFieldsJson || null,
  });
}

function createLogEmbed(logType: LogChannelTypeData, logChannelData: LogChannelData, logData: LogData): EmbedBuilder {
  const replaceTags = (text: string) => replaceLogTags(text, logData);
  const embed = buildSingleEmbedFromConfig(pickLogEmbedConfig(logType, logChannelData), { replaceTags });

  if (logData.timestamp) {
    embed.setTimestamp(logData.timestamp);
  }

  return embed;
}

function createLogMessage(logType: LogChannelTypeData, logChannelData: LogChannelData, logData: LogData): string {
  const title = logType.embedTitle || logChannelData.embedTitle;
  const description = logType.embedDescription || logChannelData.embedDescription;
  
  let message = '';
  if (title) {
    message += `**${replaceLogTags(title, logData)}**\n\n`;
  }
  if (description) {
    message += `${replaceLogTags(description, logData)}\n\n`;
  }
  
  if (logData.timestamp) {
    message += `*${logData.timestamp.toLocaleString('tr-TR')}*`;
  }

  return message;
}

function replaceLogTags(text: string, logData: LogData): string {
  if (!text) return '';
  
  let result = text;
  
  result = result.replace(/{username}/g, logData.username || 'Bilinmiyor');
  result = result.replace(/{userid}/g, logData.userid || 'Bilinmiyor');
  result = result.replace(/{usermention}/g, logData.usermention || 'Bilinmiyor');
  result = result.replace(/{channel}/g, logData.channel || 'Bilinmiyor');
  result = result.replace(/{channelid}/g, logData.channelid || 'Bilinmiyor');
  result = result.replace(/{channelmention}/g, logData.channelmention || 'Bilinmiyor');
  result = result.replace(/{message}/g, logData.message || 'İçerik yok');
  result = result.replace(/{messageid}/g, logData.messageid || 'Bilinmiyor');
  result = result.replace(/{oldmessage}/g, logData.oldmessage || 'İçerik yok');
  result = result.replace(/{newmessage}/g, logData.newmessage || 'İçerik yok');
  result = result.replace(/{moderator}/g, logData.moderator || 'Bilinmiyor');
  result = result.replace(/{moderatorid}/g, logData.moderatorid || 'Bilinmiyor');
  result = result.replace(/{reason}/g, logData.reason || 'Sebep belirtilmemiş');
  result = result.replace(/{role}/g, logData.role || 'Bilinmiyor');
  result = result.replace(/{roleid}/g, logData.roleid || 'Bilinmiyor');
  result = result.replace(/{rolemention}/g, logData.rolemention || 'Bilinmiyor');
  result = result.replace(/{oldnickname}/g, logData.oldnickname || 'Bilinmiyor');
  result = result.replace(/{newnickname}/g, logData.newnickname || 'Bilinmiyor');
  result = result.replace(/{oldname}/g, logData.oldname || 'Bilinmiyor');
  result = result.replace(/{newname}/g, logData.newname || 'Bilinmiyor');
  result = result.replace(/{guildname}/g, logData.guildname || 'Bilinmiyor');
  result = result.replace(/{timestamp}/g, (logData.timestamp || new Date()).toLocaleString('tr-TR'));
  
  return result;
}
