import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { checkChannelPermission } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-lock')
    .setDescription('Geçici ses kanalını kilitler'),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const permission = await checkChannelPermission(interaction, true);
      if (!permission.hasPermission || !permission.channel) {
        return;
      }

      const { channel } = permission;

      // Kanalı kilitle (herkese Connect iznini kaldır)
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
        Connect: false,
      });

      await interaction.editReply({ 
        content: '✅ Kanal kilitlendi! Artık kimse katılamaz.' 
      });
    } catch (error) {
      console.error('[ERROR] Voice-lock komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceLock:editReply', error, 'debug'));
    }
  },
};

