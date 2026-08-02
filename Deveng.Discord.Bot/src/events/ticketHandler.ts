import { ButtonInteraction, StringSelectMenuInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, CategoryChannel, ChannelType, PermissionFlagsBits, Message, AttachmentBuilder, type GuildMember } from 'discord.js';
import { getTicketPanelConfig } from '../utils/database';
import { sanitizeOptionalUrl } from '../utils/mentionSanitize';
import { tryAcquireRedisLock, getRedisClient } from '../utils/redisCache';
import {
  apiCreateTicketRecord,
  apiUpdateTicketClaimed,
  apiUpdateTicketClosed,
} from '../utils/apiClient';
import { logError } from '../utils/logger';
import { isInteractionExpiredOrAcked, safeDeferReply, safeEphemeralReply } from '../utils/interactionSafe';

export async function handleTicketCreate(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
  try {
    if (!interaction.guild || !interaction.member) {
      await safeEphemeralReply(interaction, 'Bu işlem sadece sunucularda kullanılabilir!', 'ticketHandler:guildOnly');
      return;
    }

    if (!(await safeDeferReply(interaction, true, 'ticketHandler:createDefer'))) {
      return;
    }

    const config = await getTicketPanelConfig(interaction.guild.id);
    if (!config || !config.enabled) {
      await interaction.editReply({ content: 'Talep paneli aktif değil!' });
      return;
    }

    // Spam koruması: aynı kullanıcı 30 sn içinde 2. talebi açamaz (channel flood / kategori taşması).
    // ÖNEMLİ: Redis yoksa fail-OPEN davranırız — spam koruması bir yardımcıdır; erişilemediğinde
    // çekirdek özellik (talep oluşturma) asla bloke edilmemelidir. Redis mevcutken kilit uygulanır.
    if (getRedisClient()) {
      const spamLockKey = `ticket:create:${interaction.guild.id}:${interaction.user.id}`;
      const acquired = await tryAcquireRedisLock(spamLockKey, 30);
      if (!acquired) {
        await interaction.editReply({
          content: 'Çok hızlı talep açıyorsunuz. Lütfen 30 saniye sonra tekrar deneyin.',
        });
        return;
      }
    }

    // Bot izin ön-kontrolü: Kanal oluşturmak ve izin overwrite'ları ayarlamak için
    // botun hem "Kanalları Yönet" hem de "Rolleri Yönet" iznine ihtiyacı vardır.
    // Eksikse jenerik hata yerine net, uygulanabilir bir mesaj döneriz.
    let me: GuildMember | null = interaction.guild.members.me;
    if (!me) {
      me = await interaction.guild.members.fetchMe().catch(() => null);
    }
    if (!me) {
      await interaction.editReply({ content: 'Bot sunucu üyeliği doğrulanamadı. Lütfen botu tekrar davet edin.' });
      return;
    }
    const missingPerms: string[] = [];
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) missingPerms.push('Kanalları Yönet');
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) missingPerms.push('Rolleri Yönet');
    if (missingPerms.length > 0) {
      await interaction.editReply({
        content: `Talep oluşturulamıyor: Botta şu izin(ler) eksik: **${missingPerms.join(', ')}**. Lütfen bota bu izinleri verip tekrar deneyin.`,
      });
      return;
    }

    // Overwrite kuralı: Bir bot, kendisinde (sunucu düzeyinde) bulunmayan bir izni
    // kanal overwrite'ında veremez; verirse Discord tüm channels.create çağrısını
    // 50013 (Missing Permissions) ile reddeder. Bu yüzden overwrite'ta yalnızca botun
    // gerçekten sahip olduğu izin bitlerini kullanırız (örn. bot ManageMessages'a sahip
    // değilse bu bit sessizce düşürülür, talep akışı kırılmaz).
    const botMember = me;
    const filterToBotPerms = (bits: bigint[]): bigint[] =>
      bits.filter((bit) => botMember.permissions.has(bit));

    // Ticket type ID'yi al
    let ticketTypeId: number | null = null;
    if (interaction.isButton()) {
      const match = interaction.customId.match(/ticket_create_(\d+)/);
      if (match) {
        ticketTypeId = parseInt(match[1]);
      }
    } else if (interaction.isStringSelectMenu()) {
      const selected = interaction.values[0];
      const match = selected.match(/ticket_type_(\d+)/);
      if (match) {
        ticketTypeId = parseInt(match[1]);
      }
    }

    // Türü çöz. customId fallback butonundan (ticket_create_default) geliyorsa veya
    // ID config'de bulunamıyorsa, ilk aktif türe düş; hiç aktif tür yoksa panel
    // seviyesindeki ayarlarla sentetik bir "Talep Oluştur" türü üret. Böylece buton
    // her durumda çalışır ve talep akışı asla "geçersiz tür" ile kırılmaz.
    const enabledTypes = config.ticketTypes
      .filter(tt => tt.enabled)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    let ticketType =
      ticketTypeId != null ? enabledTypes.find(tt => tt.id === ticketTypeId) ?? null : null;

    if (!ticketType) {
      ticketType = enabledTypes[0] ?? null;
    }

    if (!ticketType) {
      ticketType = {
        id: 0,
        type: 0,
        label: 'Talep Oluştur',
        emoji: null,
        style: 1,
        placeholder: null,
        orderIndex: 0,
        openCategoryId: null,
        openCategoryName: null,
        claimedCategoryId: null,
        claimedCategoryName: null,
        closedCategoryId: null,
        closedCategoryName: null,
        enabled: true,
      };
    }

    // Kategori belirle
    let category: CategoryChannel | null = null;
    let categoryId = ticketType.openCategoryId || config.openCategoryId;
    let categoryName = ticketType.openCategoryName || config.openCategoryName;

    if (categoryId) {
      category = interaction.guild.channels.cache.get(categoryId) as CategoryChannel | null;
    }

    // Kategori yoksa oluştur
    if (!category && categoryName) {
      category = await interaction.guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        reason: 'Talep paneli için otomatik oluşturuldu',
      });
      categoryId = category.id;
    }

    // Kanal oluştur
    const userId = interaction.user.id;
    const userName = interaction.user.username;
    const channelName = `talep-${userName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-6)}`;

    // İzinleri ayarla — allow bitleri botun sahip olduklarıyla sınırlandırılır (50013 koruması).
    const permissionOverwrites = [
      {
        id: interaction.guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.client.user.id,
        allow: filterToBotPerms([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages,
        ]),
      },
      {
        id: userId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];

    // Talep yöneticisi rolleri ekle
    for (const roleId of config.roleIds) {
      permissionOverwrites.push({
        id: roleId,
        allow: filterToBotPerms([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]),
      });
    }

    let channel: TextChannel;
    try {
      channel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category?.id,
        permissionOverwrites: permissionOverwrites as any,
        reason: 'Talep oluşturuldu',
      });
    } catch (createError) {
      // 50013: Genelde botun kategori/kanal düzeyinde izni yetersiz. Net mesaj ver.
      if ((createError as any)?.code === 50013) {
        console.error('[ERROR] Ticket kanalı oluşturulamadı (50013 Missing Permissions):', createError);
        await interaction.editReply({
          content: 'Talep kanalı oluşturulamadı: Botun izinleri yetersiz. Botun **Kanalları Yönet** ve **Rolleri Yönet** izinlerine sahip olduğundan ve talep kategorisinde bu izinlerin engellenmediğinden emin olun.',
        });
        return;
      }
      throw createError;
    }

    // Tag replacement için placeholder'lar
    const placeholders: Record<string, string> = {
      user: `<@${userId}>`,
      username: userName,
      userid: userId,
      usermention: `<@${userId}>`,
      ticketid: channelName,
      server: interaction.guild.name,
      servername: interaction.guild.name,
      timestamp: new Date().toLocaleString('tr-TR'),
    };
    
    // Tag replacement fonksiyonu
    const replaceTags = (text: string): string => {
      if (!text) return '';
      let result = text;
      for (const [key, value] of Object.entries(placeholders)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      return result;
    };

    // Hoş geldin mesajı gönder
    let welcomeEmbed: EmbedBuilder | null = null;
    if (config.isWelcomeEmbed) {
      welcomeEmbed = new EmbedBuilder();
      
      if (config.welcomeEmbedTitle) {
        welcomeEmbed.setTitle(replaceTags(config.welcomeEmbedTitle));
      }
      
      if (config.welcomeEmbedDescription) {
        const description = replaceTags(config.welcomeEmbedDescription || 'Talebiniz oluşturuldu. Lütfen daha hızlı yanıt vermemize yardımcı olmak için konuya yardımcı olacağını düşündüğünüz ek bilgileride paylaşın.').replace(/\\n/g, '\n');
        welcomeEmbed.setDescription(description);
      }
      
      if (config.welcomeEmbedColor) {
        welcomeEmbed.setColor(parseInt(config.welcomeEmbedColor.replace('#', ''), 16));
      } else {
        welcomeEmbed.setColor(0x5865F2);
      }
      
      if (config.welcomeEmbedThumbnail) {
        const tThumb = sanitizeOptionalUrl(replaceTags(config.welcomeEmbedThumbnail));
        if (tThumb) welcomeEmbed.setThumbnail(tThumb);
      }

      if (config.welcomeEmbedImage) {
        const tImage = sanitizeOptionalUrl(replaceTags(config.welcomeEmbedImage));
        if (tImage) welcomeEmbed.setImage(tImage);
      }
      
      if (config.welcomeEmbedFooter) {
        welcomeEmbed.setFooter({ text: replaceTags(config.welcomeEmbedFooter) });
      }
      
      welcomeEmbed.setTimestamp();
    }

    // Yönetim butonları
    const actionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${channel.id}`)
          .setLabel('Üstlen')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${channel.id}`)
          .setLabel('Kapat')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒')
      );

    const messageOptions: any = {
      components: [actionRow],
    };

    if (welcomeEmbed) {
      messageOptions.embeds = [welcomeEmbed];
    } else if (config.welcomeMessage) {
      messageOptions.content = config.welcomeMessage || 'Talebiniz oluşturuldu. Lütfen daha hızlı yanıt vermemize yardımcı olmak için konuya yardımcı olacağını düşündüğünüz ek bilgileride paylaşın.';
    }

    try {
      await channel.send(messageOptions);
    } catch (sendError) {
      // Kanal oluşturulduktan sonra mesaj gönderimi başarısız olursa kullanıcıya ticket linkini yine ver.
      console.error('[ERROR] Ticket hoş geldin mesajı gönderilemedi:', sendError);
      await interaction.editReply({
        content: `Talep kanalınız oluşturuldu: ${channel}\n⚠️ Hoş geldin mesajı gönderilemedi (bot kanal erişim izni eksik olabilir).`,
      });
      return;
    }

    try {
      await apiCreateTicketRecord(interaction.guild.id, {
        ticketPanelId: config.id,
        ticketTypeId: ticketType.id,
        channelId: channel.id,
        userId,
      });
    } catch (e) {
      console.warn('[WARN] Ticket DB kaydı oluşturulamadı (kanal mevcut):', e);
    }

    await interaction.editReply({ content: `Talep kanalınız oluşturuldu: ${channel}` });
  } catch (error) {
    if (isInteractionExpiredOrAcked(error)) {
      logError('ticketHandler:createExpired', error, 'debug');
      return;
    }
    console.error('[ERROR] Ticket oluşturma hatası:', error);
    await interaction.editReply({ content: 'Talep oluşturulurken bir hata oluştu!' }).catch((error) => logError('ticketHandler:createErrorReply', error, 'debug'));
  }
}

