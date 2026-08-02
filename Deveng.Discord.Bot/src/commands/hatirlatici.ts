import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { getApiBaseUrl, apiRequest } from '../utils/apiClient';
import { logError } from '../utils/logger';


export default {
  data: new SlashCommandBuilder()
    .setName('hatirlatici')
    .setDescription('Hatırlatıcı oluştur veya listele')
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName('olustur')
        .setDescription('Yeni bir hatırlatıcı oluştur (Modal açılır)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('liste')
        .setDescription('Hatırlatıcılarını listele')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir!', flags: MessageFlags.Ephemeral });
        return;
      }

      const subcommand = interaction.options.getSubcommand();
      const apiBaseUrl = getApiBaseUrl();

      if (!apiBaseUrl) {
        await interaction.reply({ content: 'API bağlantısı yapılandırılmamış!', flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === 'olustur') {
        // Kanal kontrolü - komutun kullanıldığı kanal
        if (!interaction.channel || !interaction.channel.isTextBased()) {
          await interaction.reply({ content: 'Bu komut sadece metin kanallarında kullanılabilir!', flags: MessageFlags.Ephemeral });
          return;
        }

        // Modal oluştur - kanal ID'yi customId'ye ekle
        const modal = new ModalBuilder()
          .setCustomId(`reminder_create_modal:${interaction.channel.id}`)
          .setTitle('Hatırlatıcı Oluştur');

        // Gün input
        const dayInput = new TextInputBuilder()
          .setCustomId('reminder_day')
          .setLabel('Gün (1-31)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('1-31 arası (örn: 25)')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(2);

        // Ay input
        const monthInput = new TextInputBuilder()
          .setCustomId('reminder_month')
          .setLabel('Ay (1-12)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('1-12 arası (örn: 12)')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(2);

        // Saat input
        const hourInput = new TextInputBuilder()
          .setCustomId('reminder_hour')
          .setLabel('Saat (0-23)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('0-23 arası (örn: 14)')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(2);

        // Dakika input
        const minuteInput = new TextInputBuilder()
          .setCustomId('reminder_minute')
          .setLabel('Dakika (0-59)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('0-59 arası (örn: 30)')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(2);

        // Mesaj input
        const messageInput = new TextInputBuilder()
          .setCustomId('reminder_message')
          .setLabel('Mesaj')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Hatırlatma mesajınızı yazın...')
          .setRequired(true)
          .setMaxLength(2000);

        // Action rows
        const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(dayInput);
        const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(monthInput);
        const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(hourInput);
        const fourthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(minuteInput);
        const fifthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
        return;
      } else if (subcommand === 'liste') {
        // Kanal kontrolü
        if (!interaction.channel || !interaction.channel.isTextBased()) {
          await interaction.reply({ content: 'Bu komut sadece metin kanallarında kullanılabilir!', flags: MessageFlags.Ephemeral });
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
          const reminders = await apiRequest<Array<{
            id: number;
            channelId: string;
            remindDate: string;
            message: string | null;
            embedTitle: string | null;
            isSent: boolean;
          }>>(`/api/Reminder/guild/${interaction.guild.id}/user/${interaction.user.id}`, {
            method: 'GET',
          });

        if (reminders.length === 0) {
          await interaction.editReply({ content: 'Henüz hatırlatıcınız yok!' });
          return;
        }

        // Gönderilmemiş hatırlatıcıları filtrele
        const pendingReminders = reminders.filter(r => !r.isSent);

        if (pendingReminders.length === 0) {
          await interaction.editReply({ content: 'Bekleyen hatırlatıcınız yok!' });
          return;
        }

        const embeds: EmbedBuilder[] = [];
        for (const reminder of pendingReminders.slice(0, 10)) {
          const reminderChannel = interaction.guild.channels.cache.get(reminder.channelId);
          const channelName = reminderChannel ? `#${reminderChannel.name}` : 'Bilinmeyen Kanal';
          const formattedDate = new Date(reminder.remindDate).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const messageText = reminder.message || reminder.embedTitle || 'Mesaj yok';

          // Her hatırlatıcı için ayrı embed oluştur
          embeds.push(new EmbedBuilder()
            .setTitle(`📌 Hatırlatıcı #${reminder.id}`)
            .setColor('#5865F2')
            .addFields(
              { name: '📅 Tarih', value: formattedDate, inline: true },
              { name: '📢 Kanal', value: channelName, inline: true },
              { name: '💬 Mesaj', value: messageText.length > 1024 ? messageText.substring(0, 1021) + '...' : messageText, inline: false }
            )
            .setFooter({ text: `Hatırlatıcı ID: ${reminder.id}` })
            .setTimestamp(new Date(reminder.remindDate)));
        }

        // Ephemeral olarak tek yanıtta listele
        if (pendingReminders.length > 10) {
          embeds.push(
            new EmbedBuilder()
              .setColor('#5865F2')
              .setDescription(`Toplam **${pendingReminders.length}** hatırlatıcı var. İlk 10 tanesi gösteriliyor.`)
          );
        }

        await interaction.editReply({
          content: `📋 **${pendingReminders.length}** adet bekleyen hatırlatıcınız var.`,
          embeds,
        });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
          await interaction.editReply({ content: `Hatırlatıcılar alınamadı: ${errorMessage}` });
          return;
        }
      }
    } catch (error) {
      console.error('[ERROR] Hatırlatıcı komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/hatirlatici:editReply', error, 'debug'));
    }
  },
};
