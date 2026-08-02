import { ChatInputCommandInteraction, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('doğum-günü')
    .setDescription('Doğum gününüzü ekleyin veya güncelleyin')
    .setDMPermission(false),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir!', flags: MessageFlags.Ephemeral });
        return;
      }

      // Modal oluştur
      const modal = new ModalBuilder()
        .setCustomId('birthday_create_modal')
        .setTitle('Doğum Günü Ekle');

      // Gün input
      const dayInput = new TextInputBuilder()
        .setCustomId('birthday_day')
        .setLabel('Gün (1-31)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1-31 arası (örn: 15)')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);

      // Ay input
      const monthInput = new TextInputBuilder()
        .setCustomId('birthday_month')
        .setLabel('Ay (1-12)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1-12 arası (örn: 5)')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);

      // Yıl input
      const yearInput = new TextInputBuilder()
        .setCustomId('birthday_year')
        .setLabel('Yıl')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Yıl (örn: 2000)')
        .setRequired(true)
        .setMinLength(4)
        .setMaxLength(4);

      // Action rows
      const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(dayInput);
      const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(monthInput);
      const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(yearInput);

      modal.addComponents(firstRow, secondRow, thirdRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.error('[ERROR] Doğum günü komutu hatası:', error);
      await interaction.reply({ content: 'Bir hata oluştu!', flags: MessageFlags.Ephemeral }).catch((error) => logError('commands/dogumgunu:reply', error, 'debug'));
    }
  },
};
