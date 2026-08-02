import { MessageReaction, User, ButtonInteraction, StringSelectMenuInteraction, GuildMember, PartialMessageReaction, PartialUser, EmbedBuilder } from 'discord.js';
import { getReactionRoleConfigs } from '../utils/database';
import type { ReactionRoleData, ReactionRoleMenuData } from '../types/database';
import { getActivePollByChannelId, addPollVote, getUserVotesForPoll, removePollVote, apiRequest } from '../utils/apiClient';
import { handleGiveawayReactionAdd } from '../utils/giveawaySender';
import { botCanAssignRole, describeRoleAssignBlock } from '../utils/roleAssignment';
import { logError } from '../utils/logger';
import { isInteractionExpiredOrAcked, safeDeferReply, safeEphemeralReply } from '../utils/interactionSafe';

// Discord emoji formatından Unicode emoji'ye mapping
const DISCORD_EMOJI_TO_UNICODE: Record<string, string> = {
  'warning': '⚠️',
  'white_check_mark': '✅',
  'x': '❌',
  'check': '✅',
  'cross': '❌',
  'thumbsup': '👍',
  'thumbsdown': '👎',
  'heart': '❤️',
  'star': '⭐',
  'fire': '🔥',
  'tada': '🎉',
  'confetti_ball': '🎊',
  'balloon': '🎈',
  'gift': '🎁',
  'trophy': '🏆',
  'medal': '🏅',
  '1st_place_medal': '🥇',
  '2nd_place_medal': '🥈',
  '3rd_place_medal': '🥉',
  'game_die': '🎲',
  'video_game': '🎮',
  'art': '🎨',
  'musical_note': '🎵',
  'loudspeaker': '📢',
  'bell': '🔔',
  'mega': '📣',
};

