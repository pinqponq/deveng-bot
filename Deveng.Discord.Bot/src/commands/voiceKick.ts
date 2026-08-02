import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { checkChannelPermission } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-kick')
    .setDescription('Belirtilen kullanıcıyı geçici ses kanalından atar')
    .addUserOption(option =>
      option
        .setName('kullanıcı')
        .setDescription('Atılacak kullanıcı')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const permission = await checkChannelPermission(interaction);
      if (!permission.hasPermission || !permission.channel) {
        return;
      }

      const targetUser = interaction.options.getUser('kullanıcı', true);
      const { channel } = permission;

      // Kullanıcı kanalda mı kontrol et
      const member = await interaction.guild?.members.fetch(targetUser.id);
      if (!member || !member.voice?.channel || member.voice.channel.id !== channel.id) {
        await interaction.editReply({ content: 'Bu kullanıcı kanalda değil!' });
        return;
      }

      // Kullanıcıyı kanaldan çıkar
      await member.voice.disconnect('Geçici kanal sahibi tarafından atıldı');

      await interaction.editReply({ 
        content: `✅ **${targetUser.tag}** kanaldan atıldı!` 
      });
    } catch (error) {
      console.error('[ERROR] Voice-kick komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceKick:editReply', error, 'debug'));
    }
  },
};

