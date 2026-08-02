import { saveReactionRoleConfig } from './database';
import { getReactionRoleConfigById } from './apiClient';
import { 
  TextChannel, 
  ChannelType, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder 
} from 'discord.js';
import { getBotClient } from './botClientHelper';
import { getTextChannel } from './channelHelper';
import { buildEmbedFromConfig, toEmbedConfig } from './buildEmbedFromConfig';
import type { ReactionRoleData } from '../types/database';
import type { Guild } from 'discord.js';

// Discord emoji formatından Unicode emoji'ye mapping
const DISCORD_EMOJI_TO_UNICODE: Record<string, string> = {
  'warning': '⚠️',
  'white_check_mark': '✅',
  'x': '❌',
  'check': '✅',
  'cross': '❌',
  'thumbsup': '👍',
  'thumbsdown': '👎',
  'heart': '❤️',
  'star': '⭐',
  'fire': '🔥',
  'tada': '🎉',
  'confetti_ball': '🎊',
  'balloon': '🎈',
  'gift': '🎁',
  'trophy': '🏆',
  'medal': '🏅',
  '1st_place_medal': '🥇',
  '2nd_place_medal': '🥈',
  '3rd_place_medal': '🥉',
  'game_die': '🎲',
  'video_game': '🎮',
  'art': '🎨',
  'musical_note': '🎵',
  'bell': '🔔',
  'mega': '📣',
};

