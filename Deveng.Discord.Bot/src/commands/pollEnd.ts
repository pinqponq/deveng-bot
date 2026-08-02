import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { ensureMemberPermission } from '../utils/permissionGuards';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('poll-end')
    .setDescription('Mevcut kanalda aktif anketi sonlandırır')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir!', flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageMessages, 'Mesajları Yönet'))) return;

      // API'ye istek gönder
      const { getApiBaseUrl, getBotApiHeaders } = await import('../utils/apiClient');
      const apiBaseUrl = getApiBaseUrl();
      
      if (!apiBaseUrl) {
        await interaction.editReply({ content: 'API bağlantısı yapılandırılmamış!' });
        return;
      }

      // Aktif anketi bul
      const getActiveResponse = await fetch(`${apiBaseUrl}/api/Poll/channel/${interaction.channelId}/active`, {
        method: 'GET',
        headers: getBotApiHeaders(),
      });

      if (!getActiveResponse.ok || getActiveResponse.status === 404) {
        await interaction.editReply({ content: 'Bu kanalda aktif bir anket bulunamadı!' });
        return;
      }

      const poll = await getActiveResponse.json() as { id: number };

      // Anketi sonlandır
      const endResponse = await fetch(`${apiBaseUrl}/api/Poll/guild/${interaction.guild.id}/${poll.id}/end`, {
        method: 'POST',
        headers: getBotApiHeaders(),
      });

      if (!endResponse.ok) {
        const errorData = await endResponse.json().catch(() => ({ message: 'Bilinmeyen hata' })) as { message?: string };
        await interaction.editReply({ content: `Anket sonlandırılamadı: ${errorData.message || 'Bilinmeyen hata'}` });
        return;
      }

      // Sonuç mesajını gönder (bot'a HTTP isteği gönder)
      try {
        const sendResultResponse = await fetch(`${apiBaseUrl}/api/Poll/${poll.id}/send-result`, {
          method: 'POST',
          headers: getBotApiHeaders(),
        });

        if (!sendResultResponse.ok) {
          console.warn('[WARN] Sonuç mesajı gönderilemedi');
        }
      } catch (error) {
        console.warn('[WARN] Sonuç mesajı gönderilemedi:', error);
      }

      await interaction.editReply({ content: 'Anket başarıyla sonlandırıldı ve sonuçlar gönderildi!' });
    } catch (error) {
      console.error('[ERROR] Anket sonlandırma komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/pollEnd:editReply', error, 'debug'));
    }
  },
};

