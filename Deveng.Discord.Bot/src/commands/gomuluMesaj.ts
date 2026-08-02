import { ChatInputCommandInteraction, SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { ensureMemberPermission } from '../utils/permissionGuards';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('gömülü-mesaj')
    .setDescription('Gömülü mesaj oluşturur ve gönderir')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('isim')
        .setDescription('Gömülü mesaj adı (benzersiz olmalı)')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('kanal')
        .setDescription('Gömülü mesajın gönderileceği kanal')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption(option =>
      option
        .setName('başlık')
        .setDescription('Embed başlığı')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('açıklama')
        .setDescription('Embed açıklaması')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('renk')
        .setDescription('Embed rengi (hex format: #FF0000)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('thumbnail')
        .setDescription('Embed thumbnail URL\'si')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('resim')
        .setDescription('Embed resim URL\'si')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('footer')
        .setDescription('Embed footer metni')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir!', flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, 'Sunucuyu Yönet'))) return;

      const name = interaction.options.getString('isim', true);
      const channel = interaction.options.getChannel('kanal', true);
      const embedTitle = interaction.options.getString('başlık');
      const embedDescription = interaction.options.getString('açıklama');
      const embedColor = interaction.options.getString('renk');
      const embedThumbnail = interaction.options.getString('thumbnail');
      const embedImage = interaction.options.getString('resim');
      const embedFooter = interaction.options.getString('footer');

      // API'ye istek gönder (X-Bot-Token ve X-Bot-ClientId gerekli – custom bot dahil)
      const { getApiBaseUrl, getBotApiHeaders } = await import('../utils/apiClient');
      const apiBaseUrl = getApiBaseUrl();
      const botClientId = interaction.client.user?.id;
      const headers = getBotApiHeaders(botClientId);

      if (!apiBaseUrl) {
        await interaction.editReply({ content: 'API bağlantısı yapılandırılmamış!' });
        return;
      }

      // Embed mesaj oluştur
      const createResponse = await fetch(`${apiBaseUrl}/api/EmbedMessage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          guildId: interaction.guild.id,
          channelId: channel.id,
          name: name,
          isEmbed: true,
          embedTitle: embedTitle || null,
          embedDescription: embedDescription || null,
          embedColor: embedColor || null,
          embedThumbnail: embedThumbnail || null,
          embedImage: embedImage || null,
          embedFooter: embedFooter || null,
          enabled: true,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({ message: 'Bilinmeyen hata' })) as { message?: string };
        if (createResponse.status === 400 && errorData.message?.includes('zaten mevcut')) {
          await interaction.editReply({ content: `Bu isimde bir gömülü mesaj zaten mevcut: ${name}` });
        } else {
          await interaction.editReply({ content: `Embed mesaj oluşturulamadı: ${errorData.message || 'Bilinmeyen hata'}` });
        }
        return;
      }

      const embedMessage = await createResponse.json() as { id: number };

      // Mesajı gönder
      const sendResponse = await fetch(`${apiBaseUrl}/api/EmbedMessage/${embedMessage.id}/send`, {
        method: 'POST',
        headers: getBotApiHeaders(botClientId),
      });

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json().catch(() => ({ message: 'Bilinmeyen hata' })) as { message?: string };
        await interaction.editReply({ content: `Embed mesaj oluşturuldu ancak gönderilemedi: ${errorData.message || 'Bilinmeyen hata'}` });
        return;
      }

      let response = `Gömülü mesaj başarıyla oluşturuldu ve gönderildi!\n\n`;
      response += `**İsim:** ${name}\n`;
      response += `**Kanal:** ${channel.toString()}\n`;
      if (embedTitle) response += `**Başlık:** ${embedTitle}\n`;
      if (embedDescription) response += `**Açıklama:** ${embedDescription}\n`;
      if (embedColor) response += `**Renk:** ${embedColor}\n`;
      if (embedThumbnail) response += `**Thumbnail:** ${embedThumbnail}\n`;
      if (embedImage) response += `**Resim:** ${embedImage}\n`;
      if (embedFooter) response += `**Footer:** ${embedFooter}\n`;
      response += `\n**Not:** Daha fazla düzenleme için web arayüzünü kullanabilirsiniz.`;

      await interaction.editReply({ content: response });
    } catch (error) {
      console.error('[ERROR] Gömülü mesaj komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/gomuluMesaj:editReply', error, 'debug'));
    }
  },
};