function createReactionRoleReplaceTags(guild: Guild): (text: string) => string {
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

export function buildReactionRoleEmbedOptions(
  config: ReactionRoleData,
  guild: Guild,
): { content?: string; embeds?: EmbedBuilder[] } {
  if (config.normalMessage && !config.isEmbed) {
    return { content: createReactionRoleReplaceTags(guild)(config.normalMessage).replace(/\\n/g, '\n') };
  }

  if (!config.isEmbed) {
    return {};
  }

  return buildEmbedFromConfig(
    toEmbedConfig({
      isEmbed: true,
      embedTitle: config.embedTitle,
      embedTitleUrl: config.embedTitleUrl ?? null,
      embedDescription: config.embedDescription,
      embedColor: config.embedColor,
      embedAuthorName: config.embedAuthorName ?? null,
      embedAuthorIcon: config.embedAuthorIcon ?? null,
      embedAuthorUrl: config.embedAuthorUrl ?? null,
      embedThumbnail: config.embedThumbnail,
      embedImage: config.embedImage,
      embedFooter: config.embedFooter,
      embedFooterIcon: config.embedFooterIcon ?? null,
      embedUseTimestamp: config.embedUseTimestamp,
      embedFieldsJson: config.embedFieldsJson ?? null,
    }),
    { replaceTags: createReactionRoleReplaceTags(guild) },
  );
}

/**
 * Reaction role mesajını kanala gönderir
 * @param reactionRoleId Veritabanı panel Id
 * @param botClientId Custom bot clientId (opsiyonel - varsa custom bot kullanılır)
 */
export async function sendReactionRoleToChannel(reactionRoleId: number, botClientId?: string): Promise<void> {
  const config = await getReactionRoleConfigById(reactionRoleId);
  if (!config) {
    throw new Error(`Tepki rol paneli bulunamadı (Id: ${reactionRoleId})`);
  }

  const client = getBotClient(botClientId);

  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) {
    throw new Error(`Sunucu bulunamadı (GuildId: ${config.guildId})`);
  }

  // Etkileşim öğesi var mı? (en az bir aktif buton, en az bir seçeneği olan aktif menü
  // veya eklenecek aktif emoji). Hiçbiri yoksa panel "ölü" olur; üyeler rol alamaz.
  // Bu durumda kanal/ mesaj oluşturmadan hata ver ki web arayüzü kullanıcıyı uyarsın.
  const willHaveButtons = config.enableButton && config.buttons.some(b => b.enabled);
  const willHaveMenu = config.enableMenu &&
    config.menus.some(m => m.enabled && m.options.some(o => o.enabled));
  const willReactEmojis = config.enableEmoji && config.emojis.some(e => e.enabled);
  if (!willHaveButtons && !willHaveMenu && !willReactEmojis) {
    throw new Error('Tepki rol panelinde hiçbir etkileşim öğesi yok: en az bir aktif buton, (en az bir seçeneği olan) aktif menü veya aktif emoji ekleyip aktif edin.');
  }

  // Kanalı belirle
  let channel: TextChannel | null = null;
  if (config.channelId) {
    channel = getTextChannel(guild, config.channelId);
  }

  // Eğer kanal yoksa, bot oluşturacak
  if (!channel) {
    channel = await guild.channels.create({
      name: 'tepki-rol',
      type: ChannelType.GuildText,
      reason: 'Tepki rol sistemi için otomatik oluşturuldu',
    }) as TextChannel;

    // Veritabanını güncelle
    await saveReactionRoleConfig(
      config.guildId,
      channel.id,
      config.normalMessage,
      config.isEmbed,
      config.embedTitle,
      config.embedDescription,
      config.embedColor,
      config.embedThumbnail,
      config.embedImage,
      config.embedFooter,
      null, // messageId henüz yok
      config.emojis.map(e => ({ emoji: e.emoji, roleId: e.roleId, orderIndex: e.orderIndex, enabled: e.enabled })),
      config.buttons.map(b => ({ label: b.label, emoji: b.emoji, roleId: b.roleId, style: b.style, orderIndex: b.orderIndex, enabled: b.enabled })),
      config.menus.map(m => ({
        placeholder: m.placeholder,
        minValues: m.minValues,
        maxValues: m.maxValues,
        enabled: m.enabled,
        options: m.options.map(o => ({
          label: o.label,
          description: o.description,
          roleId: o.roleId,
          emoji: o.emoji,
          orderIndex: o.orderIndex,
          enabled: o.enabled,
        })),
      })),
      config.enableEmoji,
      config.enableButton,
      config.enableMenu,
      config.id
    );
  }

  // Eğer messageId varsa ve mesaj bulunabiliyorsa, güncelle
  let sentMessage;
  if (config.messageId) {
    try {
      const existingMessage = await channel.messages.fetch(config.messageId);
      if (existingMessage) {
        // Mesajı güncelle
        const messageOptions: any = {
          ...buildReactionRoleEmbedOptions(config, guild),
        };

        // Components oluştur
        const components: any[] = [];
        
        // Butonlar
        if (config.enableButton && config.buttons && config.buttons.length > 0) {
          const enabledButtons = config.buttons
            .filter(b => b.enabled)
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .slice(0, 5); // Discord maksimum 5 buton

          if (enabledButtons.length > 0) {
            const buttonRow = new ActionRowBuilder<ButtonBuilder>();
            for (const button of enabledButtons) {
              const btn = new ButtonBuilder()
                .setCustomId(`reaction_role_button_${button.id}_${button.roleId}`)
                .setLabel(button.label)
                .setStyle(button.style as ButtonStyle);

              if (button.emoji) {
                // Discord emoji formatı kontrolü
                // Format 1: <:name:id> veya <a:name:id> (custom emoji)
                const customEmojiMatch = button.emoji.match(/<a?:(\w+):(\d+)>/);
                if (customEmojiMatch) {
                  btn.setEmoji({ id: customEmojiMatch[2], name: customEmojiMatch[1] });
                } 
                // Format 2: :warning: veya :emoji_name: (Discord emoji formatı)
                // Discord API butonlarda :warning: formatını { name: 'warning' } olarak kabul etmiyor
                // Bu yüzden Unicode'a çeviriyoruz
                else if (button.emoji.startsWith(':') && button.emoji.endsWith(':')) {
                  const emojiName = button.emoji.slice(1, -1).toLowerCase();
                  const unicodeEmoji = DISCORD_EMOJI_TO_UNICODE[emojiName];
                  if (unicodeEmoji) {
                    btn.setEmoji(unicodeEmoji);
                  } else {
                    console.warn(`[WARN] Discord emoji için Unicode karşılığı bulunamadı: ${button.emoji} - Buton emoji'si atlandı`);
                  }
                }
                // Format 3: Unicode emoji (🎮, 🎨, vb.)
                else {
                  const cleanEmoji = button.emoji.trim();
                  if (cleanEmoji) {
                    btn.setEmoji(cleanEmoji);
                  }
                }
              }

              buttonRow.addComponents(btn);
            }
            components.push(buttonRow);
          }
        }

        // Menüler
        if (config.enableMenu && config.menus && config.menus.length > 0) {
          const enabledMenus = config.menus
            .filter(m => m.enabled)
            .slice(0, 5); // Discord maksimum 5 menü

          for (const menu of enabledMenus) {
            const menuBuilder = new StringSelectMenuBuilder()
              .setCustomId(`reaction_role_menu_${menu.id}`)
              .setPlaceholder(menu.placeholder || 'Seçim yapın...')
              .setMinValues(menu.minValues)
              .setMaxValues(menu.maxValues);

            const enabledOptions = menu.options
              .filter(o => o.enabled)
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .slice(0, 25); // Discord maksimum 25 seçenek

            for (const option of enabledOptions) {
              const optionBuilder = new StringSelectMenuOptionBuilder()
                .setLabel(option.label)
                .setValue(option.roleId);

              if (option.description) {
                optionBuilder.setDescription(option.description);
              }

              if (option.emoji) {
                // Discord emoji formatı kontrolü
                // Format 1: <:name:id> veya <a:name:id> (custom emoji)
                const customEmojiMatch = option.emoji.match(/<a?:(\w+):(\d+)>/);
                if (customEmojiMatch) {
                  optionBuilder.setEmoji({ id: customEmojiMatch[2], name: customEmojiMatch[1] });
                } 
                // Format 2: :warning: veya :emoji_name: (Discord emoji formatı)
                // Discord API select menu option'larda :warning: formatını { name: 'warning' } olarak kabul etmiyor
                // Bu yüzden Unicode'a çevirip label'a ekliyoruz
                else if (option.emoji.startsWith(':') && option.emoji.endsWith(':')) {
                  const emojiName = option.emoji.slice(1, -1).toLowerCase();
                  const unicodeEmoji = DISCORD_EMOJI_TO_UNICODE[emojiName];
                  if (unicodeEmoji) {
                    // Unicode emoji'yi label'a ekle
                    const currentLabel = optionBuilder.data.label || option.label;
                    optionBuilder.setLabel(`${unicodeEmoji} ${currentLabel}`);
                  } else {
                    console.warn(`[WARN] Discord emoji için Unicode karşılığı bulunamadı: ${option.emoji} - Label'a eklenmedi`);
                  }
                }
                // Format 3: Unicode emoji (🎮, 🎨, vb.)
                else {
                  // Unicode emoji - Discord API select menu option'larda desteklemiyor
                  // Bu yüzden label'a ekleyelim
                  const cleanEmoji = option.emoji.trim();
                  if (cleanEmoji) {
                    const currentLabel = optionBuilder.data.label || option.label;
                    optionBuilder.setLabel(`${cleanEmoji} ${currentLabel}`);
                  }
                }
              }

              menuBuilder.addOptions(optionBuilder);
            }

            if (enabledOptions.length > 0) {
              const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menuBuilder);
              components.push(menuRow);
            }
          }
        }

        if (components.length > 0) {
          messageOptions.components = components;
        }

        sentMessage = await existingMessage.edit(messageOptions);
      }
    } catch (error) {
      // Mesaj bulunamadı, yeni mesaj gönder
      console.log(`[INFO] Mevcut mesaj bulunamadı, yeni mesaj gönderiliyor (MessageId: ${config.messageId})`);
    }
  }

  // Eğer mesaj güncellenmediyse, yeni mesaj gönder
  if (!sentMessage) {
    const messageOptions: any = {
      ...buildReactionRoleEmbedOptions(config, guild),
    };

    // Components oluştur
    const components: any[] = [];
    
    // Butonlar
    if (config.enableButton && config.buttons && config.buttons.length > 0) {
      const enabledButtons = config.buttons
        .filter(b => b.enabled)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .slice(0, 5);

      if (enabledButtons.length > 0) {
        const buttonRow = new ActionRowBuilder<ButtonBuilder>();
        for (const button of enabledButtons) {
          const btn = new ButtonBuilder()
            .setCustomId(`reaction_role_button_${button.id}_${button.roleId}`)
            .setLabel(button.label)
            .setStyle(button.style as ButtonStyle);

          if (button.emoji) {
            // Discord emoji formatı kontrolü
            // Format 1: <:name:id> veya <a:name:id> (custom emoji)
            const customEmojiMatch = button.emoji.match(/<a?:(\w+):(\d+)>/);
            if (customEmojiMatch) {
              btn.setEmoji({ id: customEmojiMatch[2], name: customEmojiMatch[1] });
            } 
            // Format 2: :warning: veya :emoji_name: (Discord emoji formatı)
            // Discord API butonlarda :warning: formatını { name: 'warning' } olarak kabul etmiyor
            // Bu yüzden Unicode'a çeviriyoruz
            else if (button.emoji.startsWith(':') && button.emoji.endsWith(':')) {
              const emojiName = button.emoji.slice(1, -1).toLowerCase();
              const unicodeEmoji = DISCORD_EMOJI_TO_UNICODE[emojiName];
              if (unicodeEmoji) {
                btn.setEmoji(unicodeEmoji);
              } else {
                console.warn(`[WARN] Discord emoji için Unicode karşılığı bulunamadı: ${button.emoji} - Buton emoji'si atlandı`);
              }
            }
            // Format 3: Unicode emoji (🎮, 🎨, vb.)
            else {
              const cleanEmoji = button.emoji.trim();
              if (cleanEmoji) {
                btn.setEmoji(cleanEmoji);
              }
            }
          }

          buttonRow.addComponents(btn);
        }
        components.push(buttonRow);
      }
    }

    // Menüler
    if (config.enableMenu && config.menus && config.menus.length > 0) {
      const enabledMenus = config.menus
        .filter(m => m.enabled)
        .slice(0, 5);

      for (const menu of enabledMenus) {
        const menuBuilder = new StringSelectMenuBuilder()
          .setCustomId(`reaction_role_menu_${menu.id}`)
          .setPlaceholder(menu.placeholder || 'Seçim yapın...')
          .setMinValues(menu.minValues)
          .setMaxValues(menu.maxValues);

        const enabledOptions = menu.options
          .filter(o => o.enabled)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .slice(0, 25);

        for (const option of enabledOptions) {
          const optionBuilder = new StringSelectMenuOptionBuilder()
            .setLabel(option.label)
            .setValue(option.roleId);

          if (option.description) {
            optionBuilder.setDescription(option.description);
          }

          if (option.emoji) {
            // Discord emoji formatı kontrolü
            // Format 1: <:name:id> veya <a:name:id> (custom emoji)
            const customEmojiMatch = option.emoji.match(/<a?:(\w+):(\d+)>/);
            if (customEmojiMatch) {
              optionBuilder.setEmoji({ id: customEmojiMatch[2], name: customEmojiMatch[1] });
            } 
            // Format 2: :warning: veya :emoji_name: (Discord emoji formatı)
            // Discord API select menu option'larda :warning: formatını { name: 'warning' } olarak kabul etmiyor
            // Bu yüzden Unicode'a çevirip label'a ekliyoruz
            else if (option.emoji.startsWith(':') && option.emoji.endsWith(':')) {
              const emojiName = option.emoji.slice(1, -1).toLowerCase();
              const unicodeEmoji = DISCORD_EMOJI_TO_UNICODE[emojiName];
              if (unicodeEmoji) {
                // Unicode emoji'yi label'a ekle
                const currentLabel = optionBuilder.data.label || option.label;
                optionBuilder.setLabel(`${unicodeEmoji} ${currentLabel}`);
              } else {
                console.warn(`[WARN] Discord emoji için Unicode karşılığı bulunamadı: ${option.emoji} - Label'a eklenmedi`);
              }
            }
            // Format 3: Unicode emoji (🎮, 🎨, vb.)
            else {
              // Unicode emoji - Discord API select menu option'larda desteklemiyor
              // Bu yüzden label'a ekleyelim
              const cleanEmoji = option.emoji.trim();
              if (cleanEmoji) {
                const currentLabel = optionBuilder.data.label || option.label;
                optionBuilder.setLabel(`${cleanEmoji} ${currentLabel}`);
              }
            }
          }

          menuBuilder.addOptions(optionBuilder);
        }

        if (enabledOptions.length > 0) {
          const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menuBuilder);
          components.push(menuRow);
        }
      }
    }

    if (components.length > 0) {
      messageOptions.components = components;
    }

    sentMessage = await channel.send(messageOptions);
  }

  // Emojileri ekle (sadece enableEmoji aktifse)
  if (config.enableEmoji && config.emojis && config.emojis.length > 0) {
    const enabledEmojis = config.emojis
      .filter(e => e.enabled)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    for (const emojiConfig of enabledEmojis) {
      try {
        // Emoji formatlarını kontrol et
        if (emojiConfig.emoji.startsWith('<') && emojiConfig.emoji.endsWith('>')) {
          // Custom emoji formatı: <:name:id> veya <a:name:id>
          const emojiMatch = emojiConfig.emoji.match(/<a?:(\w+):(\d+)>/);
          if (emojiMatch) {
            const emojiId = emojiMatch[2];
            const emoji = guild.emojis.cache.get(emojiId);
            if (emoji) {
              await sentMessage.react(emoji);
            }
          }
        } else if (emojiConfig.emoji.startsWith(':') && emojiConfig.emoji.endsWith(':')) {
          // Discord emoji formatı: :warning:
          const emojiName = emojiConfig.emoji.slice(1, -1);
          await sentMessage.react(emojiName);
        } else {
          // Unicode emoji
          await sentMessage.react(emojiConfig.emoji);
        }
      } catch (error) {
        console.error(`[ERROR] Emoji eklenemedi: ${emojiConfig.emoji}`, error);
      }
    }
  }

  // MessageId'yi veritabanına kaydet
  await saveReactionRoleConfig(
    config.guildId,
    channel.id,
    config.normalMessage,
    config.isEmbed,
    config.embedTitle,
    config.embedDescription,
    config.embedColor,
    config.embedThumbnail,
    config.embedImage,
    config.embedFooter,
    sentMessage.id,
    config.emojis.map(e => ({ emoji: e.emoji, roleId: e.roleId, orderIndex: e.orderIndex, enabled: e.enabled })),
    config.buttons.map(b => ({ label: b.label, emoji: b.emoji, roleId: b.roleId, style: b.style, orderIndex: b.orderIndex, enabled: b.enabled })),
    config.menus.map(m => ({
      placeholder: m.placeholder,
      minValues: m.minValues,
      maxValues: m.maxValues,
      enabled: m.enabled,
      options: m.options.map(o => ({
        label: o.label,
        description: o.description,
        roleId: o.roleId,
        emoji: o.emoji,
        orderIndex: o.orderIndex,
        enabled: o.enabled,
      })),
    })),
    config.enableEmoji,
    config.enableButton,
    config.enableMenu,
    config.id
  );

  console.log(`[INFO] Reaction role mesajı gönderildi (GuildId: ${config.guildId}, ChannelId: ${channel.id}, MessageId: ${sentMessage.id})`);
}

