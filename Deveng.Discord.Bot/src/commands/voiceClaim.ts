import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags, type GuildMember } from 'discord.js';
import { getTemporaryChannelFromInteraction, transferTemporaryChannelOwnership } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-claim')
    .setDescription('Geçici ses kanalının sahipliğini talep eder'),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const channelData = await getTemporaryChannelFromInteraction(interaction);
      if (!channelData) {
        await interaction.editReply({ content: 'Bir geçici ses kanalında olmalısınız!' });
        return;
      }

      const { channel, tempChannel, lobby } = channelData;
      const member = interaction.member as GuildMember;

      // Kanalın sahibi var mı ve kanalda mı?
      const owner = await interaction.guild?.members.fetch(tempChannel.ownerId).catch((error) => { logError('commands/voiceClaim:fetchOwner', error, 'debug'); return null; });
      const ownerInChannel = owner?.voice?.channel?.id === tempChannel.channelId;

      if (ownerInChannel) {
        await interaction.editReply({
          content: 'Kanalın sahibi hala kanalda! Sahipliği talep edemezsiniz.'
        });
        return;
      }

      // API ownerId + Discord overwrite senkronu birlikte.
      const updated = await transferTemporaryChannelOwnership(channel, lobby, member.id, tempChannel.ownerId);
      if (!updated) {
        await interaction.editReply({ content: 'Sahiplik talep edilemedi. Lütfen tekrar deneyin.' });
        return;
      }

      await interaction.editReply({
        content: `✅ Kanal sahipliği **${member.user.tag}** kullanıcısına aktarıldı!`
      });
    } catch (error) {
      console.error('[ERROR] Voice-claim komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceClaim:editReply', error, 'debug'));
    }
  },
};

