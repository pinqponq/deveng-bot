import { Client, PermissionFlagsBits } from 'discord.js';
import { apiRequest, getReminderSettings } from '../utils/apiClient';
import { getTextChannel } from '../utils/channelHelper';
import { buildEmbedFromConfig, toEmbedConfig } from '../utils/buildEmbedFromConfig';
import type { EmbedConfig } from '../types/embedConfig';
import { logError } from '../utils/logger';

export type PendingReminderPayload = {
  id: number;
  guildId: string;
  channelId: string;
  userId: string;
  remindDate: string;
  isEmbed: boolean;
  message: string | null;
  embedTitle: string | null;
  embedDescription: string | null;
  embedColor: string | null;
  embedTitleUrl?: string | null;
  embedAuthorName?: string | null;
  embedAuthorIcon?: string | null;
  embedAuthorUrl?: string | null;
  embedThumbnail: string | null;
  embedImage: string | null;
  embedFooter: string | null;
  embedFooterIcon?: string | null;
  embedUseTimestamp?: boolean;
  embedFieldsJson?: string | null;
};

function buildReminderEmbedConfig(
  base: Partial<EmbedConfig> & Pick<EmbedConfig, 'isEmbed'>,
  descriptionFallback?: string | null,
): EmbedConfig {
  return toEmbedConfig({
    ...base,
    embedDescription: base.embedDescription ?? descriptionFallback ?? null,
  });
}

/** Hatırlatıcıyı "gönderildi" işaretler — kalıcı hatalarda sonsuz retry'ı durdurmak için de kullanılır. */
async function markReminderSent(reminder: PendingReminderPayload): Promise<void> {
  await apiRequest(`/api/Reminder/guild/${reminder.guildId}/${reminder.id}/mark-sent`, {
    method: 'POST',
  }).catch((error) => logError('reminderDelivery:markSent', error, 'warn'));
}

/** Discord tarafında kalıcı (retry ile düzelmeyecek) bir hata mı? */
function isTerminalDeliveryError(error: unknown): boolean {
  const code = (error as { code?: number })?.code;
  // 10003 Unknown Channel, 50001 Missing Access, 50013 Missing Permissions, 50007 Cannot send DM
  return code === 10003 || code === 50001 || code === 50013 || code === 50007;
}