/**
 * Kanaldaki reaction role mesajını siler ve kayıttaki MessageId'yi temizler.
 */
export async function deleteReactionRoleMessage(reactionRoleId: number, botClientId?: string): Promise<void> {
  const config = await getReactionRoleConfigById(reactionRoleId);
  if (!config) {
    throw new Error(`Tepki rol paneli bulunamadı (Id: ${reactionRoleId})`);
  }

  const client = getBotClient(botClientId);

  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) {
    throw new Error(`Sunucu bulunamadı (GuildId: ${config.guildId})`);
  }

  if (!config.messageId) {
    throw new Error('Kaldırılacak kanal mesajı yok.');
  }

  if (!config.channelId) {
    throw new Error('Kanal tanımlı değil; önce kanal seçin.');
  }

  const channel = getTextChannel(guild, config.channelId);
  if (!channel) {
    throw new Error('Mesaj kanalı bulunamadı veya erişilemiyor.');
  }

  try {
    const msg = await channel.messages.fetch(config.messageId);
    await msg.delete();
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: number }).code : undefined;
    // 10008 Unknown Message — zaten silinmiş; kaydı yine de temizle
    if (code !== 10008) {
      console.warn('[ReactionRole] Mesaj silinirken hata (kayıt yine temizlenecek):', e);
    }
  }

  await saveReactionRoleConfig(
    config.guildId,
    config.channelId,
    config.normalMessage,
    config.isEmbed,
    config.embedTitle,
    config.embedDescription,
    config.embedColor,
    config.embedThumbnail,
    config.embedImage,
    config.embedFooter,
    null,
    config.emojis.map((e) => ({ emoji: e.emoji, roleId: e.roleId, orderIndex: e.orderIndex, enabled: e.enabled })),
    config.buttons.map((b) => ({
      label: b.label,
      emoji: b.emoji,
      roleId: b.roleId,
      style: b.style,
      orderIndex: b.orderIndex,
      enabled: b.enabled,
    })),
    config.menus.map((m) => ({
      placeholder: m.placeholder,
      minValues: m.minValues,
      maxValues: m.maxValues,
      enabled: m.enabled,
      options: m.options.map((o) => ({
        label: o.label,
        description: o.description,
        roleId: o.roleId,
        emoji: o.emoji,
        orderIndex: o.orderIndex,
        enabled: o.enabled,
      })),
    })),
    config.enableEmoji,
    config.enableButton,
    config.enableMenu,
    config.id
  );

  console.log(`[INFO] Reaction role kanal mesajı kaldırıldı (GuildId: ${config.guildId}, PanelId: ${reactionRoleId})`);
}

