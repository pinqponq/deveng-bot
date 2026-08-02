import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { checkChannelPermission } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-reveal')
    .setDescription('Geçici ses kanalını gösterir'),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const permission = await checkChannelPermission(interaction, true);
      if (!permission.hasPermission || !permission.channel) {
        return;
      }

      const { channel } = permission;

      // Kanalı göster (herkese ViewChannel iznini ver)
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
        ViewChannel: true,
      });

      await interaction.editReply({ 
        content: '✅ Kanal gösterildi! Artık herkes görebilir.' 
      });
    } catch (error) {
      console.error('[ERROR] Voice-reveal komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceReveal:editReply', error, 'debug'));
    }
  },
};

