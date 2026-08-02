import { ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonStyle, TextChannel, ChannelType, SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getReactionRoleConfig, saveReactionRoleConfig } from '../utils/database';
import { ensureMemberPermission } from '../utils/permissionGuards';
import { getTextChannel } from '../utils/channelHelper';
import { buildReactionRoleEmbedOptions } from '../utils/reactionRoleSender';
import { logError } from '../utils/logger';

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
  'loudspeaker': '📢',
  'bell': '🔔',
  'mega': '📣',
};

export default {
  data: new SlashCommandBuilder()
    .setName('tepki-sistem-gönder')
    .setDescription('Ayarlanan tepki rol sistemini belirlenen kanala gönderir')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir!', flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, 'Sunucuyu Yönet'))) return;

      const config = await getReactionRoleConfig(interaction.guild.id);
      if (!config) {
        await interaction.editReply({ content: 'Tepki rol sistemi ayarlanmamış! Önce `/tepki-rol-ayarla` komutu ile ayarlayın.' });
        return;
      }

      // Etkileşim öğesi var mı? (en az bir aktif buton, en az bir seçeneği olan aktif menü
      // veya eklenecek aktif emoji). Hiçbiri yoksa panel "ölü" olur; üyeler rol alamaz.
      const willHaveButtons = config.enableButton && config.buttons.some(b => b.enabled);
      const willHaveMenu = config.enableMenu &&
        config.menus.some(m => m.enabled && m.options.some(o => o.enabled));
      const willReactEmojis = config.enableEmoji && config.emojis.some(e => e.enabled);
      if (!willHaveButtons && !willHaveMenu && !willReactEmojis) {
        await interaction.editReply({
          content: 'Panelde hiçbir etkileşim öğesi yok. En az bir aktif buton, (en az bir seçeneği olan) aktif menü veya aktif emoji ekleyin; aksi halde üyeler rol alamaz.',
        });
        return;
      }

      // Kanalı belirle
      let channel: TextChannel | null = null;
      if (config.channelId) {
        channel = getTextChannel(interaction.guild, config.channelId);
      }

      // Eğer kanal yoksa, bot oluşturacak
      if (!channel) {
        // Kanal oluştur
        channel = await interaction.guild.channels.create({
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

      // Normal mesaj sadece embed kapalıyken gönderilir
      if (config.normalMessage && !config.isEmbed) {
        await channel.send(
          buildReactionRoleEmbedOptions(config, interaction.guild).content ??
            config.normalMessage.replace(/\\n/g, '\n'),
        );
      }

      const embedOptions = buildReactionRoleEmbedOptions(config, interaction.guild);
      const embed = embedOptions.embeds?.[0] ?? null;

      // Butonları oluştur (max 20, sadece enabled olanlar ve enableButton true ise)
      const buttonRows: ActionRowBuilder<ButtonBuilder>[] = [];
      const buttons = config.enableButton 
        ? config.buttons
            .filter(b => b.enabled) // Sadece enabled olanları al
            .slice(0, 20)
            .sort((a, b) => a.orderIndex - b.orderIndex)
        : [];
      
      // Duplicate kontrolü
      const usedCustomIds = new Set<string>();
      
      for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        const rowButtons = buttons.slice(i, i + 5);
        
        for (const button of rowButtons) {
          const customId = `reaction_role_button_${button.id}_${button.roleId}`;
          
          // Duplicate kontrolü
          if (usedCustomIds.has(customId)) {
            console.error(`[ERROR] Duplicate button custom_id: ${customId} (button.id: ${button.id}, roleId: ${button.roleId})`);
            continue; // Bu butonu atla
          }
          usedCustomIds.add(customId);
          
          const buttonBuilder = new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(button.label)
            .setStyle(button.style as ButtonStyle);
          
          if (button.emoji) {
            // Discord emoji formatı kontrolü
            // Format 1: <:name:id> veya <a:name:id> (custom emoji)
            const customEmojiMatch = button.emoji.match(/<a?:(\w+):(\d+)>/);
            if (customEmojiMatch) {
              buttonBuilder.setEmoji({ id: customEmojiMatch[2], name: customEmojiMatch[1] });
              console.log(`[INFO] Buton emoji eklendi (Custom): ${customEmojiMatch[1]} (${customEmojiMatch[2]})`);
            } 
            // Format 2: :warning: veya :emoji_name: (Discord emoji formatı)
            // NOT: Discord API butonlarda :warning: formatını { name: 'warning' } olarak kabul etmiyor
            // Bu yüzden Unicode'a çeviriyoruz
            else if (button.emoji.startsWith(':') && button.emoji.endsWith(':')) {
              const emojiName = button.emoji.slice(1, -1).toLowerCase(); // :warning: -> warning
              const unicodeEmoji = DISCORD_EMOJI_TO_UNICODE[emojiName];
              if (unicodeEmoji) {
                buttonBuilder.setEmoji(unicodeEmoji);
                console.log(`[INFO] Buton emoji Unicode'a çevrildi: :${emojiName}: -> ${unicodeEmoji}`);
              } else {
                console.warn(`[WARN] Discord emoji için Unicode karşılığı bulunamadı: :${emojiName}: - Buton emoji'si atlandı`);
              }
            }
            // Format 3: Unicode emoji (🎮, 🎨, vb.)
            else {
              const cleanEmoji = button.emoji.trim();
              if (cleanEmoji) {
                buttonBuilder.setEmoji(cleanEmoji);
                console.log(`[INFO] Buton emoji eklendi (Unicode): ${cleanEmoji}`);
              }
            }
          }
          
          row.addComponents(buttonBuilder);
        }
        
        buttonRows.push(row);
      }

      // Menüleri oluştur (max 5 menü, her menü max 25 seçenek, sadece enabled olanlar ve enableMenu true ise)
      const menuRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
      const menus = config.enableMenu
        ? config.menus
            .filter(m => m.enabled) // Sadece enabled olanları al
            .slice(0, 5)
        : [];
      
      for (const menu of menus) {
        const menuBuilder = new StringSelectMenuBuilder()
          .setCustomId(`reaction_role_menu_${menu.id}`)
          .setPlaceholder(menu.placeholder || 'Rol seçin...')
          .setMinValues(menu.minValues)
          .setMaxValues(menu.maxValues);
        
        const options = menu.options
          .filter(o => o.enabled) // Sadece enabled olanları al
          .slice(0, 25)
          .sort((a, b) => a.orderIndex - b.orderIndex);
        
        // Duplicate kontrolü
        const usedValues = new Set<string>();
        let addedOptions = 0;

        for (const option of options) {
          const optionValue = `option_${option.id}_${option.roleId}`;
          
          // Duplicate kontrolü
          if (usedValues.has(optionValue)) {
            console.error(`[ERROR] Duplicate menu option value: ${optionValue} (option.id: ${option.id}, roleId: ${option.roleId})`);
            continue; // Bu seçeneği atla
          }
          usedValues.add(optionValue);
          
          // Discord.js StringSelectMenuOptionBuilder kullan
          const menuOptionBuilder = new StringSelectMenuOptionBuilder()
            .setLabel(option.label)
            .setValue(optionValue);
          
          if (option.description) {
            menuOptionBuilder.setDescription(option.description);
          }
          
          if (option.emoji) {
            // Discord emoji formatı kontrolü
            // Format 1: <:name:id> veya <a:name:id> (custom emoji)
            const customEmojiMatch = option.emoji.match(/<a?:(\w+):(\d+)>/);
            if (customEmojiMatch) {
              menuOptionBuilder.setEmoji({ 
                id: customEmojiMatch[2], 
                name: customEmojiMatch[1] 
              });
              console.log(`[INFO] Menü seçeneği emoji eklendi (Custom): ${customEmojiMatch[1]} (${customEmojiMatch[2]})`);
            } 
            // Format 2: :warning: veya :emoji_name: (Discord emoji formatı)
            // NOT: Discord API select menu option'larda :warning: formatını { name: 'warning' } olarak kabul etmiyor
            // Bu yüzden Unicode'a çevirip label'a ekliyoruz
            else if (option.emoji.startsWith(':') && option.emoji.endsWith(':')) {
              const emojiName = option.emoji.slice(1, -1).toLowerCase(); // :warning: -> warning
              const unicodeEmoji = DISCORD_EMOJI_TO_UNICODE[emojiName];
              if (unicodeEmoji) {
                // Unicode emoji'yi label'a ekle
                const currentLabel = menuOptionBuilder.data.label || option.label;
                menuOptionBuilder.setLabel(`${unicodeEmoji} ${currentLabel}`);
                console.log(`[INFO] Discord emoji Unicode'a çevrildi ve label'a eklendi: :${emojiName}: -> ${unicodeEmoji}`);
              } else {
                console.warn(`[WARN] Discord emoji için Unicode karşılığı bulunamadı: :${emojiName}: - Label'a eklenmedi`);
              }
            }
            // Format 3: Unicode emoji (🎮, 🎨, vb.)
            else {
              const cleanEmoji = option.emoji.trim();
              if (cleanEmoji) {
                // Unicode emoji'yi label'a ekle (Discord API limitasyonu)
                const currentLabel = menuOptionBuilder.data.label || option.label;
                menuOptionBuilder.setLabel(`${cleanEmoji} ${currentLabel}`);
                console.log(`[INFO] Unicode emoji label'a eklendi (menü seçeneği): ${cleanEmoji} ${currentLabel}`);
              }
            }
          }
          
          menuBuilder.addOptions(menuOptionBuilder);
          addedOptions++;
        }

        // Discord 0 seçenekli select menüyü reddeder; menüyü yalnızca seçenek varsa ekle.
        if (addedOptions > 0) {
          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menuBuilder);
          menuRows.push(row);
        }
      }

      // Mesajı gönder veya güncelle
      const components = [...buttonRows, ...menuRows];
      const messageOptions: any = {
        components: components.length > 0 ? components : undefined,
      };

      if (embed) {
        messageOptions.embeds = [embed];
      } else if (components.length === 0) {
        await interaction.editReply({ content: 'Gönderilecek içerik bulunamadı!' });
        return;
      }

      let sentMessage: any;
      
      // Eğer messageId varsa ve mesaj hâlâ mevcutsa, güncelle
      if (config.messageId && channel) {
        try {
          const existingMessage = await channel.messages.fetch(config.messageId);
          if (existingMessage) {
            await existingMessage.edit(messageOptions);
            sentMessage = existingMessage;
            console.log(`[INFO] Mevcut mesaj güncellendi: ${config.messageId}`);
          } else {
            // Mesaj bulunamadı, yeni mesaj gönder
            sentMessage = await channel.send(messageOptions);
          }
        } catch (error) {
          // Mesaj bulunamadı veya güncellenemedi, yeni mesaj gönder
          console.log(`[INFO] Mevcut mesaj bulunamadı veya güncellenemedi, yeni mesaj gönderiliyor: ${error}`);
          sentMessage = await channel.send(messageOptions);
        }
      } else {
        // Yeni mesaj gönder
        sentMessage = await channel.send(messageOptions);
      }
      
      if (!sentMessage) {
        await interaction.editReply({ content: 'Mesaj gönderilemedi!' });
        return;
      }

      // Emoji tepkilerini ekle (sadece enabled olanlar ve enableEmoji true ise)
      if (config.enableEmoji) {
        for (const emojiConfig of config.emojis) {
          // Enabled kontrolü
          if (!emojiConfig.enabled) {
            continue;
          }
        
        try {
          // Discord emoji formatı kontrolü
          // Format 1: <:name:id> veya <a:name:id> (custom emoji)
          const customEmojiMatch = emojiConfig.emoji.match(/<a?:(\w+):(\d+)>/);
          if (customEmojiMatch) {
            const emojiId = customEmojiMatch[2];
            const emoji = interaction.guild.emojis.cache.get(emojiId);
            if (emoji) {
              await sentMessage.react(emoji);
              console.log(`[INFO] Custom emoji eklendi: ${emoji.name} (${emoji.id})`);
            } else {
              console.error(`[ERROR] Custom emoji bulunamadı: ${emojiId}`);
            }
          } 
          // Format 2: :warning: veya :emoji_name: (Discord emoji formatı - Discord'da emoji adı bu)
          else if (emojiConfig.emoji.startsWith(':') && emojiConfig.emoji.endsWith(':')) {
            const emojiName = emojiConfig.emoji.slice(1, -1); // :warning: -> warning
            
            // Önce sunucudaki custom emoji'lerde ara
            let emoji = interaction.guild.emojis.cache.find(e => e.name === emojiName);
            
            // Bulunamazsa global emoji cache'de ara
            if (!emoji) {
              emoji = interaction.client.emojis.cache.find(e => e.name === emojiName);
            }
            
            if (emoji) {
              // Custom emoji bulundu
              await sentMessage.react(emoji);
              console.log(`[INFO] Custom emoji eklendi (Discord formatı): ${emoji.name} (${emoji.id})`);
            } else {
              // Discord'un standart emoji'leri için emoji adını direkt kullanmayı dene
              // Eğer bu da çalışmazsa Unicode karşılığını kullan
              try {
                // Discord API'de emoji adı direkt kullanılabilir (reaction için)
                await sentMessage.react(emojiName);
                console.log(`[INFO] Discord emoji adı ile eklendi: :${emojiName}:`);
              } catch (error) {
                // Eğer direkt ad çalışmazsa Unicode'a çevir
                const unicodeEmoji = DISCORD_EMOJI_TO_UNICODE[emojiName.toLowerCase()];
                if (unicodeEmoji) {
                  await sentMessage.react(unicodeEmoji);
                  console.log(`[INFO] Discord emoji Unicode'a çevrildi: :${emojiName}: -> ${unicodeEmoji}`);
                } else {
                  console.error(`[ERROR] Discord emoji bulunamadı ve Unicode karşılığı yok: :${emojiName}:`);
                }
              }
            }
          }
          // Format 3: Unicode emoji (🎮, 🎨, vb.)
          else {
            const cleanEmoji = emojiConfig.emoji.trim();
            if (cleanEmoji) {
              await sentMessage.react(cleanEmoji);
              console.log(`[INFO] Unicode emoji eklendi: ${cleanEmoji}`);
            } else {
              console.error(`[ERROR] Geçersiz emoji: ${emojiConfig.emoji}`);
            }
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

      await interaction.editReply({ content: `Tepki rol sistemi ${channel} kanalına gönderildi!` });
    } catch (error) {
      console.error('[ERROR] Tepki sistem gönder komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/tepkiSistemGonder:editReply', error, 'debug'));
    }
  },
};

