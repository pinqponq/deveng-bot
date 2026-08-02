import { 
  getEmbedMessageById,
  updateEmbedMessageMessageId
} from './apiClient';
import { 
  TextChannel, 
  EmbedBuilder
} from 'discord.js';
import { getTextChannel } from './channelHelper';
import { getBotClient } from './botClientHelper';
import { stripMassMentions } from './mentionSanitize';
import { buildEmbedFromConfig, toEmbedConfig } from './buildEmbedFromConfig';

/**
 * Embed mesajı kanala gönderir
 * @param id Embed mesaj ID'si
 * @param botClientId Custom bot clientId (opsiyonel - varsa custom bot kullanılır)
 * @param apiToken API'ye geri çağrıda kullanılacak token (opsiyonel - API'den gelen X-Bot-Token)
 */
export async function sendEmbedMessageToChannel(id: number, botClientId?: string, apiToken?: string): Promise<void> {
  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const overallStart = Date.now();
  console.log(`[EmbedSender] START trace=${traceId} id=${id} botClientId=${botClientId || 'N/A'} hasApiToken=${!!apiToken}`);

  const client = getBotClient(botClientId);
  console.log(`[EmbedSender] client resolved trace=${traceId} clientReady=${client.isReady()}`);

  const fetchStart = Date.now();
  const embedMessage = await getEmbedMessageById(id, botClientId, apiToken);
  console.log(`[EmbedSender] getEmbedMessageById finished trace=${traceId} id=${id} durationMs=${Date.now() - fetchStart} found=${!!embedMessage}`);
  if (!embedMessage) {
    throw new Error(`Embed mesaj bulunamadı (Id: ${id})`);
  }

  if (!embedMessage.enabled) {
    throw new Error('Embed mesaj devre dışı');
  }

  const guild = client.guilds.cache.get(embedMessage.guildId);
  console.log(`[EmbedSender] guild lookup trace=${traceId} guildId=${embedMessage.guildId} found=${!!guild}`);
  if (!guild) {
    throw new Error(`Sunucu bulunamadı (GuildId: ${embedMessage.guildId})`);
  }

  // Kanalı belirle
  let channel: TextChannel | null = null;
  if (embedMessage.channelId) {
    channel = getTextChannel(guild, embedMessage.channelId);
  }
  console.log(`[EmbedSender] channel lookup trace=${traceId} channelId=${embedMessage.channelId} found=${!!channel}`);

  if (!channel) {
    throw new Error(`Kanal bulunamadı (ChannelId: ${embedMessage.channelId})`);
  }

  // Belirli bir etkileşim kullanıcısı olmadığı için kullanıcı tag'leri sunucu sahibiyle doldurulur
  let refUserId = client.user?.id ?? '';
  let refUsername = client.user?.username ?? '';
  try {
    const owner = await guild.fetchOwner();
    if (owner?.user) {
      refUserId = owner.user.id;
      refUsername = owner.user.username;
    }
  } catch {
    const cached = guild.members.cache.get(guild.ownerId)?.user;
    if (cached) {
      refUserId = cached.id;
      refUsername = cached.username;
    }
  }

  const memberCountStr = guild.memberCount?.toString() ?? '0';

  const placeholders: Record<string, string> = {
    user: refUserId ? `<@${refUserId}>` : '',
    username: refUsername,
    userid: refUserId,
    usermention: refUserId ? `<@${refUserId}>` : '',
    membercount: memberCountStr,
    count: memberCountStr,
    timestamp: new Date().toLocaleString('tr-TR'),
    server: guild.name,
    servername: guild.name,
  };
  
  const replaceTags = (text: string): string => {
    if (!text) return '';
    let result = text;
    for (const [key, value] of Object.entries(placeholders)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return stripMassMentions(result);
  };

  const messageOptions: {
    content?: string;
    embeds?: EmbedBuilder[];
  } = embedMessage.isEmbed
    ? buildEmbedFromConfig(
        toEmbedConfig({
          isEmbed: true,
          message: embedMessage.message,
          embedTitle: embedMessage.embedTitle,
          embedTitleUrl: embedMessage.embedTitleUrl,
          embedDescription: embedMessage.embedDescription,
          embedColor: embedMessage.embedColor,
          embedAuthorName: embedMessage.embedAuthorName,
          embedAuthorIcon: embedMessage.embedAuthorIcon,
          embedAuthorUrl: embedMessage.embedAuthorUrl,
          embedThumbnail: embedMessage.embedThumbnail,
          embedImage: embedMessage.embedImage,
          embedFooter: embedMessage.embedFooter,
          embedFooterIcon: embedMessage.embedFooterIcon,
          embedUseTimestamp: embedMessage.embedUseTimestamp,
          embedFieldsJson: embedMessage.embedFieldsJson,
        }),
        {
          replaceTags,
          fallbackDescription: embedMessage.name || 'Gömülü mesaj',
        },
      )
    : buildEmbedFromConfig(
        toEmbedConfig({
          isEmbed: false,
          message: embedMessage.message,
        }),
        { replaceTags },
      );

  if (!messageOptions.embeds && !messageOptions.content) {
    throw new Error('Gönderilecek içerik bulunamadı! Embed mesajında en az bir alan doldurulmalıdır.');
  }

  const sendStart = Date.now();
  console.log(`[EmbedSender] sending Discord message trace=${traceId} channelId=${embedMessage.channelId}`);
  const sentMessage = await channel.send({
    ...messageOptions,
    allowedMentions: { parse: [] },
  });
  console.log(`[EmbedSender] Discord message sent trace=${traceId} messageId=${sentMessage.id} durationMs=${Date.now() - sendStart}`);

  try {
    const updateStart = Date.now();
    await updateEmbedMessageMessageId(id, sentMessage.id, embedMessage.guildId, apiToken);
    console.log(`[EmbedSender] updateEmbedMessageMessageId ok trace=${traceId} durationMs=${Date.now() - updateStart}`);
  } catch (error) {
    console.warn(`[WARN] MessageId güncellenemedi (Id: ${id}):`, error instanceof Error ? error.message : String(error));
  }

  console.log(`[INFO] Embed mesaj gönderildi trace=${traceId} (Id: ${id}, MessageId: ${sentMessage.id}, ChannelId: ${embedMessage.channelId}) totalMs=${Date.now() - overallStart}`);
}
