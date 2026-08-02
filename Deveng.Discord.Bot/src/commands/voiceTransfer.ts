import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { checkChannelPermission, transferTemporaryChannelOwnership } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-transfer')
    .setDescription('Geçici ses kanalının sahipliğini aktarır')
    .addUserOption(option =>
      option
        .setName('kullanıcı')
        .setDescription('Sahipliği aktarılacak kullanıcı')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const permission = await checkChannelPermission(interaction, true);
      if (!permission.hasPermission || !permission.channel || !permission.tempChannel || !permission.lobby) {
        return;
      }

      const targetUser = interaction.options.getUser('kullanıcı', true);
      const { channel, tempChannel, lobby } = permission;

      // Hedef kullanıcı kanalda mı?
      const targetMember = await interaction.guild?.members.fetch(targetUser.id);
      if (!targetMember?.voice?.channel || targetMember.voice.channel.id !== channel.id) {
        await interaction.editReply({ content: 'Hedef kullanıcı kanalda olmalı!' });
        return;
      }

      // API ownerId + Discord overwrite senkronu.
      const updated = await transferTemporaryChannelOwnership(channel, lobby, targetUser.id, tempChannel.ownerId);
      if (!updated) {
        await interaction.editReply({ content: 'Sahiplik aktarılamadı. Lütfen tekrar deneyin.' });
        return;
      }

      await interaction.editReply({
        content: `✅ Kanal sahipliği **${targetUser.tag}** kullanıcısına aktarıldı!`
      });
    } catch (error) {
      console.error('[ERROR] Voice-transfer komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceTransfer:editReply', error, 'debug'));
    }
  },
};

