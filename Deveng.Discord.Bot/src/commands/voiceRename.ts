import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { checkChannelPermission } from '../utils/voiceChannelHelpers';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-rename')
    .setDescription('Geçici ses kanalının adını değiştirir')
    .addStringOption(option =>
      option
        .setName('isim')
        .setDescription('Yeni kanal adı')
        .setRequired(true)
        .setMaxLength(100)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const deferred = await interaction
        .deferReply({ flags: MessageFlags.Ephemeral })
        .then(() => true)
        .catch((error: any) => {
          if (error?.code === 10062) {
            console.warn('[WARN] Voice-rename interaction süresi doldu (10062).');
            return false;
          }
          throw error;
        });

      if (!deferred) {
        return;
      }

      const permission = await checkChannelPermission(interaction, true);
      if (!permission.hasPermission || !permission.channel) {
        return;
      }

      const newName = interaction.options.getString('isim', true);
      const { channel } = permission;

      // Kanal adını değiştir
      await channel.setName(newName);

      await interaction.editReply({
        content: `✅ Kanal adı **${newName}** olarak değiştirildi!` 
      });
    } catch (error) {
      console.error('[ERROR] Voice-rename komutu hatası:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceRename:editReply', error, 'debug'));
      } else {
        await interaction.reply({ content: 'Bir hata oluştu!', flags: MessageFlags.Ephemeral }).catch((error) => logError('commands/voiceRename:reply', error, 'debug'));
      }
    }
  },
};

