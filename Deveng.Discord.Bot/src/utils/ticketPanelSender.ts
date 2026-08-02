import { 
  getTicketPanelConfig
} from './database';
import { 
  TextChannel, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  Guild,
} from 'discord.js';
import { getBotClient } from './botClientHelper';
import { getTextChannel } from './channelHelper';
import { TicketPanelData } from '../types/database';
import { buildEmbedFromConfig, toEmbedConfig } from './buildEmbedFromConfig';
import type { EmbedConfig } from '../types/embedConfig';

export function createTicketPanelReplaceTags(guild: Guild): (text: string) => string {
  const placeholders: Record<string, string> = {
    timestamp: new Date().toLocaleString('tr-TR'),
    server: guild.name,
    servername: guild.name,
  };

  return (text: string): string => {
    if (!text) return '';
    let result = text;
    for (const [key, value] of Object.entries(placeholders)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  };
}

/**
 * Talep paneli mesajı için buton/menü satırlarını (components) oluşturur.
 * Hem `sendTicketPanelToChannel` hem de `/talep-panel-gönder` komutu tarafından
 * kullanılır; böylece buton kurulum mantığı tek bir yerde tutulur.
 *
 * Güvenlik ağı: Aktif talep türü yoksa panel asla butonsuz kalmasın diye varsayılan
 * bir "Talep Oluştur" butonu enjekte edilir. (Top.gg incelemesinde butonun
 * görünmemesinin kök nedeni, türsüz bir panelin butonsuz gönderilmesiydi.)
 */
export function buildTicketPanelComponents(
  config: TicketPanelData,
): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
  const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
  const enabledTypes = config.ticketTypes
    .filter(tt => tt.enabled)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  // Butonlar (Type 0)
  const buttons = enabledTypes.filter(tt => tt.type === 0).slice(0, 20);
  if (buttons.length > 0) {
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      const rowButtons = buttons.slice(i, i + 5);

      for (const buttonType of rowButtons) {
        const customId = `ticket_create_${buttonType.id}`;
        const buttonBuilder = new ButtonBuilder()
          .setCustomId(customId)
          .setLabel(buttonType.label)
          .setStyle(buttonType.style as ButtonStyle);

        if (buttonType.emoji) {
          const customEmojiMatch = buttonType.emoji.match(/<a?:(\w+):(\d+)>/);
          if (customEmojiMatch) {
            buttonBuilder.setEmoji({ id: customEmojiMatch[2], name: customEmojiMatch[1] });
          } else {
            buttonBuilder.setEmoji(buttonType.emoji);
          }
        }

        row.addComponents(buttonBuilder);
      }

      components.push(row);
    }
  }

  // Açılır menüler (Type 1)
  const menus = enabledTypes.filter(tt => tt.type === 1).slice(0, 5);
  for (const menuType of menus) {
    const menuBuilder = new StringSelectMenuBuilder()
      .setCustomId(`ticket_create_menu_${menuType.id}`)
      .setPlaceholder(menuType.placeholder || 'Talep türü seçin...')
      .setMinValues(1)
      .setMaxValues(1);

    // Her menü için tek bir seçenek (talep türü)
    menuBuilder.addOptions({
      label: menuType.label,
      value: `ticket_type_${menuType.id}`,
      description: menuType.placeholder || undefined,
      emoji: menuType.emoji ? (menuType.emoji.match(/<a?:(\w+):(\d+)>/)
        ? { id: menuType.emoji.match(/<a?:(\w+):(\d+)>/)![2], name: menuType.emoji.match(/<a?:(\w+):(\d+)>/)![1] }
        : menuType.emoji) : undefined,
    });

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menuBuilder);
    components.push(row);
  }

  // Güvenlik ağı: Hiç aktif tür yoksa varsayılan butonu ekle.
  if (components.length === 0) {
    const fallbackRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create_default')
        .setLabel('Talep Oluştur')
        .setStyle(ButtonStyle.Primary),
    );
    components.push(fallbackRow);
  }

  return components;
}

export function buildTicketPanelEmbedConfig(config: TicketPanelData): EmbedConfig {
  return toEmbedConfig({
    isEmbed: true,
    embedTitle: config.embedTitle,
    embedTitleUrl: config.embedTitleUrl,
    embedDescription: config.embedDescription,
    embedColor: config.embedColor,
    embedAuthorName: config.embedAuthorName,
    embedAuthorIcon: config.embedAuthorIcon,
    embedAuthorUrl: config.embedAuthorUrl,
    embedThumbnail: config.embedThumbnail,
    embedImage: config.embedImage,
    embedFooter: config.embedFooter,
    embedFooterIcon: config.embedFooterIcon,
    embedUseTimestamp: config.embedUseTimestamp,
    embedFieldsJson: config.embedFieldsJson,
  });
}

/**
 * Ticket panel mesajını kanala gönderir
 * @param guildId Discord sunucu ID'si
 * @param botClientId Custom bot clientId (opsiyonel - varsa custom bot kullanılır)
 */
export async function sendTicketPanelToChannel(guildId: string, botClientId?: string): Promise<void> {
  const client = getBotClient(botClientId);

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error(`Sunucu bulunamadı (GuildId: ${guildId})`);
  }

  const config = await getTicketPanelConfig(guildId);
  if (!config) {
    throw new Error('Talep paneli ayarlanmamış! Önce web arayüzünden ayarlayın.');
  }

  // Kanalı belirle
  let channel: TextChannel | null = null;
  if (config.channelId) {
    channel = getTextChannel(guild, config.channelId);
  }

  if (!channel) {
    throw new Error(`Panel kanalı bulunamadı (ChannelId: ${config.channelId})`);
  }

  const replaceTags = createTicketPanelReplaceTags(guild);
  const embedResult = config.isEmbed
    ? buildEmbedFromConfig(buildTicketPanelEmbedConfig(config), { replaceTags })
    : null;
  const embed = embedResult?.embeds?.[0] ?? null;

  // Butonları ve menüleri oluştur (paylaşılan helper — fallback butonu dahil)
  const components = buildTicketPanelComponents(config);

  // Mesajı gönder veya güncelle
  const messageOptions: any = {
    components: components.length > 0 ? components : undefined,
  };

  if (embed) {
    messageOptions.embeds = [embed];
  } else if (config.panelMessage) {
    messageOptions.content = config.panelMessage;
  }

  if (!messageOptions.embeds && !messageOptions.content && !messageOptions.components) {
    throw new Error('Gönderilecek içerik bulunamadı!');
  }

  let sentMessage: any;
  
  // Eğer messageId varsa ve mesaj hâlâ mevcutsa, güncelle
  if (config.messageId && channel) {
    try {
      const existingMessage = await channel.messages.fetch(config.messageId);
      if (existingMessage) {
        await existingMessage.edit(messageOptions);
        sentMessage = existingMessage;
        console.log(`[INFO] Mevcut ticket panel mesajı güncellendi: ${config.messageId}`);
      } else {
        sentMessage = await channel.send(messageOptions);
      }
    } catch (error) {
      console.log(`[INFO] Mevcut mesaj bulunamadı, yeni mesaj gönderiliyor: ${error}`);
      sentMessage = await channel.send(messageOptions);
    }
  } else {
    sentMessage = await channel.send(messageOptions);
  }
  
  if (!sentMessage) {
    throw new Error('Mesaj gönderilemedi!');
  }

  console.log(`[INFO] Ticket panel mesajı gönderildi: ${sentMessage.id} (GuildId: ${guildId})`);
}

