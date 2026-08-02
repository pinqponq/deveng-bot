import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { checkChannelPermission } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-ban')
    .setDescription('Belirtilen kullanıcıyı geçici ses kanalından yasaklar')
    .addUserOption(option =>
      option
        .setName('kullanıcı')
        .setDescription('Yasaklanacak kullanıcı')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const permission = await checkChannelPermission(interaction);
      if (!permission.hasPermission || !permission.channel || !permission.tempChannel) {
        return;
      }

      const targetUser = interaction.options.getUser('kullanıcı', true);
      const { channel, tempChannel } = permission;

      // Kullanıcı zaten yasaklı mı?
      if (tempChannel.bannedUserIds.includes(targetUser.id)) {
        await interaction.editReply({ content: 'Bu kullanıcı zaten yasaklı!' });
        return;
      }

      // Kullanıcıyı kanaldan çıkar
      const member = await interaction.guild?.members.fetch(targetUser.id);
      if (member?.voice?.channel?.id === channel.id) {
        await member.voice.disconnect('Geçici kanal sahibi tarafından yasaklandı');
      }

      // Kullanıcıya Connect iznini kaldır
      await channel.permissionOverwrites.edit(targetUser.id, {
        Connect: false,
      });

      await interaction.editReply({
        content: `✅ **${targetUser.tag}** kanaldan yasaklandı!` 
      });
    } catch (error) {
      console.error('[ERROR] Voice-ban komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceBan:editReply', error, 'debug'));
    }
  },
};

