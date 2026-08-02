import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { checkChannelPermission } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-hide')
    .setDescription('Geçici ses kanalını gizler'),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const permission = await checkChannelPermission(interaction, true);
      if (!permission.hasPermission || !permission.channel) {
        return;
      }

      const { channel } = permission;

      // Kanalı gizle (herkese ViewChannel iznini kaldır)
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
        ViewChannel: false,
      });

      await interaction.editReply({ 
        content: '✅ Kanal gizlendi! Artık kimse göremez.' 
      });
    } catch (error) {
      console.error('[ERROR] Voice-hide komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceHide:editReply', error, 'debug'));
    }
  },
};

