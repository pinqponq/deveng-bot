import { ModalSubmitInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import { getApiBaseUrl, apiRequest, getBirthdaySettings } from '../utils/apiClient';
import { parseHexColor } from '../utils/helpers';
import { sanitizeOptionalUrl } from '../utils/mentionSanitize';
import { logError } from '../utils/logger';

export async function handleBirthdayModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
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

    // Modal'dan değerleri al
    const dayStr = interaction.fields.getTextInputValue('birthday_day').trim();
    const monthStr = interaction.fields.getTextInputValue('birthday_month').trim();
    const yearStr = interaction.fields.getTextInputValue('birthday_year').trim();

    // Tarih parse et (gün, ay, yıl)
    let birthDate: Date;
    try {
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);

      // Validasyon - önce sayı kontrolü
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        await interaction.editReply({ content: '❌ Lütfen geçerli sayılar girin! (Gün: 1-31, Ay: 1-12, Yıl: 1900-şimdi)' });
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

      // Yıl validasyonu
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear) {
        await interaction.editReply({ content: `❌ Geçersiz yıl! Lütfen 1900-${currentYear} arası bir yıl girin. (Girdiğiniz: ${year})` });
        return;
      }

      // Ay bazlı gün kontrolü (örneğin Şubat'ta 30 gün olamaz)
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) {
        await interaction.editReply({ content: `❌ ${month}. ay ${daysInMonth} gün çeker! Lütfen 1-${daysInMonth} arası bir gün girin. (Girdiğiniz: ${day})` });
        return;
      }

      // UTC'de Date oluştur (saat 00:00:00 UTC) - timezone sorununu önlemek için
      birthDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

      // Gelecek tarih kontrolü (UTC'de bugünün başlangıcı ile karşılaştır)
      const todayUTC = new Date(Date.now());
      const todayStartUTC = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate(), 0, 0, 0));
      if (birthDate.getTime() > todayStartUTC.getTime()) {
        await interaction.editReply({ content: '❌ Doğum tarihi gelecekte olamaz!' });
        return;
      }
    } catch (error) {
      await interaction.editReply({ 
        content: '❌ Geçersiz tarih formatı! Lütfen geçerli değerler girin.' 
      });
      return;
    }

    // API'ye istek gönder
    try {
      const birthdayUser = await apiRequest<{ id: number; birthDate: string }>('/api/Birthday/users', {
        method: 'POST',
        body: JSON.stringify({
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          birthDate: birthDate.toISOString(),
        }),
      });

      if (!birthdayUser) {
        await interaction.editReply({ content: '❌ Doğum günü eklenemedi!' });
        return;
      }

      // BirthdaySettings'i al (web'den ayarlanan şablonu kullan)
      const settings = await getBirthdaySettings(interaction.guild.id);
      
      const formattedDate = new Date(birthdayUser.birthDate).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Tag replacement için placeholder'lar
      const placeholders: Record<string, string> = {
        user: interaction.user.username,
        username: interaction.user.username,
        userid: interaction.user.id,
        usermention: `<@${interaction.user.id}>`,
        birthday: formattedDate,
        birthdate: formattedDate,
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

      // Web'den ayarlanan şablonu kullan (createMessage ayarları öncelikli)
      if (settings && (settings.createMessageIsEmbed || settings.createMessage || settings.createEmbedTitle || settings.createEmbedDescription)) {
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
          
          // Geçersiz kullanıcı URL'i tüm embed'i "Invalid Form Body" ile çökertir; doğrula.
          const bdThumb = settings.createEmbedThumbnail
            ? sanitizeOptionalUrl(replaceTags(settings.createEmbedThumbnail))
            : null;
          embed.setThumbnail(bdThumb ?? interaction.user.displayAvatarURL());

          if (settings.createEmbedImage) {
            const bdImage = sanitizeOptionalUrl(replaceTags(settings.createEmbedImage));
            if (bdImage) embed.setImage(bdImage);
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
            : `✅ Doğum gününüz başarıyla eklendi!\n\n**Doğum Tarihi:** ${formattedDate}\n\nDoğum gününüzde size özel mesaj gönderilecek! 🎉`;
          
          await interaction.editReply({ content: messageText });
        }
      } else {
        // Varsayılan mesaj (ayarlar yoksa)
        await interaction.editReply({
          content: `✅ Doğum gününüz başarıyla eklendi!\n\n**Doğum Tarihi:** ${formattedDate}\n\nDoğum gününüzde size özel mesaj gönderilecek! 🎉`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      await interaction.editReply({ content: `❌ Doğum günü eklenemedi: ${errorMessage}` });
      return;
    }
  } catch (error) {
    console.error('[ERROR] Birthday modal submit hatası:', error);
    await interaction.editReply({ content: '❌ Bir hata oluştu! Lütfen tekrar deneyin.' }).catch((error) => logError('birthdayModalHandler:modalSubmitErrorReply', error, 'debug'));
  }
}
