import { ChatInputCommandInteraction, SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { saveReactionRoleConfig, getReactionRoleConfig } from '../utils/database';
import { ensureMemberPermission } from '../utils/permissionGuards';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('tepki-rol-ayarla')
    .setDescription('Tepki rol sistemini ayarlar')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('kanal')
        .setDescription('Tepki rol mesajının gönderileceği kanal (boş bırakılırsa bot oluşturur)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('normal-mesaj')
        .setDescription('Embed\'in üstüne gönderilecek normal mesaj')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('embed')
        .setDescription('Embed kullanılsın mı? (varsayılan: true)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('embed-başlık')
        .setDescription('Embed başlığı')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('embed-açıklama')
        .setDescription('Embed açıklaması')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('embed-renk')
        .setDescription('Embed rengi (hex format: #FF0000)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('embed-thumbnail')
        .setDescription('Embed thumbnail URL\'si')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('embed-resim')
        .setDescription('Embed resim URL\'si')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('embed-footer')
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

      const channel = interaction.options.getChannel('kanal');
      const normalMessage = interaction.options.getString('normal-mesaj');
      const isEmbed = interaction.options.getBoolean('embed') ?? true;
      const embedTitle = interaction.options.getString('embed-başlık');
      const embedDescription = interaction.options.getString('embed-açıklama');
      const embedColor = interaction.options.getString('embed-renk');
      const embedThumbnail = interaction.options.getString('embed-thumbnail');
      const embedImage = interaction.options.getString('embed-resim');
      const embedFooter = interaction.options.getString('embed-footer');

      // Mevcut config'i al
      const existingConfig = await getReactionRoleConfig(interaction.guild.id);

      // Yeni config oluştur
      const channelId = channel && channel.type === ChannelType.GuildText ? channel.id : (existingConfig?.channelId || null);

      await saveReactionRoleConfig(
        interaction.guild.id,
        channelId,
        normalMessage || existingConfig?.normalMessage || null,
        isEmbed,
        embedTitle || existingConfig?.embedTitle || null,
        embedDescription || existingConfig?.embedDescription || null,
        embedColor || existingConfig?.embedColor || null,
        embedThumbnail || existingConfig?.embedThumbnail || null,
        embedImage || existingConfig?.embedImage || null,
        embedFooter || existingConfig?.embedFooter || null,
        existingConfig?.messageId || null,
        existingConfig?.emojis.map(e => ({ emoji: e.emoji, roleId: e.roleId, orderIndex: e.orderIndex, enabled: e.enabled })) || [],
        existingConfig?.buttons.map(b => ({ label: b.label, emoji: b.emoji, roleId: b.roleId, style: b.style, orderIndex: b.orderIndex, enabled: b.enabled })) || [],
        existingConfig?.menus.map(m => ({
          placeholder: m.placeholder,
          minValues: m.minValues,
          maxValues: m.maxValues,
          enabled: m.enabled,
          options: m.options.map(o => ({
            label: o.label,
            description: o.description,
            roleId: o.roleId,
            emoji: o.emoji,
            orderIndex: o.orderIndex,
            enabled: o.enabled,
          })),
        })) || [],
        existingConfig?.enableEmoji ?? true,
        existingConfig?.enableButton ?? true,
        existingConfig?.enableMenu ?? true,
        existingConfig?.id ?? null
      );

      let response = 'Tepki rol sistemi ayarları güncellendi!\n\n';
      response += `**Kanal:** ${channel ? channel.toString() : 'Bot oluşturacak'}\n`;
      if (normalMessage) response += `**Normal Mesaj:** ${normalMessage}\n`;
      response += `**Embed:** ${isEmbed ? 'Evet' : 'Hayır'}\n`;
      if (embedTitle) response += `**Embed Başlık:** ${embedTitle}\n`;
      if (embedDescription) response += `**Embed Açıklama:** ${embedDescription}\n`;
      if (embedColor) response += `**Embed Renk:** ${embedColor}\n`;
      if (embedThumbnail) response += `**Embed Thumbnail:** ${embedThumbnail}\n`;
      if (embedImage) response += `**Embed Resim:** ${embedImage}\n`;
      if (embedFooter) response += `**Embed Footer:** ${embedFooter}\n`;
      response += '\n**Not:** Emoji, buton ve menü ayarları veritabanından yapılmalıdır.';

      await interaction.editReply({ content: response });
    } catch (error) {
      console.error('[ERROR] Tepki rol ayarla komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/tepkiRol:editReply', error, 'debug'));
    }
  },
};