/** Tek bir hatırlatıcıyı bu süreçteki client üzerinden teslim eder (doğru shard sürecinde çalıştırılmalıdır). */
export async function deliverReminderOnShard(client: Client, reminder: PendingReminderPayload): Promise<void> {
  const guild = client.guilds.cache.get(reminder.guildId);
  if (!guild) {
    console.warn(`[WARN] Guild bulunamadı, hatırlatıcı terminal olarak kapatılıyor: ${reminder.guildId} (ID ${reminder.id})`);
    await markReminderSent(reminder);
    return;
  }

  const channel = getTextChannel(guild, reminder.channelId);
  if (!channel) {
    console.warn(`[WARN] Kanal bulunamadı, hatırlatıcı terminal olarak kapatılıyor: ${reminder.channelId} (ID ${reminder.id})`);
    await markReminderSent(reminder);
    return;
  }

  // İzin ön-kontrolü: bot kanalda görüp yazamıyorsa (embed ise EmbedLinks) teslim başarısız olur.
  // Bu kalıcı bir yapılandırma sorunudur; her turda tekrar denemek yerine terminal kapatırız.
  const me = guild.members.me;
  const perms = me ? channel.permissionsFor(me) : null;
  const willEmbed = reminder.isEmbed;
  if (
    !perms ||
    !perms.has(PermissionFlagsBits.ViewChannel) ||
    !perms.has(PermissionFlagsBits.SendMessages) ||
    (willEmbed && !perms.has(PermissionFlagsBits.EmbedLinks))
  ) {
    console.warn(`[WARN] Hatırlatıcı için kanal izinleri eksik (View/Send/EmbedLinks), terminal kapatılıyor: kanal ${reminder.channelId} (ID ${reminder.id})`);
    await markReminderSent(reminder);
    return;
  }

  let displayName = 'Kullanıcı';
  let loginName = 'user';
  let globalName = '';
  try {
    const member =
      guild.members.cache.get(reminder.userId) ??
      (await guild.members.fetch({ user: reminder.userId, force: false }).catch((error) => {
        logError('reminderDelivery:memberFetch', error, 'debug');
        return null;
      }));
    if (member) {
      displayName = member.displayName;
      loginName = member.user.username;
      globalName = member.user.globalName ?? member.user.username;
    } else {
      const u = await client.users.fetch(reminder.userId).catch((error) => {
        logError('reminderDelivery:userFetch', error, 'debug');
        return null;
      });
      if (u) {
        loginName = u.username;
        globalName = u.globalName ?? u.username;
        displayName = globalName;
      }
    }
  } catch (error) {
    logError('reminderDelivery:resolveUserName', error, 'warn');
    // sessiz
  }

  const reminderMessage = reminder.message || reminder.embedDescription || reminder.embedTitle || '';

  const placeholders: Record<string, string> = {
    user: `<@${reminder.userId}>`,
    userid: reminder.userId,
    usermention: `<@${reminder.userId}>`,
    username: globalName || loginName,
    userlogin: loginName,
    displayname: displayName,
    nickname: displayName,
    name: displayName,
    server: guild.name,
    servername: guild.name,
    timestamp: new Date().toLocaleString('tr-TR'),
    message: reminderMessage,
    remindermessage: reminderMessage,
    remindertitle: reminder.embedTitle || '',
    reminderdescription: reminder.embedDescription || '',
  };

  const replaceTags = (text: string): string => {
    if (!text) return '';
    let result = text;
    for (const [key, value] of Object.entries(placeholders)) {
      const re = new RegExp(`\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'gi');
      result = result.replace(re, value);
    }
    return result;
  };

  try {
  const settings = await getReminderSettings(reminder.guildId);

  if (settings && (settings.sendMessageIsEmbed || settings.sendMessage)) {
    if (settings.sendMessageIsEmbed) {
      const messageOptions = buildEmbedFromConfig(
        buildReminderEmbedConfig(
          {
            isEmbed: true,
            embedTitle: settings.sendEmbedTitle ?? null,
            embedTitleUrl: settings.sendEmbedTitleUrl ?? null,
            embedDescription: settings.sendEmbedDescription ?? settings.sendMessage ?? reminder.message,
            embedColor: settings.sendEmbedColor ?? null,
            embedAuthorName: settings.sendEmbedAuthorName ?? null,
            embedAuthorIcon: settings.sendEmbedAuthorIcon ?? null,
            embedAuthorUrl: settings.sendEmbedAuthorUrl ?? null,
            embedThumbnail: settings.sendEmbedThumbnail ?? null,
            embedImage: settings.sendEmbedImage ?? null,
            embedFooter: settings.sendEmbedFooter ?? null,
            embedFooterIcon: settings.sendEmbedFooterIcon ?? null,
            embedUseTimestamp: settings.sendEmbedUseTimestamp,
            embedFieldsJson: settings.sendEmbedFieldsJson ?? null,
          },
        ),
        { replaceTags },
      );
      await channel.send(messageOptions);
    } else {
      const messageText = settings.sendMessage
        ? replaceTags(settings.sendMessage)
        : reminder.message
          ? replaceTags(reminder.message)
          : 'Hatırlatma mesajı';

      await channel.send(messageText);
    }
  } else {
    const shouldUseEmbed = reminder.isEmbed || (settings?.defaultIsEmbed ?? false);

    if (shouldUseEmbed) {
      const messageOptions = buildEmbedFromConfig(
        buildReminderEmbedConfig(
          {
            isEmbed: true,
            embedTitle: reminder.embedTitle,
            embedTitleUrl: reminder.embedTitleUrl ?? null,
            embedDescription: reminder.embedDescription ?? reminder.message,
            embedColor: reminder.embedColor,
            embedAuthorName: reminder.embedAuthorName ?? null,
            embedAuthorIcon: reminder.embedAuthorIcon ?? null,
            embedAuthorUrl: reminder.embedAuthorUrl ?? null,
            embedThumbnail: reminder.embedThumbnail,
            embedImage: reminder.embedImage,
            embedFooter: reminder.embedFooter,
            embedFooterIcon: reminder.embedFooterIcon ?? null,
            embedUseTimestamp: reminder.embedUseTimestamp,
            embedFieldsJson: reminder.embedFieldsJson ?? null,
          },
        ),
        { replaceTags },
      );
      await channel.send(messageOptions);
    } else {
      const messageText = reminder.message ? replaceTags(reminder.message) : 'Hatırlatma mesajı';
      await channel.send(messageText);
    }
  }
  } catch (error) {
    if (isTerminalDeliveryError(error)) {
      console.warn(`[WARN] Hatırlatıcı teslimi kalıcı hata ile başarısız, terminal kapatılıyor: ID ${reminder.id}`, error);
      await markReminderSent(reminder);
      return;
    }
    throw error;
  }

  await markReminderSent(reminder);

  console.log(
    `[INFO] ✅ Hatırlatıcı başarıyla gönderildi: ID ${reminder.id} (Guild: ${reminder.guildId}, Channel: ${reminder.channelId}, User: ${reminder.userId})`
  );
}