export async function handleTicketCreateMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  await handleTicketCreate(interaction);
}

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  try {
    if (!interaction.guild || !interaction.member) {
      await safeEphemeralReply(interaction, 'Bu işlem sadece sunucularda kullanılabilir!', 'ticketHandler:buttonGuildOnly');
      return;
    }

    const customId = interaction.customId;
    
    if (customId.startsWith('ticket_claim_')) {
      const channelId = customId.replace('ticket_claim_', '');
      await handleTicketClaim(interaction, channelId);
    } else if (customId.startsWith('ticket_close_')) {
      const channelId = customId.replace('ticket_close_', '');
      await handleTicketClose(interaction, channelId);
    }
  } catch (error) {
    if (isInteractionExpiredOrAcked(error)) {
      logError('ticketHandler:buttonExpired', error, 'debug');
      return;
    }
    console.error('[ERROR] Ticket buton hatası:', error);
    await safeEphemeralReply(interaction, 'Bir hata oluştu!', 'ticketHandler:buttonErrorReply');
  }
}

async function handleTicketClaim(interaction: ButtonInteraction, channelId: string): Promise<void> {
  try {
    if (!(await safeDeferReply(interaction, true, 'ticketHandler:claimDefer'))) {
      return;
    }

    if (!interaction.guild || !interaction.member) {
      await interaction.editReply({ content: 'Bu işlem sadece sunucularda kullanılabilir!' });
      return;
    }

    const channel = interaction.guild.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
      await interaction.editReply({ content: 'Kanal bulunamadı!' });
      return;
    }

    // Rol kontrolü - Sadece belirlenen roller talep üstlenebilir
    const config = await getTicketPanelConfig(interaction.guild.id);
    if (config && config.roleIds && config.roleIds.length > 0) {
      const member = interaction.member;
      let hasPermission = false;

      // Kullanıcının rollerini kontrol et
      if (member && 'roles' in member) {
        // GuildMember tipinde roles bir GuildMemberRoleManager'dır
        if (member.roles && typeof member.roles === 'object' && 'cache' in member.roles) {
          const memberRoles = member.roles.cache;
          hasPermission = config.roleIds.some(roleId => memberRoles.has(roleId));
        }
      }

      // Eğer yetkili rol yoksa hata ver
      if (!hasPermission) {
        await interaction.editReply({ 
          content: '❌ Bu işlem için yetkiniz yok! Sadece talep yöneticisi rolleri talep üstlenebilir.' 
        });
        return;
      }
    }

    await interaction.editReply({ content: 'Talep üstlenildi!' });
    await channel.send(`✅ Talep ${interaction.user} tarafından üstlenildi.`);
    await apiUpdateTicketClaimed(interaction.guild.id, channelId, interaction.user.id);
  } catch (error) {
    if (isInteractionExpiredOrAcked(error)) {
      logError('ticketHandler:claimExpired', error, 'debug');
      return;
    }
    console.error('[ERROR] Ticket üstlenme hatası:', error);
    await interaction.editReply({ content: 'Talep üstlenilirken bir hata oluştu!' }).catch((error) => logError('ticketHandler:claimErrorReply', error, 'debug'));
  }
}

