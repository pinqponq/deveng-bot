import { Message, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getHelpCommandByName } from './apiClient';
import { buildEmbedFromConfig, toEmbedConfig } from './buildEmbedFromConfig';

// Cooldown cache
interface CooldownEntry {
  timestamp: number;
  userId?: string;
}

const cooldownCache = new Map<string, CooldownEntry[]>();

/**
 * Help komutunu işler
 */
export async function handleHelpCommand(message: Message, commandName: string): Promise<void> {
  try {
    if (!message.guild || !message.member) {
      return;
    }

    // Help komutunu API'den al
    const helpCommand = await getHelpCommandByName(message.guild.id, commandName);
    
    // Komut bulunamadıysa veya aktif değilse, devam et
    if (!helpCommand || !helpCommand.enabled) {
      return;
    }

    // İzin kontrolü
    if (!await checkHelpCommandPermissionsMessage(message, helpCommand)) {
      return;
    }

    // Cooldown kontrolü
    if (!await checkHelpCommandCooldownMessage(message, helpCommand)) {
      return;
    }

    // Komut açıklamasını gönder
    const description = helpCommand.description || 'Bu komut için açıklama bulunmamaktadır.';

    const embedResult = helpCommand.isEmbed
      ? buildEmbedFromConfig(
          toEmbedConfig({
            isEmbed: true,
            embedTitle: helpCommand.embedTitle,
            embedTitleUrl: helpCommand.embedTitleUrl ?? null,
            embedDescription: helpCommand.embedDescription ?? description,
            embedColor: helpCommand.embedColor,
            embedAuthorName: helpCommand.embedAuthorName ?? null,
            embedAuthorIcon: helpCommand.embedAuthorIcon ?? null,
            embedAuthorUrl: helpCommand.embedAuthorUrl ?? null,
            embedThumbnail: helpCommand.embedThumbnail,
            embedImage: helpCommand.embedImage,
            embedFooter: helpCommand.embedFooter,
            embedFooterIcon: helpCommand.embedFooterIcon ?? null,
            embedUseTimestamp: helpCommand.embedUseTimestamp,
            embedFieldsJson: helpCommand.embedFieldsJson ?? null,
          }),
        )
      : null;
    const embed = embedResult?.embeds?.[0] ?? null;

    // Yanıtı gönder
    if (helpCommand.sendAsDM) {
      // Özel mesaj olarak gönder
      try {
        if (embed) {
          await message.author.send({ embeds: [embed] });
        } else {
          await message.author.send(description);
        }
        if (!helpCommand.disableReply) {
          await message.reply('✅ Yardım mesajı özel mesajlarınıza gönderildi!');
        }
      } catch (error) {
        // DM'ler kapalı olabilir
        if (!helpCommand.disableReply) {
          await message.reply('❌ Özel mesajlarınız kapalı olduğu için mesaj gönderilemedi!');
        }
      }
    } else {
      // Kanalda yanıt ver
      if (!helpCommand.disableReply) {
        if (embed) {
          await message.reply({ embeds: [embed] });
        } else {
          await message.reply(description);
        }
      } else {
        // Sadece mesaj gönder, yanıt verme
        if (message.channel && 'send' in message.channel) {
          if (embed) {
            await (message.channel as any).send({ embeds: [embed] });
          } else {
            await (message.channel as any).send(description);
          }
        }
      }
    }

    // Kullandıktan sonra komutu sil
    if (helpCommand.deleteAfterUse) {
      try {
        await message.delete();
      } catch (error) {
        console.error(`[ERROR] Help command mesajı silinemedi:`, error);
      }
    }

    // Cooldown'u kaydet
    await setHelpCommandCooldownMessage(message, helpCommand);

    console.log(`[INFO] Help command çalıştırıldı: ${commandName} (GuildId: ${message.guild.id}, UserId: ${message.author.id})`);
  } catch (error) {
    console.error('[ERROR] Help command handler hatası:', error);
  }
}

/**
 * Help komutu izinlerini kontrol eder (Message için)
 */