export async function handleMessageReactionAdd(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
  try {
    // Bot'un kendi tepkilerini yok say
    if (user.bot) {
      return;
    }

    // Partial reaction'ları fetch et
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('[ERROR] Reaction fetch hatası:', error);
        return;
      }
    }

    // Mesaj cache'te yoksa veya partial ise guild bilgisi gelmez; çekiliş vb. işlemler burada takılıyordu
    if (reaction.message.partial) {
      try {
        await reaction.message.fetch();
      } catch (error) {
        console.error('[ERROR] Reaction mesajı fetch hatası:', error);
        return;
      }
    }

    const message = reaction.message;
    if (!message.guild) {
      return;
    }

    void import('../utils/guildAnalyticsIngest').then(({ ingestReactionAnalytics }) =>
      ingestReactionAnalytics(message.guild!.id, user.id)
    );

    // Hatırlatıcı silme kontrolü (🗑️ tepkisi)
    if (reaction.emoji.name === '🗑️' && message.embeds.length > 0) {
      const embed = message.embeds[0];
      const footerText = embed.footer?.text || '';
      
      // Footer'dan hatırlatıcı ID'sini çıkar (format: "Hatırlatıcı ID: 123 | ...")
      const reminderIdMatch = footerText.match(/Hatırlatıcı ID: (\d+)/);
      if (reminderIdMatch) {
        const reminderId = parseInt(reminderIdMatch[1], 10);
        
        // Kullanıcının hatırlatıcısı olup olmadığını kontrol et
        try {
          const reminders = await apiRequest<Array<{
            id: number;
            userId?: string;
          }>>(`/api/Reminder/guild/${message.guild.id}/user/${user.id}`, {
            method: 'GET',
          });

          // Kullanıcının hatırlatıcıları listesinde bu ID var mı kontrol et
          const reminder = reminders?.find(r => r.id === reminderId);
          
          if (reminder) {
            // Hatırlatıcıyı sil
            try {
              await apiRequest(`/api/Reminder/${reminderId}`, {
                method: 'DELETE',
              });

              // Mesajı güncelle
              const updatedEmbed = new EmbedBuilder(embed.toJSON())
                .setColor('#FF0000')
                .setTitle('🗑️ Hatırlatıcı Silindi')
                .setFooter({ text: `Bu hatırlatıcı ${user.username} tarafından silindi` })
                .setTimestamp();

              await message.edit({ embeds: [updatedEmbed] });
              await reaction.remove();
              
              // Kullanıcıya onay mesajı gönder
              try {
                await user.send(`✅ Hatırlatıcı #${reminderId} başarıyla silindi!`);
              } catch (error) {
                logError('messageReactionAdd:reminderDeletedDm', error, 'debug');
                // DM gönderilemezse sessizce devam et
              }
            } catch (error) {
              console.error(`[ERROR] Hatırlatıcı silinemedi (ID: ${reminderId}):`, error);
              await reaction.remove();
              try {
                await user.send(`❌ Hatırlatıcı silinirken bir hata oluştu!`);
              } catch (error) {
                logError('messageReactionAdd:reminderDeleteErrorDm', error, 'debug');
                // DM gönderilemezse sessizce devam et
              }
            }
          } else {
            // Kullanıcının hatırlatıcısı değil
            await reaction.remove();
            try {
              await user.send(`❌ Bu hatırlatıcı size ait değil!`);
            } catch (error) {
              logError('messageReactionAdd:reminderNotOwnedDm', error, 'debug');
              // DM gönderilemezse sessizce devam et
            }
          }
        } catch (error) {
          console.error('[ERROR] Hatırlatıcı kontrolü hatası:', error);
        }
        
        return; // Hatırlatıcı kontrolü yapıldı, diğer kontrollere geçme
      }
    }

    // Önce çekiliş kontrolü yap
    try {
      await handleGiveawayReactionAdd(reaction, user);
      // Eğer çekiliş mesajıysa, diğer kontrollere geçme
      const giveaway = await findGiveawayByMessageId(message.id);
      if (giveaway) {
        return;
      }
    } catch (error) {
      logError('messageReactionAdd:giveawayCheck', error, 'warn');
      // Çekiliş kontrolünde hata varsa devam et
    }

    // Anket kontrolü yap. API/Redis düşükken bu çağrı fırlarsa reaction-role akışı BLOKE
    // OLMAMALI (fail-open): hatayı yutup tepki-rol mantığına devam ederiz.
    let poll: Awaited<ReturnType<typeof getActivePollByChannelId>> | null = null;
    try {
      poll = await getActivePollByChannelId(message.channel.id);
    } catch (error) {
      logError('messageReactionAdd:pollCheck', error, 'warn');
      poll = null;
    }
    if (poll && poll.messageId === message.id) {
      // Anket mesajına tepki eklendi
      await handlePollReaction(reaction, user, poll);
      return;
    }

    const configs = await getReactionRoleConfigs(message.guild.id);
    const config = configs.find((c) => c.messageId === message.id);
    if (!config) {
      return;
    }

    // Emoji'yi kontrol et (sadece enabled olanlar)
    // Custom emoji için format: <:name:id> veya <a:name:id> (animated)
    const emojiString = reaction.emoji.id 
      ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>` 
      : reaction.emoji.name || '';
    
    // Discord emoji formatı (:warning: gibi)
    const discordEmojiFormat = `:${reaction.emoji.name}:`;
    
    // Veritabanındaki emoji'lerle eşleştir
    const emojiConfig = config.emojis.find(e => {
      if (!e.enabled) return false;
      
      // Custom emoji kontrolü (<:name:id> veya <a:name:id>)
      if (reaction.emoji.id) {
        const dbEmojiMatch = e.emoji.match(/<a?:(\w+):(\d+)>/);
        if (dbEmojiMatch && dbEmojiMatch[2] === reaction.emoji.id) {
          return true;
        }
      }
      
      // Discord emoji formatı kontrolü (:warning: gibi)
      if (e.emoji === discordEmojiFormat) {
        return true;
      }
      
      // Discord emoji formatından Unicode'a çevrilmiş hali kontrolü
      if (e.emoji.startsWith(':') && e.emoji.endsWith(':')) {
        const dbEmojiName = e.emoji.slice(1, -1).toLowerCase();
        const unicodeEmoji = DISCORD_EMOJI_TO_UNICODE[dbEmojiName];
        if (unicodeEmoji && !reaction.emoji.id && reaction.emoji.name === unicodeEmoji) {
          return true;
        }
      }
      
      // Unicode emoji kontrolü (direkt string karşılaştırması)
      if (!reaction.emoji.id && e.emoji === reaction.emoji.name) {
        return true;
      }
      
      // Tam string eşleşmesi
      if (e.emoji === emojiString) {
        return true;
      }
      
      return false;
    });

    if (!emojiConfig) {
      return;
    }

    // Rolü ver
    const member = await message.guild.members.fetch(user.id);
    const role = message.guild.roles.cache.get(emojiConfig.roleId);
    
    if (!role) {
      console.error(`[ERROR] Rol bulunamadı: ${emojiConfig.roleId}`);
      return;
    }

    if (!member.roles.cache.has(role.id)) {
      // Rol atamadan önce merkezi ön-kontrol: ManageRoles izni, hiyerarşi, managed/@everyone.
      // Böylece bot rolü veremeyecekse 50013 yerine anlaşılır bir log bırakırız.
      const check = botCanAssignRole(message.guild, role);
      if (!check.ok) {
        console.error(`[ERROR] Tepki-rol verilemedi (${describeRoleAssignBlock(check.reason!)}): ${role.name} (${role.id})`);
        return;
      }
      await member.roles.add(role).catch((error) => logError('messageReactionAdd:addRole', error, 'warn'));
      console.log(`[INFO] ${user.tag} kullanıcısına ${role.name} rolü verildi (Emoji: ${emojiString})`);
    }
  } catch (error) {
    console.error('[ERROR] MessageReactionAdd event handler hatası:', error);
  }
}

export async function handleReactionRoleButton(interaction: ButtonInteraction): Promise<void> {
  let didDefer = false;
  try {
    if (!interaction.guild || !interaction.member) {
      return;
    }

    const customId = interaction.customId;

    // Custom ID formatı: reaction_role_button_{buttonId}_{roleId}
    if (!customId.startsWith('reaction_role_button_')) {
      return;
    }

    if (!(await safeDeferReply(interaction, true, 'messageReactionAdd:buttonDefer'))) {
      return;
    }
    didDefer = true;

    // Format: reaction_role_button_{buttonId}_{roleId}
    const parts = customId.replace('reaction_role_button_', '').split('_');
    let roleId: string | undefined;
    if (parts.length >= 2) {
      roleId = parts[parts.length - 1];
    } else if (parts.length === 1) {
      const buttonId = parseInt(parts[0], 10);
      if (!isNaN(buttonId)) {
        const configs = await getReactionRoleConfigs(interaction.guild.id);
        for (const c of configs) {
          const b = c.buttons?.find((btn) => btn.id === buttonId);
          if (b) {
            roleId = b.roleId;
            break;
          }
        }
      }
    }

    const role = roleId ? interaction.guild.roles.cache.get(roleId) : undefined;

    if (!role) {
      await interaction.editReply({ content: 'Rol bulunamadı!' });
      return;
    }

    const assignCheck = botCanAssignRole(interaction.guild, role);
    if (!assignCheck.ok) {
      const detail = assignCheck.reason === 'hierarchy'
        ? 'botun rolü, verilecek rolden yukarıda olmalı (Sunucu Ayarları → Roller).'
        : describeRoleAssignBlock(assignCheck.reason!) + '.';
      await interaction.editReply({ content: `Bu rolü veremem: ${detail}` });
      return;
    }

    let member: GuildMember;
    try {
      member = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
    } catch {
      await interaction.editReply({ content: 'Üye bilgisi güncellenemedi. Tekrar dene.' });
      return;
    }

    // Butonlar sadece rol verir — zaten varsa "verildi" deme
    if (member.roles.cache.has(role.id)) {
      await interaction.editReply({ content: `${role.name} rolü zaten üzerinizde.` });
      return;
    }

    await member.roles.add(role);
    await interaction.editReply({ content: `${role.name} rolü verildi.` });
  } catch (error: unknown) {
    if (isInteractionExpiredOrAcked(error)) {
      logError('messageReactionAdd:buttonExpired', error, 'debug');
      return;
    }
    console.error('[ERROR] ReactionRoleButton handler hatası:', error);
    try {
      if (didDefer) {
        await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((e) => {
          if (!isInteractionExpiredOrAcked(e)) logError('messageReactionAdd:buttonErrorEditReply', e, 'debug');
        });
      } else {
        await safeEphemeralReply(interaction, 'Bir hata oluştu!', 'messageReactionAdd:buttonErrorReply');
      }
    } catch (error) {
      logError('messageReactionAdd:reactionRoleButtonErrorReply', error, 'debug');
    }
  }
}

export async function handleReactionRoleMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  try {
    if (!interaction.guild || !interaction.member) {
      return;
    }

    const member = interaction.member as GuildMember;
    const customId = interaction.customId;

    console.log(`[DEBUG] Select menu interaction - customId: ${customId}`);

    // Custom ID formatı: reaction_role_menu_{menuId}
    if (!customId.startsWith('reaction_role_menu_')) {
      console.log(`[DEBUG] Custom ID formatı uyumsuz: ${customId}`);
      return;
    }

    if (!(await safeDeferReply(interaction, true, 'messageReactionAdd:menuDefer'))) {
      return;
    }

    const configs = await getReactionRoleConfigs(interaction.guild.id);
    if (!configs.length) {
      console.log(`[DEBUG] Config bulunamadı - guildId: ${interaction.guild.id}`);
      await interaction.editReply({ content: 'Tepki rol sistemi bulunamadı!' });
      return;
    }

    const menuIdStr = customId.replace('reaction_role_menu_', '');
    const menuId = parseInt(menuIdStr, 10);
    
    console.log(`[DEBUG] MenuId parse - String: "${menuIdStr}", Number: ${menuId}, IsNaN: ${isNaN(menuId)}`);

    if (isNaN(menuId)) {
      console.error(`[ERROR] MenuId parse edilemedi: ${menuIdStr}`);
      await interaction.editReply({ content: 'Menü ID geçersiz!' });
      return;
    }

    let menu: ReactionRoleMenuData | undefined;
    let config: ReactionRoleData = configs[0];
    for (const c of configs) {
      const m = c.menus?.find((mm) => mm.id === menuId);
      if (m) {
        menu = m;
        config = c;
        break;
      }
    }

    if (!menu) {
      console.error(`[ERROR] Menü bulunamadı - menuId: ${menuId}`);
      await interaction.editReply({ content: 'Menü bulunamadı!' });
      return;
    }

    console.log(`[DEBUG] Config menus - panelId: ${config.id}, menuId: ${menu.id}`);

    console.log(`[DEBUG] Menü bulundu - ID: ${menu.id}, Enabled: ${menu.enabled}, Options: ${menu.options?.length || 0}`);

    const selectedValues = interaction.values;
    console.log(`[DEBUG] Seçilen değerler: ${JSON.stringify(selectedValues)}`);
    
    const rolesToAdd: string[] = [];
    const rolesToRemove: string[] = [];

    // Seçilen değerler formatı: option_{optionId}_{roleId}
    const selectedRoleIds: string[] = [];
    const selectedOptionIds: number[] = [];
    
    for (const value of selectedValues) {
      if (value.startsWith('option_')) {
        // Format: option_{optionId}_{roleId}
        // Örnek: option_123_4567890123456789 -> optionId: 123, roleId: 4567890123456789
        const withoutPrefix = value.replace('option_', '');
        const firstUnderscoreIndex = withoutPrefix.indexOf('_');
        
        if (firstUnderscoreIndex > 0) {
          const optionIdStr = withoutPrefix.substring(0, firstUnderscoreIndex);
          const roleId = withoutPrefix.substring(firstUnderscoreIndex + 1);
          const optionId = parseInt(optionIdStr, 10);
          
          if (!isNaN(optionId) && roleId) {
            selectedOptionIds.push(optionId);
            selectedRoleIds.push(roleId);
            console.log(`[DEBUG] Parse edildi - optionId: ${optionId}, roleId: ${roleId}`);
          } else {
            console.error(`[ERROR] Parse hatası - value: ${value}, optionId: ${optionIdStr}, roleId: ${roleId}`);
          }
        } else {
          console.error(`[ERROR] Format hatası - value: ${value}`);
        }
      } else {
        // Eski format (geriye dönük uyumluluk) - direkt roleId
        selectedRoleIds.push(value);
        console.log(`[DEBUG] Eski format - roleId: ${value}`);
      }
    }

    console.log(`[DEBUG] Seçilen option ID'leri: ${JSON.stringify(selectedOptionIds)}`);
    console.log(`[DEBUG] Seçilen role ID'leri: ${JSON.stringify(selectedRoleIds)}`);

    // Seçilen rolleri işle
    for (const roleId of selectedRoleIds) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        console.warn(`[WARN] Rol bulunamadı: ${roleId}`);
        continue;
      }

      if (member.roles.cache.has(role.id)) {
        rolesToRemove.push(roleId);
        console.log(`[DEBUG] Rol kaldırılacak: ${role.name} (${roleId})`);
      } else {
        rolesToAdd.push(roleId);
        console.log(`[DEBUG] Rol eklenecek: ${role.name} (${roleId})`);
      }
    }

    // Mevcut menü seçeneklerindeki rolleri kontrol et (sadece enabled olanlar)
    // Eğer kullanıcı bir seçeneği seçmediyse ve o seçeneğin rolü varsa, rolü kaldır
    if (menu.options && menu.options.length > 0) {
      for (const option of menu.options) {
        if (!option.enabled) continue; // Sadece enabled olanları kontrol et
        
        // Eğer bu seçenek seçilmediyse ve kullanıcının bu rolü varsa, kaldır
        if (!selectedOptionIds.includes(option.id) && member.roles.cache.has(option.roleId)) {
          rolesToRemove.push(option.roleId);
          console.log(`[DEBUG] Seçilmeyen seçenek için rol kaldırılacak: ${option.label} (${option.roleId})`);
        }
      }
    }

    // Rolleri ekle. Her rol için merkezi ön-kontrol (ManageRoles/hiyerarşi/managed) + per-rol
    // try/catch: tek bir rol verilemezse döngü kırılmasın, diğerleri uygulanmaya devam etsin.
    const addedIds: string[] = [];
    for (const roleId of rolesToAdd) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) continue;
      const check = botCanAssignRole(interaction.guild, role);
      if (!check.ok) {
        console.warn(`[WARN] Menü rolü verilemedi (${describeRoleAssignBlock(check.reason!)}): ${role.name} (${roleId})`);
        continue;
      }
      try {
        await member.roles.add(role);
        addedIds.push(roleId);
      } catch (error) {
        logError('messageReactionAdd:menuAddRole', error, 'warn');
      }
    }

    // Rolleri kaldır (kaldırma da ManageRoles + hiyerarşi gerektirir).
    const removedIds: string[] = [];
    for (const roleId of rolesToRemove) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) continue;
      const check = botCanAssignRole(interaction.guild, role);
      if (!check.ok) {
        console.warn(`[WARN] Menü rolü kaldırılamadı (${describeRoleAssignBlock(check.reason!)}): ${role.name} (${roleId})`);
        continue;
      }
      try {
        await member.roles.remove(role);
        removedIds.push(roleId);
      } catch (error) {
        logError('messageReactionAdd:menuRemoveRole', error, 'warn');
      }
    }

    const addedRoles = addedIds.map(id => interaction.guild!.roles.cache.get(id)?.name).filter(Boolean);
    const removedRoles = removedIds.map(id => interaction.guild!.roles.cache.get(id)?.name).filter(Boolean);

    let response = '';
    if (addedRoles.length > 0) {
      response += `Rol verildi: ${addedRoles.join(', ')}\n`;
    }
    if (removedRoles.length > 0) {
      response += `Rol alındı: ${removedRoles.join(', ')}\n`;
    }
    if (!response) {
      response = 'Değişiklik yapılmadı.';
    }

    await interaction.editReply({ content: response.trim() });
  } catch (error) {
    if (isInteractionExpiredOrAcked(error)) {
      logError('messageReactionAdd:menuExpired', error, 'debug');
      return;
    }
    console.error('[ERROR] ReactionRoleMenu handler hatası:', error);
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('messageReactionAdd:reactionRoleMenuErrorReply', error, 'debug'));
    } else {
      await safeEphemeralReply(interaction, 'Bir hata oluştu!', 'messageReactionAdd:reactionRoleMenuErrorReply');
    }
  }
}