async function handleTicketClose(interaction: ButtonInteraction, channelId: string): Promise<void> {
  try {
    if (!(await safeDeferReply(interaction, true, 'ticketHandler:closeDefer'))) {
      return;
    }

    const channel = interaction.guild?.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
      await interaction.editReply({ content: 'Kanal bulunamadı!' });
      return;
    }

    if (!interaction.guild) {
      await interaction.editReply({ content: 'Sunucu bulunamadı!' });
      return;
    }

    // Ticket panel config'i al
    const config = await getTicketPanelConfig(interaction.guild.id);
    if (!config) {
      await interaction.editReply({ content: 'Talep paneli yapılandırması bulunamadı!' });
      return;
    }

    // Transkript oluştur
    await createTranscript(channel, config.transcriptChannelId, config.sendTranscriptToUser, interaction.user);

    await apiUpdateTicketClosed(interaction.guild.id, channelId, interaction.user.id, null);

    await interaction.editReply({ content: 'Talep kapatıldı ve transkript oluşturuldu!' });
    await channel.send(`🔒 Talep ${interaction.user} tarafından kapatıldı.`);
    
    // 5 saniye sonra kanalı sil
    setTimeout(async () => {
      try {
        await channel.delete();
      } catch (error) {
        console.error('[ERROR] Kanal silme hatası:', error);
      }
    }, 5000);
  } catch (error) {
    if (isInteractionExpiredOrAcked(error)) {
      logError('ticketHandler:closeExpired', error, 'debug');
      return;
    }
    console.error('[ERROR] Ticket kapatma hatası:', error);
    await interaction.editReply({ content: 'Talep kapatılırken bir hata oluştu!' }).catch((error) => logError('ticketHandler:closeErrorReply', error, 'debug'));
  }
}