async function checkHelpCommandPermissionsMessage(message: Message, helpCommand: any): Promise<boolean> {
  try {
    if (!message.guild || !message.member) {
      return false;
    }

    // Rol izinleri kontrolü
    if (helpCommand.roleIds && helpCommand.roleIds.length > 0) {
      const userRoles = message.member.roles.cache.map(role => role.id);
      const hasRole = helpCommand.roleIds.some((roleId: string) => userRoles.includes(roleId));

      if (helpCommand.rolePermissionType === 0) {
        // Bu roller dışındaki tüm rolleri yok say
        if (!hasRole) {
          return false; // Kullanıcının bu rollerden biri yoksa, erişim reddedilir
        }
      } else {
        // Bu roller dışındaki tüm rollere izin ver
        if (hasRole) {
          return false; // Kullanıcının bu rollerden biri varsa, erişim reddedilir
        }
      }
    }

    // Kanal izinleri kontrolü
    if (helpCommand.channelIds && helpCommand.channelIds.length > 0) {
      const channelId = message.channel.id;
      const isInChannel = helpCommand.channelIds.includes(channelId);

      if (helpCommand.channelPermissionType === 0) {
        // Bu kanallar hariç diğer tüm kanallarda izin verme
        if (!isInChannel) {
          return false; // Kanal listede değilse, erişim reddedilir
        }
      } else {
        // Bu kanallar hariç tüm kanallara izin ver
        if (isInChannel) {
          return false; // Kanal listede ise, erişim reddedilir
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[ERROR] Help command permission check hatası:', error);
    return false;
  }
}

/**
 * Help komutu cooldown'unu kontrol eder (Message için)
 */
async function checkHelpCommandCooldownMessage(message: Message, helpCommand: any): Promise<boolean> {
  try {
    if (helpCommand.cooldownType === 0 || !helpCommand.cooldownSeconds) {
      // Cooldown yok
      return true;
    }

    const now = Date.now();
    const cacheKey = helpCommand.cooldownType === 1 
      ? `guild_${message.guild?.id}` // Sunucu cooldown
      : `user_${message.author.id}`; // Kullanıcı cooldown

    const entries = cooldownCache.get(cacheKey) || [];
    const validEntries = entries.filter(entry => 
      now - entry.timestamp < helpCommand.cooldownSeconds! * 1000
    );

    // Hala cooldown içindeyse
    if (validEntries.length > 0) {
      const remainingSeconds = Math.ceil(
        (helpCommand.cooldownSeconds * 1000 - (now - validEntries[0].timestamp)) / 1000
      );
      
      if (!helpCommand.disableReply) {
        await message.reply(`⏳ Bu komutu tekrar kullanmak için ${remainingSeconds} saniye beklemelisiniz!`);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('[ERROR] Help command cooldown check hatası:', error);
    return true; // Hata durumunda izin ver
  }
}

/**
 * Help komutu cooldown'unu ayarlar (Message için)
 */
async function setHelpCommandCooldownMessage(message: Message, helpCommand: any): Promise<void> {
  try {
    if (helpCommand.cooldownType === 0 || !helpCommand.cooldownSeconds) {
      // Cooldown yok
      return;
    }

    const now = Date.now();
    const cacheKey = helpCommand.cooldownType === 1 
      ? `guild_${message.guild?.id}` // Sunucu cooldown
      : `user_${message.author.id}`; // Kullanıcı cooldown

    const entries = cooldownCache.get(cacheKey) || [];
    entries.push({
      timestamp: now,
      userId: helpCommand.cooldownType === 2 ? message.author.id : undefined,
    });

    cooldownCache.set(cacheKey, entries);

    // Eski entry'leri temizle (cooldown süresinden 2 kat fazla)
    setTimeout(() => {
      const cached = cooldownCache.get(cacheKey);
      if (cached) {
        const validEntries = cached.filter(entry => 
          Date.now() - entry.timestamp < helpCommand.cooldownSeconds! * 2000
        );
        if (validEntries.length === 0) {
          cooldownCache.delete(cacheKey);
        } else {
          cooldownCache.set(cacheKey, validEntries);
        }
      }
    }, helpCommand.cooldownSeconds * 2000);
  } catch (error) {
    console.error('[ERROR] Help command cooldown set hatası:', error);
  }
}

/**
 * Help komutu izinlerini kontrol eder (Interaction için)
 */
export async function checkHelpCommandPermissions(interaction: ChatInputCommandInteraction, helpCommand: any): Promise<boolean> {
  try {
    if (!interaction.guild || !interaction.member) {
      return false;
    }

    const member = interaction.member;
    if (!('roles' in member)) {
      return false;
    }

    // Rol izinleri kontrolü
    if (helpCommand.roleIds && helpCommand.roleIds.length > 0) {
      const userRoles = (member.roles as any).cache?.map((role: any) => role.id) || [];
      const hasRole = helpCommand.roleIds.some((roleId: string) => userRoles.includes(roleId));

      if (helpCommand.rolePermissionType === 0) {
        // Bu roller dışındaki tüm rolleri yok say
        if (!hasRole) {
          return false;
        }
      } else {
        // Bu roller dışındaki tüm rollere izin ver
        if (hasRole) {
          return false;
        }
      }
    }

    // Kanal izinleri kontrolü
    if (helpCommand.channelIds && helpCommand.channelIds.length > 0) {
      const channelId = interaction.channel?.id;
      if (!channelId) return false;
      
      const isInChannel = helpCommand.channelIds.includes(channelId);

      if (helpCommand.channelPermissionType === 0) {
        // Bu kanallar hariç diğer tüm kanallarda izin verme
        if (!isInChannel) {
          return false;
        }
      } else {
        // Bu kanallar hariç tüm kanallara izin ver
        if (isInChannel) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[ERROR] Help command permission check hatası:', error);
    return false;
  }
}

/**
 * Help komutu cooldown'unu kontrol eder (Interaction için)
 */
export async function checkHelpCommandCooldown(interaction: ChatInputCommandInteraction, helpCommand: any): Promise<boolean> {
  try {
    if (helpCommand.cooldownType === 0 || !helpCommand.cooldownSeconds) {
      return true;
    }

    const now = Date.now();
    const cacheKey = helpCommand.cooldownType === 1 
      ? `guild_${interaction.guild?.id}`
      : `user_${interaction.user.id}`;

    const entries = cooldownCache.get(cacheKey) || [];
    const validEntries = entries.filter(entry => 
      now - entry.timestamp < helpCommand.cooldownSeconds! * 1000
    );

    if (validEntries.length > 0) {
      const remainingSeconds = Math.ceil(
        (helpCommand.cooldownSeconds * 1000 - (now - validEntries[0].timestamp)) / 1000
      );
      
      if (!helpCommand.disableReply) {
        const notice = `⏳ Bu komutu tekrar kullanmak için ${remainingSeconds} saniye beklemelisiniz!`;
        // help.ts erken defer ettiği için editReply kullanılır; defer yoksa reply'e düşeriz.
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({ content: notice });
        } else if (!interaction.replied) {
          await interaction.reply({ content: notice, flags: MessageFlags.Ephemeral });
        }
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('[ERROR] Help command cooldown check hatası:', error);
    return true;
  }
}

/**
 * Help komutu cooldown'unu ayarlar (Interaction için)
 */
export async function setHelpCommandCooldown(interaction: ChatInputCommandInteraction, helpCommand: any): Promise<void> {
  try {
    if (helpCommand.cooldownType === 0 || !helpCommand.cooldownSeconds) {
      return;
    }

    const now = Date.now();
    const cacheKey = helpCommand.cooldownType === 1 
      ? `guild_${interaction.guild?.id}`
      : `user_${interaction.user.id}`;

    const entries = cooldownCache.get(cacheKey) || [];
    entries.push({
      timestamp: now,
      userId: helpCommand.cooldownType === 2 ? interaction.user.id : undefined,
    });

    cooldownCache.set(cacheKey, entries);

    setTimeout(() => {
      const cached = cooldownCache.get(cacheKey);
      if (cached) {
        const validEntries = cached.filter(entry => 
          Date.now() - entry.timestamp < helpCommand.cooldownSeconds! * 2000
        );
        if (validEntries.length === 0) {
          cooldownCache.delete(cacheKey);
        } else {
          cooldownCache.set(cacheKey, validEntries);
        }
      }
    }, helpCommand.cooldownSeconds * 2000);
  } catch (error) {
    console.error('[ERROR] Help command cooldown set hatası:', error);
  }
}