/**
 * MessageId'ye göre çekiliş bulur
 */
async function findGiveawayByMessageId(messageId: string): Promise<any | null> {
  try {
    const { getActiveGiveaways } = await import('../utils/apiClient');
    const activeGiveaways = await getActiveGiveaways();
    return activeGiveaways.find(g => g.messageId === messageId) || null;
  } catch (error) {
    return null;
  }
}

/**
 * Anket tepkisi işleme
 */
async function handlePollReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  poll: import('../types/database').PollData
): Promise<void> {
  try {
    if (user.bot) {
      return;
    }

    // Kullanıcının rol izinlerini kontrol et
    if (poll.rolePermissions && poll.rolePermissions.length > 0) {
      const member = reaction.message.guild?.members.cache.get(user.id);
      if (!member) {
        return;
      }

      // İzin verilen roller
      const allowedRoles = poll.rolePermissions.filter(rp => rp.isAllowed).map(rp => rp.roleId);
      // İzin verilmeyen roller
      const deniedRoles = poll.rolePermissions.filter(rp => !rp.isAllowed).map(rp => rp.roleId);

      // Eğer izin verilen roller varsa, kullanıcının bu rollerden birine sahip olması gerekir
      if (allowedRoles.length > 0) {
        const hasAllowedRole = member.roles.cache.some(role => allowedRoles.includes(role.id));
        if (!hasAllowedRole) {
          // Kullanıcıya özel mesaj gönder
          try {
            await user.send('Bu ankete oy verme yetkiniz yok. Gerekli rollere sahip değilsiniz.');
          } catch (error) {
            logError('messageReactionAdd:pollNoAllowedRoleDm', error, 'debug');
            // DM gönderilemezse sessizce devam et
          }
          // Sadece kullanıcının tepkisini kaldır; seçenek reaksiyonunu mesajdan silme.
          await removeUserReaction(reaction, user);
          return;
        }
      }

      // Eğer izin verilmeyen roller varsa, kullanıcının bu rollerden birine sahip olmaması gerekir
      if (deniedRoles.length > 0) {
        const hasDeniedRole = member.roles.cache.some(role => deniedRoles.includes(role.id));
        if (hasDeniedRole) {
          // Kullanıcıya özel mesaj gönder
          try {
            await user.send('Bu ankete oy verme yetkiniz yok. Bu rol size oy verme izni vermiyor.');
          } catch (error) {
            logError('messageReactionAdd:pollDeniedRoleDm', error, 'debug');
            // DM gönderilemezse sessizce devam et
          }
          // Sadece kullanıcının tepkisini kaldır; seçenek reaksiyonunu mesajdan silme.
          await removeUserReaction(reaction, user);
          return;
        }
      }
    }

    // Emoji'yi kontrol et
    const emojiString = reaction.emoji.id 
      ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>` 
      : reaction.emoji.name || '';

    // Seçeneği bul
    const sortedOptions = [...poll.options].sort((a, b) => a.orderIndex - b.orderIndex);
    const option = sortedOptions.find(opt => {
      if (opt.emoji) {
        // Custom emoji kontrolü
        if (reaction.emoji.id) {
          const dbEmojiMatch = opt.emoji.match(/<a?:(\w+):(\d+)>/);
          if (dbEmojiMatch && dbEmojiMatch[2] === reaction.emoji.id) {
            return true;
          }
        }
        // Unicode emoji kontrolü
        if (!reaction.emoji.id && opt.emoji === emojiString) {
          return true;
        }
      }
      return false;
    });

    if (!option) {
      // Geçersiz tepki, kaldır
      await removeUserReaction(reaction, user);
      return;
    }

    // Kullanıcının mevcut oylarını kontrol et
    const userVotes = await getUserVotesForPoll(poll.id, user.id);
    
    // Çoklu oy kontrolü
    if (!poll.allowMultipleVotes && userVotes.length > 0) {
      // Tekli oy modunda, eski oyu kaldır
      for (const oldOptionId of userVotes) {
        await removePollVote(poll.id, oldOptionId, user.id);
        // Discord'dan eski tepkiyi de kaldır
        const oldOption = poll.options.find(opt => opt.id === oldOptionId);
        if (oldOption && oldOption.emoji) {
          try {
            const oldReaction = reaction.message.reactions.cache.get(oldOption.emoji);
            if (oldReaction && oldReaction.users.cache.has(user.id)) {
              await oldReaction.users.remove(user.id);
            }
          } catch (error) {
            logError('messageReactionAdd:removeOldVoteReaction', error, 'debug');
            // Tepki kaldırılamazsa sessizce devam et
          }
        }
      }
    }
    
    // Aynı seçeneğe tekrar oy vermeyi engelle
    if (userVotes.includes(option.id)) {
      return;
    }
    
    // Oy ekle
    const success = await addPollVote(poll.id, option.id, user.id);
    if (!success) {
      console.warn(`[WARN] Anket oyu API'ye yazılamadı; tepki korunuyor (PollId: ${poll.id}, OptionId: ${option.id}, UserId: ${user.id})`);
    }
  } catch (error) {
    console.error('[ERROR] Anket tepkisi işleme hatası:', error);
  }
}

async function removeUserReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  try {
    await reaction.users.remove(user.id);
  } catch (error) {
    logError('messageReactionAdd:removeUserReaction', error, 'debug');
    // Kullanıcı tepkisi kaldırılamazsa seçenek reaksiyonunu komple silmeye çalışma.
  }
}

