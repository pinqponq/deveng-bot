import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { checkChannelPermission } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-unlock')
    .setDescription('Geçici ses kanalının kilidini açar'),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const permission = await checkChannelPermission(interaction, true);
      if (!permission.hasPermission || !permission.channel) {
        return;
      }

      const { channel } = permission;

      // Kanalın kilidini aç (herkese Connect iznini ver)
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
        Connect: true,
      });

      await interaction.editReply({ 
        content: '✅ Kanal kilidi açıldı! Artık herkes katılabilir.' 
      });
    } catch (error) {
      console.error('[ERROR] Voice-unlock komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceUnlock:editReply', error, 'debug'));
    }
  },
};

