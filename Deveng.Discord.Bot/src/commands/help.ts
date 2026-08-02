import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { parseHexColor } from '../utils/helpers';
import { sanitizeOptionalUrl } from '../utils/mentionSanitize';
import { getHelpCommandByName } from '../utils/apiClient';
import { checkHelpCommandPermissions, checkHelpCommandCooldown, setHelpCommandCooldown } from '../utils/helpCommandHandler';
import { logError } from '../utils/logger';

function isInteractionAlreadyAckedError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: number; rawError?: { code?: number } };
  return e.code === 40060 || e.rawError?.code === 40060;
}

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Yardım komutunu gösterir')
    .setDMPermission(false),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const deferred = await interaction
        .deferReply({ flags: MessageFlags.Ephemeral })
        .then(() => true)
        .catch((err: { code?: number }) => {
          if (err?.code === 10062 || err?.code === 40060) return false;
          throw err;
        });
      if (!deferred) return;

      if (!interaction.guild) {
        await interaction.editReply({ content: 'Bu komut sadece sunucularda kullanılabilir!' });
        return;
      }

      // Help komutunu API'den al
      const helpCommand = await getHelpCommandByName(interaction.guild.id, 'help');

      if (!helpCommand || !helpCommand.enabled) {
        await interaction.editReply({ content: 'Help komutu bulunamadı veya devre dışı!' });
        return;
      }

      // İzinleri kontrol et
      const hasPermission = await checkHelpCommandPermissions(interaction, helpCommand);
      if (!hasPermission) {
        await interaction.editReply({ content: 'Bu komutu kullanma yetkiniz yok!' });
        return;
      }

      // Cooldown kontrolü
      const canUse = await checkHelpCommandCooldown(interaction, helpCommand);
      if (!canUse) {
        return; // Cooldown mesajı zaten gönderildi
      }

      const description = helpCommand.description || 'Bu komut için açıklama bulunmamaktadır.';

      // Embed oluştur
      let embed: EmbedBuilder | null = null;
      if (helpCommand.isEmbed) {
        embed = new EmbedBuilder();
        
        if (helpCommand.embedTitle) {
          embed.setTitle(helpCommand.embedTitle);
        }
        
        if (helpCommand.embedDescription) {
          embed.setDescription(helpCommand.embedDescription);
        } else if (description) {
          embed.setDescription(description);
        }
        
        if (helpCommand.embedColor) {
          // Güvenli hex parse: geçersiz değerde (ör. "red") NaN → setColor(NaN) RangeError
          // fırlatırdı; parseHexColor NaN yerine güvenli bir varsayılana (Discord blurple) düşer.
          embed.setColor(parseHexColor(helpCommand.embedColor, 0x5865f2));
        }
        
        const helpThumb = sanitizeOptionalUrl(helpCommand.embedThumbnail);
        if (helpThumb) {
          embed.setThumbnail(helpThumb);
        }

        const helpImage = sanitizeOptionalUrl(helpCommand.embedImage);
        if (helpImage) {
          embed.setImage(helpImage);
        }
        
        if (helpCommand.embedFooter) {
          embed.setFooter({ text: helpCommand.embedFooter });
        }
      }

      const ackContent = 'İşlem tamamlandı.';

      // DM olarak gönder
      if (helpCommand.sendAsDM) {
        try {
          // Interaction zaten defer edildi; ilk yanıtı editReply ile veririz.
          await interaction.editReply({
            content: helpCommand.disableReply ? ackContent : 'Yardım mesajı özel mesajınıza gönderiliyor...',
          });

          if (embed) {
            await interaction.user.send({ embeds: [embed] });
          } else {
            await interaction.user.send(description);
          }

          if (!helpCommand.disableReply) {
            await interaction.editReply({ content: 'Yardım mesajı özel mesajınıza gönderildi!' });
          }
        } catch (error) {
          if (isInteractionAlreadyAckedError(error)) {
            return;
          }

          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: 'Özel mesaj gönderilemedi. Lütfen DM ayarlarınızı kontrol edin.',
              flags: MessageFlags.Ephemeral,
            }).catch((error) => logError('commands/help:reply', error, 'debug'));
          } else {
            await interaction.editReply({
              content: 'Özel mesaj gönderilemedi. Lütfen DM ayarlarınızı kontrol edin.',
            }).catch((error) => logError('commands/help:editReply', error, 'debug'));
          }
        }
      } else {
        // Slash interaction her zaman cevaplanmalı; disableReply olsa da sessiz kalma.
        if (embed && !helpCommand.disableReply) {
          await interaction.editReply({ embeds: [embed] });
        } else {
          await interaction.editReply({
            content: helpCommand.disableReply ? ackContent : description,
          });
        }
      }

      // Cooldown'u ayarla
      await setHelpCommandCooldown(interaction, helpCommand);

      console.log(`[INFO] Help command çalıştırıldı: help (GuildId: ${interaction.guild.id}, UserId: ${interaction.user.id})`);
    } catch (error) {
      console.error('[ERROR] Help command handler hatası:', error);
      if (isInteractionAlreadyAckedError(error)) {
        return;
      }
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/help:editReplyError', error, 'debug'));
      } else if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Bir hata oluştu!', flags: MessageFlags.Ephemeral }).catch((error) => logError('commands/help:replyError', error, 'debug'));
      }
    }
  },
};

