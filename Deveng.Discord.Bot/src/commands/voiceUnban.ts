import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { checkChannelPermission } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-unban')
    .setDescription('Belirtilen kullanıcının geçici ses kanalındaki yasağını kaldırır')
    .addUserOption(option =>
      option
        .setName('kullanıcı')
        .setDescription('Yasağı kaldırılacak kullanıcı')
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

      // Kullanıcının yasağını kaldır
      await channel.permissionOverwrites.edit(targetUser.id, {
        Connect: true,
      });

      await interaction.editReply({
        content: `✅ **${targetUser.tag}** kullanıcısının yasağı kaldırıldı!` 
      });
    } catch (error) {
      console.error('[ERROR] Voice-unban komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceUnban:editReply', error, 'debug'));
    }
  },
};

