import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getTemporaryChannelFromInteraction } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-owner')
    .setDescription('Geçici ses kanalının sahibini gösterir'),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const channelData = await getTemporaryChannelFromInteraction(interaction);
      if (!channelData) {
        await interaction.editReply({ content: 'Bir geçici ses kanalında olmalısınız!' });
        return;
      }

      const { tempChannel } = channelData;
      const owner = await interaction.guild?.members.fetch(tempChannel.ownerId);

      if (!owner) {
        await interaction.editReply({ content: 'Kanal sahibi bulunamadı!' });
        return;
      }

      await interaction.editReply({ 
        content: `👤 Kanal sahibi: **${owner.user.tag}** (<@${owner.id}>)` 
      });
    } catch (error) {
      console.error('[ERROR] Voice-owner komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceOwner:editReply', error, 'debug'));
    }
  },
};