async function createTranscript(
  channel: TextChannel,
  transcriptChannelId: string | null,
  sendTranscriptToUser: boolean,
  closedByUser: { id: string; tag: string }
): Promise<void> {
  try {
    // Tüm mesajları topla
    const messages: Message[] = [];
    let lastMessageId: string | undefined;
    
    // Tüm mesajları fetch et (1000 mesaj limiti)
    while (true) {
      const fetched = await channel.messages.fetch({
        limit: 100,
        before: lastMessageId,
      });
      
      if (fetched.size === 0) break;
      
      messages.push(...Array.from(fetched.values()));
      lastMessageId = fetched.last()?.id;
      
      if (fetched.size < 100) break;
    }
    
    // Mesajları tarihe göre sırala (en eski önce)
    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    
    // Transkript içeriğini oluştur
    const transcriptLines: string[] = [];
    transcriptLines.push('='.repeat(60));
    transcriptLines.push(`TALEP TRANSKRİPTİ`);
    transcriptLines.push('='.repeat(60));
    transcriptLines.push(`Kanal: #${channel.name}`);
    transcriptLines.push(`Kanal ID: ${channel.id}`);
    transcriptLines.push(`Sunucu: ${channel.guild.name}`);
    transcriptLines.push(`Sunucu ID: ${channel.guild.id}`);
    transcriptLines.push(`Oluşturulma: ${channel.createdAt.toLocaleString('tr-TR')}`);
    transcriptLines.push(`Kapatılma: ${new Date().toLocaleString('tr-TR')}`);
    transcriptLines.push(`Kapatan: ${closedByUser.tag} (${closedByUser.id})`);
    transcriptLines.push(`Toplam Mesaj: ${messages.length}`);
    transcriptLines.push('='.repeat(60));
    transcriptLines.push('');
    
    // Her mesajı ekle
    for (const message of messages) {
      const date = message.createdAt.toLocaleString('tr-TR');
      const author = message.author.tag;
      const authorId = message.author.id;
      const content = message.content || '(İçerik yok)';
      
      transcriptLines.push(`[${date}] ${author} (${authorId}):`);
      transcriptLines.push(content);
      
      // Ekler varsa ekle
      if (message.attachments.size > 0) {
        transcriptLines.push('Ekler:');
        for (const attachment of message.attachments.values()) {
          transcriptLines.push(`  - ${attachment.name} (${attachment.url})`);
        }
      }
      
      // Embed'ler varsa ekle
      if (message.embeds.length > 0) {
        transcriptLines.push('Embed\'ler:');
        for (const embed of message.embeds) {
          if (embed.title) transcriptLines.push(`  Başlık: ${embed.title}`);
          if (embed.description) transcriptLines.push(`  Açıklama: ${embed.description}`);
          if (embed.footer?.text) transcriptLines.push(`  Footer: ${embed.footer.text}`);
        }
      }
      
      transcriptLines.push('');
    }
    
    transcriptLines.push('='.repeat(60));
    transcriptLines.push('Transkript Sonu');
    transcriptLines.push('='.repeat(60));
    
    const transcriptContent = transcriptLines.join('\n');
    
    // HTML transkript oluştur
    const htmlTranscript = createHTMLTranscript(channel, messages, closedByUser);
    
    // Transkript dosyaları oluştur
    const transcriptTxtBuffer = Buffer.from(transcriptContent, 'utf-8');
    const transcriptTxtAttachment = new AttachmentBuilder(transcriptTxtBuffer, {
      name: `transcript-${channel.name}-${Date.now()}.txt`,
    });
    
    const transcriptHtmlBuffer = Buffer.from(htmlTranscript, 'utf-8');
    const transcriptHtmlAttachment = new AttachmentBuilder(transcriptHtmlBuffer, {
      name: `transcript-${channel.name}-${Date.now()}.html`,
    });
    
    // Transkript embed'i oluştur
    const transcriptEmbed = new EmbedBuilder()
      .setTitle('📋 Talep Transkripti')
      .setDescription(`**Kanal:** #${channel.name}\n**Kapatıldı:** ${new Date().toLocaleString('tr-TR')}\n**Kapatan:** ${closedByUser.tag}\n**Toplam Mesaj:** ${messages.length}`)
      .setColor(0x5865F2)
      .setTimestamp();
    
    // Transkript kanalına gönder
    if (transcriptChannelId) {
      const transcriptChannel = channel.guild.channels.cache.get(transcriptChannelId) as TextChannel;
      if (transcriptChannel) {
        await transcriptChannel.send({
          embeds: [transcriptEmbed],
          files: [transcriptHtmlAttachment, transcriptTxtAttachment],
        });
        console.log(`[INFO] Transkript gönderildi: ${transcriptChannel.name} (${transcriptChannelId})`);
      } else {
        console.warn(`[WARN] Transkript kanalı bulunamadı: ${transcriptChannelId}`);
      }
    }
    
    // Kullanıcıya DM olarak gönder (eğer ayarlandıysa)
    if (sendTranscriptToUser) {
      // Ticket sahibini bul (önce kanal izinlerinden, sonra mesaj geçmişinden).
      let ticketOwner: string | null = null;
      
      // Kanal izinlerinden ViewChannel iznine sahip ilk gerçek kullanıcıyı al.
      const permissionOverwrites = channel.permissionOverwrites.cache;
      const botUserId = channel.client.user?.id;
      for (const overwrite of permissionOverwrites.values()) {
        if (overwrite.type !== 1) continue;
        if (!overwrite.allow.has(PermissionFlagsBits.ViewChannel)) continue;
        if (overwrite.id === botUserId) continue;
        ticketOwner = overwrite.id;
        break;
      }
      
      // İzinlerden bulunamazsa, mesaj geçmişindeki ilk bot olmayan yazarı kullan.
      if (!ticketOwner && messages.length > 0) {
        const firstNonBotMessage = messages.find(message => !message.author.bot);
        if (firstNonBotMessage) {
          ticketOwner = firstNonBotMessage.author.id;
        }
      }
      
      if (ticketOwner) {
        try {
          const user = await channel.client.users.fetch(ticketOwner);
          if (user && !user.bot) {
            await user.send({
              embeds: [transcriptEmbed],
              files: [transcriptHtmlAttachment, transcriptTxtAttachment],
            });
            console.log(`[INFO] Transkript kullanıcıya gönderildi: ${user.tag} (${ticketOwner})`);
          }
        } catch (error) {
          console.warn(`[WARN] Kullanıcıya transkript gönderilemedi (${ticketOwner}):`, error);
        }
      }
    }
  } catch (error) {
    console.error('[ERROR] Transkript oluşturma hatası:', error);
    throw error;
  }
}

