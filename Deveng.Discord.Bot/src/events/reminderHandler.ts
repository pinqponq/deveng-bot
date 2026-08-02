import { ModalSubmitInteraction, TextChannel, MessageFlags, Client, EmbedBuilder } from 'discord.js';
import { getApiBaseUrl, apiRequest, getReminderSettings } from '../utils/apiClient';
import { parseHexColor } from '../utils/helpers';
import { sanitizeOptionalUrl } from '../utils/mentionSanitize';
import { dispatchReminderForShard } from './reminderShardDispatch';
import { logError } from '../utils/logger';

export async function handleReminderModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  try {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir!', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      await interaction.editReply({ content: 'API bağlantısı yapılandırılmamış!' });
      return;
    }

    // Kanal ID'yi customId'den veya interaction'dan al
    let channelId: string;
    if (interaction.customId.includes(':')) {
      // customId formatı: reminder_create_modal:channelId
      channelId = interaction.customId.split(':')[1];
    } else {
      // Fallback: interaction'dan kanal ID'yi al
      if (!interaction.channel || !interaction.channel.isTextBased()) {
        await interaction.editReply({ content: 'Geçersiz kanal! Bu komut sadece metin kanallarında kullanılabilir.' });
        return;
      }
      channelId = interaction.channel.id;
    }

    // Kanal kontrolü
    let channel: TextChannel | null = null;
    try {
      const channelObj = interaction.guild.channels.cache.get(channelId);
      if (!channelObj || !channelObj.isTextBased()) {
        await interaction.editReply({ content: 'Geçersiz kanal! Lütfen komutu bir metin kanalında kullanın.' });
        return;
      }
      channel = channelObj as TextChannel;
    } catch (error) {
      await interaction.editReply({ content: 'Kanal bulunamadı!' });
      return;
    }

    // Modal'dan değerleri al
    const dayStr = interaction.fields.getTextInputValue('reminder_day').trim();
    const monthStr = interaction.fields.getTextInputValue('reminder_month').trim();
    const hourStr = interaction.fields.getTextInputValue('reminder_hour').trim();
    const minuteStr = interaction.fields.getTextInputValue('reminder_minute').trim();
    const message = interaction.fields.getTextInputValue('reminder_message').trim();

    // Tarih parse et (gün, ay, saat, dakika - yıl current year)
    let remindDate: Date;
    try {
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      const currentYear = new Date().getFullYear();

      // Validasyon - önce sayı kontrolü
      if (isNaN(day) || isNaN(month) || isNaN(hour) || isNaN(minute)) {
        await interaction.editReply({ content: '❌ Lütfen geçerli sayılar girin! (Gün: 1-31, Ay: 1-12, Saat: 0-23, Dakika: 0-59)' });
        return;
      }

      // Gün validasyonu (1-31)
      if (day < 1 || day > 31) {
        await interaction.editReply({ content: `❌ Geçersiz gün! Lütfen 1-31 arası bir gün girin. (Girdiğiniz: ${day})` });
        return;
      }

      // Ay validasyonu (1-12)
      if (month < 1 || month > 12) {
        await interaction.editReply({ content: `❌ Geçersiz ay! Lütfen 1-12 arası bir ay girin. (Girdiğiniz: ${month})` });
        return;
      }

      // Saat validasyonu (0-23)
      if (hour < 0 || hour > 23) {
        await interaction.editReply({ content: `❌ Geçersiz saat! Lütfen 0-23 arası bir saat girin. (Girdiğiniz: ${hour})` });
        return;
      }

      // Dakika validasyonu (0-59)
      if (minute < 0 || minute > 59) {
        await interaction.editReply({ content: `❌ Geçersiz dakika! Lütfen 0-59 arası bir dakika girin. (Girdiğiniz: ${minute})` });
        return;
      }

      // Girdi TRT (UTC+3) olarak yorumlanır.
      const pad2 = (n: number) => n.toString().padStart(2, '0');
      const buildTrDate = (year: number): Date =>
        new Date(`${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00+03:00`);

      // Geçmişe düşen tarih gelecek yıla taşınır.
      let effectiveYear = currentYear;
      let candidate = buildTrDate(effectiveYear);
      if (!isNaN(candidate.getTime()) && candidate.getTime() <= Date.now()) {
        effectiveYear = currentYear + 1;
        candidate = buildTrDate(effectiveYear);
      }

      const daysInMonth = new Date(effectiveYear, month, 0).getDate();
      if (day > daysInMonth) {
        await interaction.editReply({ content: `❌ ${month}. ay ${daysInMonth} gün çeker! Lütfen 1-${daysInMonth} arası bir gün girin. (Girdiğiniz: ${day})` });
        return;
      }

      remindDate = candidate;
      if (isNaN(remindDate.getTime())) {
        await interaction.editReply({ content: '❌ Geçersiz tarih/saat! Lütfen değerleri kontrol edin.' });
        return;
      }

      // Debug log
      console.log(
        `[DEBUG] Hatırlatıcı oluşturuluyor (TRT) - Gün: ${day}, Ay: ${month}, Yıl: ${effectiveYear}, Saat: ${hour}, Dakika: ${minute}, ISO: ${remindDate.toISOString()}, TR: ${remindDate.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`
      );

      if (remindDate.getTime() <= Date.now()) {
        await interaction.editReply({ content: '❌ Hatırlatma tarihi gelecekte olmalıdır!' });
        return;
      }
    } catch (error) {
      await interaction.editReply({ 
        content: '❌ Geçersiz tarih formatı! Lütfen geçerli değerler girin.' 
      });
      return;
    }

    // ReminderSettings'i al (default embed ayarı için)
    const settings = await getReminderSettings(interaction.guild.id);
    
    // Embed kontrolü - defaultIsEmbed ayarını kullan
    const isEmbed = settings?.defaultIsEmbed ?? false;

    // API'ye istek gönder
    try {
      const reminder = await apiRequest<{ id: number; remindDate: string }>('/api/Reminder', {
        method: 'POST',
        body: JSON.stringify({
          guildId: interaction.guild.id,
          channelId: channel.id,
          userId: interaction.user.id,
          remindDate: remindDate.toISOString(),
          isEmbed: isEmbed,
          message: isEmbed ? null : message,
          embedTitle: isEmbed ? message : null,
          embedDescription: isEmbed ? null : null,
          embedColor: isEmbed ? '#5865F2' : null,
          embedThumbnail: null,
          embedImage: null,
          embedFooter: null,
        }),
      });

      if (!reminder) {
        await interaction.editReply({ content: '❌ Hatırlatıcı oluşturulamadı!' });
        return;
      }

      // Hatırlatıcı oluşturuldu mesajını gönder (web'den ayarlanan şablonu kullan)
      const formattedDate = new Date(reminder.remindDate).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Tag replacement için placeholder'lar
      const placeholders: Record<string, string> = {
        user: interaction.user.username,
        username: interaction.user.username,
        userid: interaction.user.id,
        usermention: `<@${interaction.user.id}>`,
        reminderid: reminder.id.toString(),
        channel: channel.name,
        channelmention: `<#${channel.id}>`,
        reminddate: formattedDate.split(' ')[0],
        remindtime: formattedDate.split(' ')[1] || '',
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        timestamp: new Date().toLocaleString('tr-TR'),
      };

      const replaceTags = (text: string): string => {
        if (!text) return '';
        let result = text;
        for (const [key, value] of Object.entries(placeholders)) {
          result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return result;
      };

      // Web'den ayarlanan şablonu kullan
      if (settings) {
        if (settings.createMessageIsEmbed) {
          // Embed mesaj gönder
          const embed = new EmbedBuilder();
          
          if (settings.createEmbedTitle) {
            embed.setTitle(replaceTags(settings.createEmbedTitle));
          }
          
          if (settings.createEmbedDescription) {
            const description = replaceTags(settings.createEmbedDescription).replace(/\\n/g, '\n');
            embed.setDescription(description);
          } else if (settings.createMessage) {
            const description = replaceTags(settings.createMessage).replace(/\\n/g, '\n');
            embed.setDescription(description);
          }
          
          embed.setColor(parseHexColor(settings.createEmbedColor, 0x5865F2));
          
          if (settings.createEmbedThumbnail) {
            const rThumb = sanitizeOptionalUrl(replaceTags(settings.createEmbedThumbnail));
            if (rThumb) embed.setThumbnail(rThumb);
          }

          if (settings.createEmbedImage) {
            const rImage = sanitizeOptionalUrl(replaceTags(settings.createEmbedImage));
            if (rImage) embed.setImage(rImage);
          }
          
          if (settings.createEmbedFooter) {
            embed.setFooter({ text: replaceTags(settings.createEmbedFooter) });
          }
          
          embed.setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        } else {
          // Normal mesaj gönder
          const messageText = settings.createMessage 
            ? replaceTags(settings.createMessage)
            : `✅ Hatırlatıcı başarıyla oluşturuldu!\n\n**ID:** ${reminder.id}\n**Kanal:** ${channel}\n**Tarih:** ${formattedDate}\n**Mesaj:** ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;
          
          await interaction.editReply({ content: messageText });
        }
      } else {
        // Varsayılan mesaj (ayarlar yoksa)
        await interaction.editReply({
          content: `✅ Hatırlatıcı başarıyla oluşturuldu!\n\n**ID:** ${reminder.id}\n**Kanal:** ${channel}\n**Tarih:** ${formattedDate}\n**Mesaj:** ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      await interaction.editReply({ content: `❌ Hatırlatıcı oluşturulamadı: ${errorMessage}` });
      return;
    }
  } catch (error) {
    console.error('[ERROR] Reminder modal submit hatası:', error);
    await interaction.editReply({ content: '❌ Bir hata oluştu! Lütfen tekrar deneyin.' }).catch((error) => logError('reminderHandler:modalSubmitErrorReply', error, 'debug'));
  }
}

export async function checkAndSendReminders(
  client: Client,
  skipGuild?: (guildId: string) => boolean
): Promise<void> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      console.error('[ERROR] API bağlantısı yapılandırılmamış!');
      return;
    }

    // API'den pending reminder'ları al
    const reminders = await apiRequest<Array<{
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
      embedThumbnail: string | null;
      embedImage: string | null;
      embedFooter: string | null;
    }>>('/api/Reminder/pending', {
      method: 'GET',
    });

    if (!reminders || reminders.length === 0) {
      return;
    }

    console.log(`[DEBUG] ${reminders.length} adet bekleyen hatırlatıcı bulundu.`);

    const now = new Date();
    
    // Zamanı gelmiş reminder'ları işle
    for (const reminder of reminders) {
      try {
        if (skipGuild?.(reminder.guildId)) continue;
        const remindDate = new Date(reminder.remindDate);
        if (remindDate.getTime() > now.getTime()) {
          continue;
        }

        const { tryReminderDispatchDedupe } = await import('../utils/redisCache');
        const dispatchOk = await tryReminderDispatchDedupe(`reminder:${reminder.id}`, 180);
        if (!dispatchOk) {
          console.warn(`[Reminder] Cron dedupe skip — reminderId=${reminder.id} (başka süreç/tick teslim ediyor).`);
          continue;
        }

        await dispatchReminderForShard(client, reminder, skipGuild);
      } catch (error) {
        console.error(`[ERROR] Hatırlatıcı gönderilemedi (ID: ${reminder.id}):`, error);
      }
    }
  } catch (error) {
    console.error('[ERROR] Hatırlatıcı kontrolü hatası:', error);
  }
}
