import { EmbedBuilder, type TextChannel } from 'discord.js';
import { getBotClient } from './botClientHelper';
import { apiTouchTicketStaffPanelMessage } from './apiClient';
import { buildEmbedFromConfig, toEmbedConfig } from './buildEmbedFromConfig';

export type TicketStaffMessagePayload = {
  channelId: string;
  content: string;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
  embedTitleUrl?: string | null;
  embedAuthorName?: string | null;
  embedAuthorIcon?: string | null;
  embedAuthorUrl?: string | null;
  embedThumbnail?: string | null;
  embedImage?: string | null;
  embedFooter?: string | null;
  embedFooterIcon?: string | null;
  embedUseTimestamp?: boolean;
  embedFieldsJson?: string | null;
  staffUserId: string;
};

export async function sendTicketStaffMessageToChannel(guildId: string, payload: TicketStaffMessagePayload, botClientId?: string): Promise<void> {
  const client = getBotClient(botClientId);
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error(`Sunucu bulunamadı (GuildId: ${guildId})`);
  }
  const ch = guild.channels.cache.get(payload.channelId) as TextChannel | null;
  if (!ch?.isTextBased()) {
    throw new Error('Talep kanalı bulunamadı veya metin kanalı değil');
  }

  const options: { content?: string; embeds?: EmbedBuilder[] } = {};
  if (payload.content?.trim()) {
    options.content = payload.content.trim();
  }

  const hasEmbedContent =
    payload.embedTitle ||
    payload.embedDescription ||
    payload.embedAuthorName ||
    payload.embedThumbnail ||
    payload.embedImage ||
    payload.embedFooter ||
    payload.embedFieldsJson;

  if (hasEmbedContent) {
    const embedResult = buildEmbedFromConfig(
      toEmbedConfig({
        isEmbed: true,
        embedTitle: payload.embedTitle ?? null,
        embedTitleUrl: payload.embedTitleUrl ?? null,
        embedDescription: payload.embedDescription ?? null,
        embedColor: payload.embedColor ?? null,
        embedAuthorName: payload.embedAuthorName ?? null,
        embedAuthorIcon: payload.embedAuthorIcon ?? null,
        embedAuthorUrl: payload.embedAuthorUrl ?? null,
        embedThumbnail: payload.embedThumbnail ?? null,
        embedImage: payload.embedImage ?? null,
        embedFooter: payload.embedFooter ?? null,
        embedFooterIcon: payload.embedFooterIcon ?? null,
        embedUseTimestamp: payload.embedUseTimestamp,
        embedFieldsJson: payload.embedFieldsJson ?? null,
      }),
    );
    if (embedResult.embeds?.length) {
      options.embeds = embedResult.embeds;
    }
  }

  if (!options.content && !options.embeds?.length) {
    throw new Error('Mesaj içeriği veya embed gerekli');
  }

  await ch.send(options);
  await apiTouchTicketStaffPanelMessage(guildId, payload.channelId, payload.staffUserId, botClientId);
}