function createHTMLTranscript(
  channel: TextChannel,
  messages: Message[],
  closedByUser: { id: string; tag: string }
): string {
  const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Talep Transkripti - ${channel.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
      color: #dcddde;
      padding: 0;
      line-height: 1.5;
      min-height: 100vh;
      overflow-x: hidden;
    }
    
    .container {
      max-width: 100%;
      width: 100%;
      margin: 0 auto;
      background: #2f3136;
      border-radius: 0;
      padding: 0;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
      overflow: hidden;
      margin-top: 0;
      margin-bottom: 0;
    }
    
    .header {
      background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
      padding: 30px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 16px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .header-icon {
      display: inline-block;
      width: 24px;
      height: 24px;
      margin-right: 8px;
      vertical-align: middle;
    }
    
    .header-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
    }
    
    .header-info-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.1);
      padding: 12px 16px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
      transition: all 0.2s;
    }
    
    .header-info-item:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }
    
    .header-info-label {
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .header-info-value {
      font-weight: 500;
      color: #ffffff;
    }
    
    .messages {
      display: flex;
      flex-direction: column;
      padding: 20px;
      gap: 2px;
      background: #36393f;
    }
    
    .message {
      display: flex;
      gap: 16px;
      padding: 4px 16px;
      transition: all 0.15s ease;
      position: relative;
    }
    
    .message:hover {
      background: rgba(79, 84, 92, 0.16);
      border-radius: 4px;
    }
    
    .message-group {
      margin-top: 16px;
    }
    
    .message-group:first-child {
      margin-top: 0;
    }
    
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
      background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      color: #ffffff;
      text-transform: uppercase;
      object-fit: cover;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.1);
    }
    
    .avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.1);
    }
    
    .message-content {
      flex: 1;
      min-width: 0;
      padding-top: 2px;
    }
    
    .message-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }
    
    .message-author {
      font-weight: 600;
      color: #ffffff;
      font-size: 16px;
      cursor: pointer;
      transition: color 0.2s;
    }
    
    .message-author:hover {
      text-decoration: underline;
    }
    
    .message-author.bot {
      color: #5865f2;
    }
    
    .bot-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      background: #5865f2;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-left: 6px;
      vertical-align: middle;
    }
    
    .message-timestamp {
      font-size: 12px;
      color: #72767d;
      font-weight: 500;
      user-select: none;
    }
    
    .message-text {
      color: #dcddde;
      font-size: 16px;
      word-wrap: break-word;
      white-space: pre-wrap;
      line-height: 1.375;
    }
    
    .message-text a {
      color: #00aff4;
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .message-text a:hover {
      color: #00d4ff;
      text-decoration: underline;
    }
    
    .message-text code {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      color: #f04747;
    }
    
    .message-text strong {
      font-weight: 600;
      color: #ffffff;
    }
    
    .message-text em {
      font-style: italic;
      color: #dcddde;
    }
    
    .attachments {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .attachment {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #2f3136;
      border-radius: 8px;
      border-left: 4px solid #5865f2;
      text-decoration: none;
      color: #00aff4;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .attachment:hover {
      background: #36393f;
      transform: translateX(4px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }
    
    .attachment-icon {
      width: 20px;
      height: 20px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      flex-shrink: 0;
    }
    
    .icon {
      width: 16px;
      height: 16px;
      display: inline-block;
      vertical-align: middle;
      margin-right: 4px;
    }
    
    .attachment-info {
      flex: 1;
    }
    
    .attachment-name {
      font-weight: 600;
      color: #00aff4;
      font-size: 14px;
    }
    
    .attachment-size {
      font-size: 12px;
      color: #72767d;
      margin-top: 2px;
    }
    
    .embed {
      margin-top: 12px;
      border-left: 4px solid #5865f2;
      background: #2f3136;
      border-radius: 8px;
      padding: 16px;
      max-width: 520px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .embed-title {
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 8px;
      font-size: 16px;
    }
    
    .embed-description {
      color: #dcddde;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .embed-footer {
      margin-top: 12px;
      font-size: 12px;
      color: #72767d;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .system-message {
      text-align: center;
      color: #72767d;
      font-size: 14px;
      font-style: italic;
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      margin: 20px;
      border-radius: 8px;
    }
    
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #202225, transparent);
      margin: 20px 0;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 0;
        overflow-x: hidden;
      }
      
      .container {
        border-radius: 0;
        margin: 0;
        width: 100%;
        max-width: 100%;
      }
      
      .header {
        padding: 20px 16px;
      }
      
      .header h1 {
        font-size: 22px;
      }
      
      .header-info {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .header-info-item {
        padding: 10px 12px;
      }
      
      .messages {
        padding: 12px 8px;
      }
      
      .message {
        gap: 12px;
        padding: 4px 8px;
      }
      
      .avatar {
        width: 36px;
        height: 36px;
        font-size: 14px;
      }
      
      .message-author {
        font-size: 15px;
      }
      
      .message-text {
        font-size: 15px;
      }
      
      .embed {
        max-width: 100%;
      }
    }
    
    @media print {
      body {
        background: #ffffff;
      }
      
      .container {
        box-shadow: none;
        border: 1px solid #ddd;
      }
      
      .header {
        background: #5865f2;
      }
      
      .message:hover {
        background: transparent;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <svg class="header-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          <path d="M14 2v6h6"/>
          <path d="M16 13H8"/>
          <path d="M16 17H8"/>
          <path d="M10 9H8"/>
        </svg>
        Talep Transkripti
      </h1>
      <div class="header-info">
        <div class="header-info-item">
          <span class="header-info-label">Kanal</span>
          <span class="header-info-value">#${escapeHtml(channel.name)}</span>
        </div>
        <div class="header-info-item">
          <span class="header-info-label">Sunucu</span>
          <span class="header-info-value">${escapeHtml(channel.guild.name)}</span>
        </div>
        <div class="header-info-item">
          <span class="header-info-label">Oluşturulma</span>
          <span class="header-info-value">${channel.createdAt.toLocaleString('tr-TR')}</span>
        </div>
        <div class="header-info-item">
          <span class="header-info-label">Kapatılma</span>
          <span class="header-info-value">${new Date().toLocaleString('tr-TR')}</span>
        </div>
        <div class="header-info-item">
          <span class="header-info-label">Kapatan</span>
          <span class="header-info-value">${escapeHtml(closedByUser.tag)}</span>
        </div>
        <div class="header-info-item">
          <span class="header-info-label">Toplam Mesaj</span>
          <span class="header-info-value">${messages.length}</span>
        </div>
      </div>
    </div>
    
    <div class="messages">
      ${messages.map(message => {
        const isBot = message.author.bot;
        const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 64 }) || message.author.defaultAvatarURL;
        const username = message.author.username;
        const discriminator = message.author.discriminator !== '0' ? `#${message.author.discriminator}` : '';
        const fullTag = `${username}${discriminator}`;
        const timestamp = message.createdAt.toLocaleString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        let content = '';
        
        if (message.content) {
          // Discord markdown ve linkleri işle
          let processedContent = escapeHtml(message.content);
          // Linkleri işle
          processedContent = processedContent.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank">$1</a>'
          );
          // Bold (**text**)
          processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          // Italic (*text*)
          processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
          // Code (`code`)
          processedContent = processedContent.replace(/`([^`]+)`/g, '<code style="background: #2f3136; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
          // Yeni satırları işle
          processedContent = processedContent.replace(/\n/g, '<br>');
          
          content = `<div class="message-text">${processedContent}</div>`;
        } else {
          content = '<div class="message-text" style="font-style: italic; color: #72767d;">(İçerik yok)</div>';
        }
        
        // Ekler
        let attachmentsHtml = '';
        if (message.attachments.size > 0) {
          attachmentsHtml = '<div class="attachments">';
          for (const attachment of message.attachments.values()) {
            const size = formatFileSize(attachment.size || 0);
            attachmentsHtml += `
              <a href="${attachment.url}" target="_blank" class="attachment">
                <svg class="attachment-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                <div class="attachment-info">
                  <div class="attachment-name">${escapeHtml(attachment.name || 'Dosya')}</div>
                  <div class="attachment-size">${size}</div>
                </div>
              </a>
            `;
          }
          attachmentsHtml += '</div>';
        }
        
        // Embed'ler
        let embedsHtml = '';
        if (message.embeds.length > 0) {
          for (const embed of message.embeds) {
            embedsHtml += '<div class="embed">';
            if (embed.title) {
              embedsHtml += `<div class="embed-title">${escapeHtml(embed.title)}</div>`;
            }
            if (embed.description) {
              let embedDesc = escapeHtml(embed.description);
              embedDesc = embedDesc.replace(/\n/g, '<br>');
              embedsHtml += `<div class="embed-description">${embedDesc}</div>`;
            }
            if (embed.footer?.text) {
              embedsHtml += `<div class="embed-footer">${escapeHtml(embed.footer.text)}</div>`;
            }
            embedsHtml += '</div>';
          }
        }
        
        return `
          <div class="message">
            <img src="${avatarUrl}" alt="${escapeHtml(username)}" class="avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="avatar" style="background: ${getAvatarColor(message.author.id)}; display: none;">
              ${username.charAt(0).toUpperCase()}
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-author ${isBot ? 'bot' : ''}">
                  ${escapeHtml(fullTag)}
                  ${isBot ? '<span class="bot-badge">BOT</span>' : ''}
                </span>
                <span class="message-timestamp">${timestamp}</span>
              </div>
              ${content}
              ${attachmentsHtml}
              ${embedsHtml}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    
    <div class="divider"></div>
    <div class="system-message">
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      Transkript Sonu - Bu dosya ${new Date().toLocaleString('tr-TR')} tarihinde oluşturuldu.
    </div>
  </div>
</body>
</html>
  `;
  
  return html.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getAvatarColor(userId: string): string {
  // Discord benzeri renk algoritması
  const colors = [
    '#5865f2', '#f04747', '#43b581', '#faa61a', '#9b84ee',
    '#ec4545', '#fee75c', '#eb459e', '#ed4245', '#57f287',
    '#5865f2', '#f04747', '#43b581', '#faa61a', '#9b84ee'
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

