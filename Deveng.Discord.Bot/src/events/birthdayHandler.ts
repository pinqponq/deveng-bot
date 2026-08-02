import { Client, EmbedBuilder } from 'discord.js';
import { getBirthdaySettings, getBirthdayUsersByDate, markBirthdayUserCelebrated } from '../utils/apiClient';
import { getTextChannel } from '../utils/channelHelper';
import { sendMessage } from '../utils/messageSender';
import { EMBED_COLOR_WELCOME } from '../utils/constants';
import { buildSingleEmbedFromConfig, toEmbedConfig } from '../utils/buildEmbedFromConfig';
import { logError } from '../utils/logger';

// Bugün mesaj gönderilen kullanıcıları takip et (guildId:userId formatında)
const sentToday = new Set<string>();
let lastCheckedDate = new Date().toDateString();
// Doğum günü kutlaması saat bazlıdır (guild.checkHour, 0-23). Aynı saat içinde defalarca
// DB/API sorgusu yapmak gereksiz yük + Pinqloq log gürültüsü üretir. Her saate bir kez tara.
let lastProcessedHour = -1;

export async function birthdaySweepCore(
  client: Client,
  skipGuild?: (guildId: string) => boolean
): Promise<void> {
  try {
    const today = new Date();
    const todayString = today.toDateString();
    const month = today.getMonth() + 1; // JavaScript'te ay 0-11 arası, SQL'de 1-12
    const day = today.getDate();

    // Eğer tarih değiştiyse, gönderilen kullanıcı listesini temizle
    if (todayString !== lastCheckedDate) {
      sentToday.clear();
      lastCheckedDate = todayString;
      lastProcessedHour = -1;
      console.log('[INFO] Yeni gün başladı, doğum günü kontrol listesi temizlendi.');
    }

    // Saat başına en fazla bir DB sorgusu.
    const currentHour = today.getHours();
    if (currentHour === lastProcessedHour) {
      return;
    }

    // Bugün doğum günü olan kullanıcıları getir
    const birthdayUsers = await getBirthdayUsersByDate(month, day);
    lastProcessedHour = currentHour;

    if (!birthdayUsers || birthdayUsers.length === 0) {
      return;
    }

    // Guild'lere göre grupla
    const usersByGuild = new Map<string, typeof birthdayUsers>();
    for (const user of birthdayUsers) {
      if (!usersByGuild.has(user.guildId)) {
        usersByGuild.set(user.guildId, []);
      }
      usersByGuild.get(user.guildId)!.push(user);
    }

    // Her guild için mesaj gönder
    for (const [guildId, users] of usersByGuild.entries()) {
      try {
        if (skipGuild?.(guildId)) continue;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          console.error(`[ERROR] Guild bulunamadı: ${guildId}`);
          continue;
        }

        // Settings'i getir
        const settings = await getBirthdaySettings(guildId);
        if (!settings || !settings.enabled || !settings.channelId) {
          continue;
        }

        // Sadece ayarlanan saatte kutlama gönder (CheckHour: 0-23)
        const currentHour = new Date().getHours();
        if (settings.checkHour != null && settings.checkHour !== undefined && currentHour !== settings.checkHour) {
          continue;
        }

        const channel = getTextChannel(guild, settings.channelId);
        if (!channel) {
          console.error(`[ERROR] Doğum günü kanalı bulunamadı: ${settings.channelId}`);
          continue;
        }

        // Her kullanıcı için mesaj gönder
        for (const user of users) {
          try {
            // Bugün bu kullanıcı için mesaj gönderildi mi kontrol et
            const userKey = `${guildId}:${user.userId}`;
            if (sentToday.has(userKey)) {
              console.log(`[INFO] ${user.userId} için doğum günü mesajı bugün zaten gönderildi, atlanıyor.`);
              continue;
            }

            const member = await guild.members.fetch(user.userId).catch((error) => {
              logError('birthdayHandler:memberFetch', error, 'debug');
              return null;
            });
            if (!member) {
              console.error(`[ERROR] Kullanıcı bulunamadı: ${user.userId}`);
              continue;
            }

            // Rol ver (eğer ayarlanmışsa)
            if (settings.roleId) {
              try {
                const role = await guild.roles.fetch(settings.roleId);
                if (!role) {
                  console.error(`[ERROR] Rol bulunamadı: ${settings.roleId}`);
                } else if (member.roles.cache.has(settings.roleId)) {
                  console.log(`[INFO] ${member.user.tag} zaten ${role.name} rolüne sahip.`);
                } else {
                  // Bot'un rolünü kontrol et
                  const botMember = await guild.members.fetch(client.user!.id);
                  const botRole = botMember.roles.highest;
                  
                  // Bot'un rol pozisyonu, verilecek rolden yüksek olmalı
                  if (botRole.position <= role.position) {
                    console.error(`[ERROR] Bot'un rolü (${botRole.name}) verilecek rolden (${role.name}) daha yüksek değil. Rol pozisyonu: Bot=${botRole.position}, Hedef=${role.position}`);
                  } else if (!botMember.permissions.has('ManageRoles')) {
                    console.error(`[ERROR] Bot'un "Manage Roles" yetkisi yok.`);
                  } else {
                    await member.roles.add(role);
                    console.log(`[INFO] ${member.user.tag} için doğum günü rolü verildi: ${role.name}`);
                  }
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('Missing Permissions') || errorMessage.includes('50013')) {
                  console.error(`[ERROR] Rol verilemedi - Bot'un yetkisi yok veya rol pozisyonu yetersiz (${settings.roleId}). Bot'un rolü verilecek rolden daha yüksek olmalı ve "Manage Roles" yetkisine sahip olmalı.`);
                } else {
                  console.error(`[ERROR] Rol verilemedi (${settings.roleId}):`, error);
                }
              }
            }

            // Mesaj oluştur
            let messageContent: string | EmbedBuilder;
            
            // Yaş hesapla
            const today = new Date();
            const birthDate = new Date(user.birthDate);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            
            // Tag replacement için placeholder'lar
            const placeholders: Record<string, string> = {
              user: `<@${member.user.id}>`,
              username: member.user.username,
              userid: member.user.id,
              usermention: `<@${member.user.id}>`,
              age: age.toString(),
              birthday: `${birthDate.getDate().toString().padStart(2, '0')}/${(birthDate.getMonth() + 1).toString().padStart(2, '0')}`,
              server: guild.name,
              servername: guild.name,
              timestamp: new Date().toLocaleString('tr-TR'),
            };
            
            // Tag replacement fonksiyonu
            const replaceTags = (text: string): string => {
              let result = text;
              for (const [key, value] of Object.entries(placeholders)) {
                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
              }
              return result;
            };
            
            if (settings.isEmbed) {
              const footerText = settings.embedFooter ?? guild.name;
              const footerIcon =
                settings.embedFooterIcon ??
                (settings.embedFooter ? null : guild.iconURL());

              messageContent = buildSingleEmbedFromConfig(
                toEmbedConfig({
                  isEmbed: true,
                  embedTitle: settings.embedTitle ?? null,
                  embedTitleUrl: settings.embedTitleUrl ?? null,
                  embedDescription: settings.embedDescription ?? settings.message,
                  embedColor: settings.embedColor ?? null,
                  embedAuthorName: settings.embedAuthorName ?? null,
                  embedAuthorIcon: settings.embedAuthorIcon ?? null,
                  embedAuthorUrl: settings.embedAuthorUrl ?? null,
                  embedThumbnail: settings.embedThumbnail ?? member.user.displayAvatarURL(),
                  embedImage: settings.embedImage ?? null,
                  embedFooter: footerText,
                  embedFooterIcon: footerIcon,
                  embedUseTimestamp: settings.embedUseTimestamp,
                  embedFieldsJson: settings.embedFieldsJson ?? null,
                }),
                {
                  replaceTags,
                  defaultColor: EMBED_COLOR_WELCOME,
                },
              );
            } else {
              // Normal mesaj
              const message = settings.message || '{user} doğum günün kutlu olsun! 🎉';
              messageContent = replaceTags(message);
            }

            // Mesajı gönder
            await sendMessage(channel, messageContent, settings.isEmbed, 'Doğum günü mesajı gönderilemedi');
            
            // Gönderildi olarak işaretle (bellek + veritabanı; bu yıl tekrar gönderilmez)
            sentToday.add(userKey);
            try {
              await markBirthdayUserCelebrated(guildId, user.userId);
            } catch (err) {
              console.error(`[ERROR] Doğum günü kutlandı işaretlenemedi (${member.user.tag}):`, err);
            }
            
            console.log(`[INFO] ${member.user.tag} için doğum günü mesajı gönderildi (Sunucu: ${guildId})`);
          } catch (error) {
            console.error(`[ERROR] Kullanıcı için doğum günü mesajı gönderilemedi (${user.userId}):`, error);
          }
        }
      } catch (error) {
        console.error(`[ERROR] Guild için doğum günü mesajları gönderilemedi (${guildId}):`, error);
      }
    }
  } catch (error) {
    console.error('[ERROR] Doğum günü kontrolü hatası:', error);
  }
}

/** Shard-aware doğum günü taraması — API çağrısı shard başına bir kez çalışır (ölçek için kabul edilebilir maliyet). */
export async function checkAndSendBirthdayMessages(
  client: Client,
  skipGuild?: (guildId: string) => boolean
): Promise<void> {
  if (!client.shard) {
    await birthdaySweepCore(client, skipGuild);
    return;
  }
  await client.shard.broadcastEval(async (inner: Client) => {
    const { customBotManager } = await import('../utils/customBotManager.js');
    const { birthdaySweepCore: sweep } = await import('./birthdayHandler.js');
    await sweep(inner, (gid) => customBotManager.isGuildHandledByCustomBot(gid));
  });
}
