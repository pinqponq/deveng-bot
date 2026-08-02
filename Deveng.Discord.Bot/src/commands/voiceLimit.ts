import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { checkChannelPermission } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-limit')
    .setDescription('Geçici ses kanalının kullanıcı sınırını değiştirir')
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('Kullanıcı sınırı (0 = sınırsız)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(99)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const permission = await checkChannelPermission(interaction, true);
      if (!permission.hasPermission || !permission.channel) {
        return;
      }

      const limit = interaction.options.getInteger('limit', true);
      const { channel } = permission;

      // Kullanıcı sınırını değiştir (0 = sınırsız, Discord.js'de 0 değeri sınırsız anlamına gelir)
      await channel.setUserLimit(limit);

      await interaction.editReply({ 
        content: limit === 0 
          ? '✅ Kullanıcı sınırı kaldırıldı (sınırsız)!' 
          : `✅ Kullanıcı sınırı **${limit}** olarak ayarlandı!` 
      });
    } catch (error) {
      console.error('[ERROR] Voice-limit komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceLimit:editReply', error, 'debug'));
    }
  },
};

