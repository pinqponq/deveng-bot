import { ChatInputCommandInteraction, TextChannel, SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getTicketPanelConfig } from '../utils/database';
import { ensureMemberPermission } from '../utils/permissionGuards';
import { getTextChannel } from '../utils/channelHelper';
import { commonGuildOnly, ticketPanelMsg, ticketPanelSent } from '../utils/slashLocale';
import { buildEmbedFromConfig } from '../utils/buildEmbedFromConfig';
import {
  buildTicketPanelComponents,
  buildTicketPanelEmbedConfig,
  createTicketPanelReplaceTags,
} from '../utils/ticketPanelSender';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('talep-panel-gönder')
    .setDescription('Ayarlanan talep panelini belirlenen kanala gönderir')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: commonGuildOnly(interaction), flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, 'Sunucuyu Yönet'))) return;

      const config = await getTicketPanelConfig(interaction.guild.id);
      if (!config) {
        await interaction.editReply({ content: ticketPanelMsg(interaction, 'notConfigured') });
        return;
      }

      // Kanalı belirle
      let channel: TextChannel | null = null;
      if (config.channelId) {
        channel = getTextChannel(interaction.guild, config.channelId);
      }

      if (!channel) {
        await interaction.editReply({ content: ticketPanelMsg(interaction, 'channelMissing') });
        return;
      }

      const replaceTags = createTicketPanelReplaceTags(interaction.guild);
      const embedResult = config.isEmbed
        ? buildEmbedFromConfig(buildTicketPanelEmbedConfig(config), { replaceTags })
        : null;
      const embed = embedResult?.embeds?.[0] ?? null;

      // Butonları ve menüleri oluştur (paylaşılan helper — fallback butonu dahil)
      const components = buildTicketPanelComponents(config);

      // Mesajı gönder veya güncelle
      const messageOptions: any = {
        components: components.length > 0 ? components : undefined,
      };

      if (embed) {
        messageOptions.embeds = [embed];
      } else if (config.panelMessage) {
        messageOptions.content = config.panelMessage;
      }

      if (!messageOptions.embeds && !messageOptions.content && !messageOptions.components) {
        await interaction.editReply({ content: ticketPanelMsg(interaction, 'noContent') });
        return;
      }

      let sentMessage: any;
      
      // Eğer messageId varsa ve mesaj hâlâ mevcutsa, güncelle
      if (config.messageId && channel) {
        try {
          const existingMessage = await channel.messages.fetch(config.messageId);
          if (existingMessage) {
            await existingMessage.edit(messageOptions);
            sentMessage = existingMessage;
            console.log(`[INFO] Mevcut ticket panel mesajı güncellendi: ${config.messageId}`);
          } else {
            sentMessage = await channel.send(messageOptions);
          }
        } catch (error) {
          console.log(`[INFO] Mevcut mesaj bulunamadı, yeni mesaj gönderiliyor: ${error}`);
          sentMessage = await channel.send(messageOptions);
        }
      } else {
        sentMessage = await channel.send(messageOptions);
      }
      
      if (!sentMessage) {
        await interaction.editReply({ content: ticketPanelMsg(interaction, 'sendFailed') });
        return;
      }

      // MessageId'yi API'ye kaydet (web arayüzünden güncellenecek)
      await interaction.editReply({ content: ticketPanelSent(interaction, channel.toString(), sentMessage.id) });
    } catch (error) {
      console.error('[ERROR] Talep panel gönder komutu hatası:', error);
      await interaction.editReply({ content: ticketPanelMsg(interaction, 'genericError') }).catch((error) => logError('commands/talepPanelGonder:editReply', error, 'debug'));
    }
  },
};


