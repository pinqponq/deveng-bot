import { MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { getReactionRoleConfigs } from '../utils/database';
import { getActivePollByChannelId, removePollVote } from '../utils/apiClient';
import { handleGiveawayReactionRemove } from '../utils/giveawaySender';
import { botCanAssignRole, describeRoleAssignBlock } from '../utils/roleAssignment';
import { logError } from '../utils/logger';

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

export async function handleMessageReactionRemove(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
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

    // Önce çekiliş kontrolü yap
    try {
      await handleGiveawayReactionRemove(reaction, user);
      // Eğer çekiliş mesajıysa, diğer kontrollere geçme
      const giveaway = await findGiveawayByMessageId(message.id);
      if (giveaway) {
        return;
      }
    } catch (error) {
      logError('messageReactionRemove:giveawayCheck', error, 'warn');
      // Çekiliş kontrolünde hata varsa devam et
    }

    // Anket kontrolü yap
    const poll = await getActivePollByChannelId(message.channel.id);
    if (poll && poll.messageId === message.id) {
      // Anket mesajından tepki kaldırıldı
      await handlePollReactionRemove(reaction, user, poll);
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

    // Rolü al
    const member = await message.guild.members.fetch(user.id);
    const role = message.guild.roles.cache.get(emojiConfig.roleId);
    
    if (!role) {
      console.error(`[ERROR] Rol bulunamadı: ${emojiConfig.roleId}`);
      return;
    }

    if (member.roles.cache.has(role.id)) {
      const check = botCanAssignRole(message.guild, role);
      if (!check.ok) {
        console.error(`[ERROR] Tepki-rol alınamadı (${describeRoleAssignBlock(check.reason!)}): ${role.name} (${role.id})`);
        return;
      }
      await member.roles.remove(role).catch((error) => logError('messageReactionRemove:removeRole', error, 'warn'));
      console.log(`[INFO] ${user.tag} kullanıcısından ${role.name} rolü alındı (Emoji: ${emojiString})`);
    }
  } catch (error) {
    console.error('[ERROR] MessageReactionRemove event handler hatası:', error);
  }
}

/**
 * Anket tepkisi kaldırma işleme
 */
async function handlePollReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  poll: import('../types/database').PollData
): Promise<void> {
  try {
    if (user.bot) {
      return;
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
      return;
    }

    // Oy kaldır
    await removePollVote(poll.id, option.id, user.id);
  } catch (error) {
    console.error('[ERROR] Anket tepkisi kaldırma hatası:', error);
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
