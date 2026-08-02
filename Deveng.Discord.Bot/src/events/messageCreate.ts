import { Message } from 'discord.js';
import { createHash } from 'crypto';
import { getModeratorConfig } from '../utils/database';
import { createModerationActionLog, createModerationUserNotice, enqueueAIModeration, getAIModerationSettings, getCustomCommands } from '../utils/apiClient';
import { getTextChannel } from '../utils/channelHelper';
import { buildSingleEmbedFromConfig, toEmbedConfig } from '../utils/buildEmbedFromConfig';
import { logError } from '../utils/logger';

const customCommandMessageCooldowns = new Map<string, number>();

export async function handleMessageCreate(message: Message): Promise<void> {
  try {
    // Bot mesajlarını yok say
    if (message.author.bot) {
      return;
    }

    // Sadece sunucu mesajlarını işle
    if (!message.guild || !message.member) {
      return;
    }

    // Level sistemi için XP verme
    await handleLevelXp(message);

    // Moderator kontrolü
    await checkModeratorRules(message);

    await enqueueAIModerationIfEnabled(message);

    await handleCustomCommandMessageTriggers(message);

    const { handleAutomationMessageCreate } = await import('../automation/automationEngine');
    await handleAutomationMessageCreate(message);

    const { ingestMessageAnalytics } = await import('../utils/guildAnalyticsIngest');
    await ingestMessageAnalytics(message);
  } catch (error) {
    console.error('[ERROR] MessageCreate event handler hatası:', error);
  }
}

async function enqueueAIModerationIfEnabled(message: Message): Promise<void> {
  if (!message.guild || !message.content.trim()) return;

  try {
    const settings = await getAIModerationSettings(message.guild.id);
    if (!settings?.enabled) return;

    const excluded = settings.excludedChannelIdsJson
      ? JSON.parse(settings.excludedChannelIdsJson) as string[]
      : [];
    if (Array.isArray(excluded) && excluded.includes(message.channel.id)) return;
    if (Math.random() > Number(settings.sampleRate ?? 1)) return;

    const redacted = message.content
      .replace(/https?:\/\/\S+/gi, '[url]')
      .replace(/<@!?\d+>/g, '[mention]')
      .slice(0, 500);

    await enqueueAIModeration({
      guildId: message.guild.id,
      channelId: message.channel.id,
      messageId: message.id,
      userIdHash: createHash('sha256').update(`${message.guild.id}:${message.author.id}`).digest('hex'),
      contentHash: createHash('sha256').update(message.content).digest('hex'),
      contentPreviewRedacted: redacted,
    });
  } catch (error) {
    console.warn(`[WARN] AI moderasyon kuyruğuna eklenemedi (GuildId: ${message.guild?.id}):`, error);
  }
}

async function handleCustomCommandMessageTriggers(message: Message): Promise<void> {
  if (!message.guild || !message.member || !message.content.trim()) return;

  try {
    const commands = await getCustomCommands(message.guild.id);
    const messageCommands = commands.filter((command) =>
      command.enabled && (command.scope === 'message' || command.scope === 'both') && command.useRegex && command.triggerPattern
    );

    for (const command of messageCommands) {
      let matched = false;
      try {
        matched = new RegExp(command.triggerPattern!, 'i').test(message.content);
      } catch {
        continue;
      }

      if (!matched) continue;
      if (!checkMessageCommandCooldown(message.guild.id, message.author.id, command.id, command.cooldownSeconds ?? 2)) return;

      if (command.actionType === 0 && command.targetChannelId && command.message) {
        const channel = getTextChannel(message.guild, command.targetChannelId);
        await channel?.send(command.message);
      } else if (command.actionType === 1 && command.message) {
        await message.reply(command.message);
      } else if ((command.actionType === 2 || command.actionType === 3) && command.roleId) {
        const role = message.guild.roles.cache.get(command.roleId);
        if (!role) return;
        if (command.actionType === 2) await message.member.roles.add(role);
        if (command.actionType === 3) await message.member.roles.remove(role);
      }
      return;
    }
  } catch (error) {
    console.warn('[WARN] Özel komut mesaj tetikleyicileri çalıştırılamadı:', error);
  }
}

function checkMessageCommandCooldown(guildId: string, userId: string, commandId: number, cooldownSeconds: number): boolean {
  const cooldownMs = Math.max(0, cooldownSeconds) * 1000;
  if (cooldownMs === 0) return true;

  const key = `${guildId}:${commandId}:${userId}`;
  const now = Date.now();
  const nextAllowedAt = customCommandMessageCooldowns.get(key) ?? 0;
  if (nextAllowedAt > now) return false;

  customCommandMessageCooldowns.set(key, now + cooldownMs);
  return true;
}


// =============================================
// MODERATOR İŞLEVLERİ
// =============================================

/**
 * Moderator kurallarını kontrol eder ve gerekli aksiyonları alır
 */
async function checkModeratorRules(message: Message): Promise<void> {
  try {
    if (!message.guild || !message.member) {
      return;
    }

    // Moderator config'i al
    const moderatorConfig = await getModeratorConfig(message.guild.id);
    
    // Eğer moderator aktif değilse veya config yoksa, devam et
    if (!moderatorConfig || !moderatorConfig.enabled) {
      return;
    }

    const content = message.content.toLowerCase();
    let violationFound = false;
    let violationRule: string | null = null;
    let action = 0;

    // Yasaklı Kelimeler kontrolü
    const forbiddenWordsRule = moderatorConfig.rules.find(r => r.ruleType === 'ForbiddenWords' && r.enabled);
    if (forbiddenWordsRule && forbiddenWordsRule.action > 0 && moderatorConfig.forbiddenWords.length > 0) {
      // Türkçe karakterleri normalize et (ı->i, İ->i, ş->s, Ş->s, ğ->g, Ğ->g, ü->u, Ü->u, ö->o, Ö->o, ç->c, Ç->c)
      const normalizeTurkish = (text: string): string => {
        return text
          .replace(/ı/g, 'i').replace(/İ/g, 'i')
          .replace(/ş/g, 's').replace(/Ş/g, 's')
          .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
          .replace(/ü/g, 'u').replace(/Ü/g, 'u')
          .replace(/ö/g, 'o').replace(/Ö/g, 'o')
          .replace(/ç/g, 'c').replace(/Ç/g, 'c');
      };

      const normalizedContent = normalizeTurkish(content);
      
      for (const forbiddenWord of moderatorConfig.forbiddenWords) {
        const wordLower = forbiddenWord.word.toLowerCase().trim();
        if (!wordLower) continue;
        
        const normalizedWord = normalizeTurkish(wordLower);
        
        // Kelime sınırlarını kontrol et (word boundary)
        // Regex ile kelime sınırlarını kontrol et: \b veya başlangıç/bitiş veya boşluk/noktalama
        const wordBoundaryPattern = new RegExp(
          `(^|[^a-zA-Z0-9])${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z0-9]|$)`,
          'i'
        );
        
        if (wordBoundaryPattern.test(normalizedContent)) {
          violationFound = true;
          violationRule = 'ForbiddenWords';
          action = forbiddenWordsRule.action;
          console.log(`[MODERATOR] Yasaklı kelime tespit edildi: "${forbiddenWord.word}" (GuildId: ${message.guild.id}, User: ${message.author.tag}, Mesaj: "${message.content.substring(0, 50)}")`);
          break;
        }
      }
    }

    // Tekrarlanan Yazı kontrolü
    if (!violationFound) {
      const repeatedTextRule = moderatorConfig.rules.find(r => r.ruleType === 'RepeatedText' && r.enabled);
      if (repeatedTextRule && repeatedTextRule.action > 0) {
        if (checkRepeatedText(message.content)) {
          violationFound = true;
          violationRule = 'RepeatedText';
          action = repeatedTextRule.action;
        }
      }
    }

    // Sunucu Davetleri kontrolü
    if (!violationFound) {
      const serverInvitesRule = moderatorConfig.rules.find(r => r.ruleType === 'ServerInvites' && r.enabled);
      if (serverInvitesRule && serverInvitesRule.action > 0) {
        if (checkServerInvites(message.content)) {
          violationFound = true;
          violationRule = 'ServerInvites';
          action = serverInvitesRule.action;
        }
      }
    }

    // Harici Bağlantılar kontrolü
    if (!violationFound) {
      const externalLinksRule = moderatorConfig.rules.find(r => r.ruleType === 'ExternalLinks' && r.enabled);
      if (externalLinksRule && externalLinksRule.action > 0) {
        if (checkExternalLinks(message.content)) {
          violationFound = true;
          violationRule = 'ExternalLinks';
          action = externalLinksRule.action;
        }
      }
    }

    // Aşırı Büyük Harf kontrolü
    if (!violationFound) {
      const excessiveCapsRule = moderatorConfig.rules.find(r => r.ruleType === 'ExcessiveCaps' && r.enabled);
      if (excessiveCapsRule && excessiveCapsRule.action > 0) {
        if (checkExcessiveCaps(message.content)) {
          violationFound = true;
          violationRule = 'ExcessiveCaps';
          action = excessiveCapsRule.action;
        }
      }
    }

    // Aşırı Emoji kontrolü
    if (!violationFound) {
      const excessiveEmojiRule = moderatorConfig.rules.find(r => r.ruleType === 'ExcessiveEmoji' && r.enabled);
      if (excessiveEmojiRule && excessiveEmojiRule.action > 0) {
        if (checkExcessiveEmoji(message.content)) {
          violationFound = true;
          violationRule = 'ExcessiveEmoji';
          action = excessiveEmojiRule.action;
        }
      }
    }

    // Aşırı Spoiler kontrolü
    if (!violationFound) {
      const excessiveSpoilerRule = moderatorConfig.rules.find(r => r.ruleType === 'ExcessiveSpoiler' && r.enabled);
      if (excessiveSpoilerRule && excessiveSpoilerRule.action > 0) {
        if (checkExcessiveSpoiler(message.content)) {
          violationFound = true;
          violationRule = 'ExcessiveSpoiler';
          action = excessiveSpoilerRule.action;
        }
      }
    }

    // Aşırı Bahsetme kontrolü
    if (!violationFound) {
      const excessiveMentionRule = moderatorConfig.rules.find(r => r.ruleType === 'ExcessiveMention' && r.enabled);
      if (excessiveMentionRule && excessiveMentionRule.action > 0) {
        if (checkExcessiveMention(message)) {
          violationFound = true;
          violationRule = 'ExcessiveMention';
          action = excessiveMentionRule.action;
        }
      }
    }

    // Zalgo kontrolü
    if (!violationFound) {
      const zalgoRule = moderatorConfig.rules.find(r => r.ruleType === 'Zalgo' && r.enabled);
      if (zalgoRule && zalgoRule.action > 0) {
        if (checkZalgo(message.content)) {
          violationFound = true;
          violationRule = 'Zalgo';
          action = zalgoRule.action;
        }
      }
    }

    // Spam Koruması kontrolü
    if (!violationFound) {
      const spamProtectionRule = moderatorConfig.rules.find(r => r.ruleType === 'SpamProtection' && r.enabled);
      if (spamProtectionRule && spamProtectionRule.action > 0) {
        if (await checkSpamProtection(message)) {
          violationFound = true;
          violationRule = 'SpamProtection';
          action = spamProtectionRule.action;
        }
      }
    }

    // Eğer ihlal bulunduysa, aksiyon al
    if (violationFound && action > 0) {
      console.log(`[MODERATOR] İhlal tespit edildi: ${violationRule} (Action: ${action}, GuildId: ${message.guild.id}, User: ${message.author.tag})`);
      await logModerationAction(message, action, violationRule!, 'recommended');
      await applyModeratorAction(message, action, violationRule!);
    }
  } catch (error) {
    console.error('[ERROR] Moderator kontrolü hatası:', error);
  }
}

/**
 * Tekrarlanan yazı kontrolü
 */
function checkRepeatedText(content: string): boolean {
  // Aynı karakterin 5+ kez tekrarlanması
  const repeatedCharPattern = /(.)\1{4,}/;
  if (repeatedCharPattern.test(content)) {
    return true;
  }

  // Aynı kelimenin 3+ kez tekrarlanması
  const words = content.split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 3) {
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      const count = wordCounts.get(word) || 0;
      wordCounts.set(word, count + 1);
      if (count + 1 >= 3) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Sunucu davetleri kontrolü
 */
function checkServerInvites(content: string): boolean {
  // Discord invite link pattern: discord.gg/xxx veya discord.com/invite/xxx
  const invitePattern = /discord\.(gg|com\/invite)\/[a-zA-Z0-9]+/gi;
  return invitePattern.test(content);
}

/**
 * Harici bağlantılar kontrolü
 */
function checkExternalLinks(content: string): boolean {
  // URL pattern (http/https)
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const matches = content.match(urlPattern);
  if (!matches) {
    return false;
  }

  // Discord linklerini hariç tut
  const discordDomains = ['discord.com', 'discord.gg', 'discordapp.com', 'discord.media'];
  for (const url of matches) {
    try {
      const urlObj = new URL(url);
      const isDiscordLink = discordDomains.some(domain => urlObj.hostname.includes(domain));
      if (!isDiscordLink) {
        return true; // Discord olmayan bir link bulundu
      }
    } catch {
      // Geçersiz URL, yine de kontrol et
      return true;
    }
  }

  return false;
}

/**
 * Aşırı büyük harf kontrolü (70%'den fazla)
 */
function checkExcessiveCaps(content: string): boolean {
  if (content.length < 10) {
    return false; // Kısa mesajlarda kontrol etme
  }

  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) {
    return false;
  }

  const upperCaseLetters = letters.replace(/[^A-Z]/g, '').length;
  const percentage = (upperCaseLetters / letters.length) * 100;

  return percentage > 70;
}

/**
 * Aşırı emoji kontrolü (10+ emoji)
 */
function checkExcessiveEmoji(content: string): boolean {
  let totalEmojis = 0;
  
  // Custom emoji pattern <:name:id> veya <a:name:id> (animated)
  const customEmojiPattern = /<a?:\w+:\d+>/g;
  const customEmojis = content.match(customEmojiPattern) || [];
  totalEmojis += customEmojis.length;
  
  // Emoji sequence'leri (örn: 👨‍👩‍👧‍👦) - Zero Width Joiner ile birleştirilmiş
  // Bu sequence'ler tek bir emoji olarak sayılmalı, önce bunları bul ve çıkar
  const emojiSequencePattern = /[\u{1F300}-\u{1F9FF}](?:[\u{200D}][\u{1F300}-\u{1F9FF}])+/gu;
  const sequences = content.match(emojiSequencePattern) || [];
  totalEmojis += sequences.length;
  
  // Sequence'leri içerikten çıkar (tekrar sayılmaması için)
  let contentForCounting = content;
  sequences.forEach(seq => {
    contentForCounting = contentForCounting.replace(seq, '');
  });
  
  // Unicode emoji detection - her major emoji bloğu için ayrı pattern
  // Bu şekilde daha güvenilir çalışır
  const emojiRanges = [
    /[\u{1F300}-\u{1F9FF}]/gu, // Miscellaneous Symbols and Pictographs
    /[\u{2600}-\u{26FF}]/gu, // Miscellaneous Symbols
    /[\u{2700}-\u{27BF}]/gu, // Dingbats
    /[\u{1F900}-\u{1F9FF}]/gu, // Supplemental Symbols and Pictographs
    /[\u{1F1E0}-\u{1F1FF}]/gu, // Regional Indicator Symbols (flags)
    /[\u{1F600}-\u{1F64F}]/gu, // Emoticons
    /[\u{1F680}-\u{1F6FF}]/gu, // Transport and Map Symbols
    /[\u{1F700}-\u{1F77F}]/gu, // Alchemical Symbols
    /[\u{1F780}-\u{1F7FF}]/gu, // Geometric Shapes Extended
    /[\u{1F800}-\u{1F8FF}]/gu, // Supplemental Arrows-C
    /[\u{1FA00}-\u{1FA6F}]/gu, // Chess Symbols
    /[\u{1FA70}-\u{1FAFF}]/gu, // Symbols and Pictographs Extended-A
  ];
  
  // Her range için eşleşmeleri say
  for (const pattern of emojiRanges) {
    const matches = contentForCounting.match(pattern);
    if (matches) {
      totalEmojis += matches.length;
    }
  }
  
  // Debug log
  if (totalEmojis > 10) {
    console.log(`[MODERATOR] Aşırı emoji tespit edildi: ${totalEmojis} emoji (Custom: ${customEmojis.length}, Unicode: ${totalEmojis - customEmojis.length - sequences.length}, Sequences: ${sequences.length})`);
  }
  
  return totalEmojis > 10;
}

/**
 * Aşırı spoiler kontrolü (5+ spoiler)
 */
function checkExcessiveSpoiler(content: string): boolean {
  const spoilerPattern = /\|\|/g;
  const matches = content.match(spoilerPattern) || [];
  // Her spoiler 2 || karakteri kullanır, 5 spoiler = 10 || karakteri
  return matches.length >= 10;
}

/**
 * Aşırı bahsetme kontrolü (5+ mention)
 */
function checkExcessiveMention(message: Message): boolean {
  // Mesaj içeriğindeki toplam mention sayısını say (benzersiz değil, tüm mentionlar)
  const content = message.content;
  
  // Kullanıcı mention pattern: <@userId> veya <@!userId>
  const userMentionPattern = /<@!?\d+>/g;
  const userMentions = content.match(userMentionPattern) || [];
  
  // Rol mention pattern: <@&roleId>
  const roleMentionPattern = /<@&\d+>/g;
  const roleMentions = content.match(roleMentionPattern) || [];
  
  // Toplam mention sayısı
  const totalMentions = userMentions.length + roleMentions.length;
  
  return totalMentions > 5;
}

/**
 * Zalgo text kontrolü
 */
function checkZalgo(content: string): boolean {
  // Zalgo karakterleri: combining diacritical marks
  const zalgoPattern = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/;
  return zalgoPattern.test(content);
}

/**
 * Spam koruması kontrolü (aynı mesajın kısa sürede tekrarlanması)
 */
interface SpamCacheEntry {
  messageContent: string;
  count: number;
  timestamp: number;
}

const spamCache = new Map<string, SpamCacheEntry[]>();

function checkSpamProtection(message: Message): Promise<boolean> {
  return new Promise((resolve) => {
    if (!message.guild || !message.member) {
      resolve(false);
      return;
    }

    const cacheKey = `${message.guild.id}_${message.author.id}`;
    const now = Date.now();
    const messageContent = message.content.trim().toLowerCase();
    
    // Cache'den bu kullanıcının mesaj geçmişini al
    let userMessages = spamCache.get(cacheKey) || [];
    
    // 5 saniyeden eski mesajları temizle
    userMessages = userMessages.filter(entry => now - entry.timestamp < 5000);
    
    // Aynı mesaj içeriğini ara
    const sameMessageEntry = userMessages.find(entry => entry.messageContent === messageContent);
    
    if (sameMessageEntry) {
      // Aynı mesaj bulundu, sayacı artır
      sameMessageEntry.count += 1;
      sameMessageEntry.timestamp = now;
      
      // 3+ kez aynı mesaj gönderildiyse spam
      if (sameMessageEntry.count >= 3) {
        resolve(true);
        return;
      }
    } else {
      // Yeni mesaj, cache'e ekle
      userMessages.push({
        messageContent: messageContent,
        count: 1,
        timestamp: now
      });
    }
    
    // Cache'i güncelle
    spamCache.set(cacheKey, userMessages);
    
    // 30 saniye sonra cache'i temizle
    setTimeout(() => {
      const cached = spamCache.get(cacheKey);
      if (cached) {
        const filtered = cached.filter(entry => Date.now() - entry.timestamp < 5000);
        if (filtered.length === 0) {
          spamCache.delete(cacheKey);
        } else {
          spamCache.set(cacheKey, filtered);
        }
      }
    }, 30000);

    resolve(false);
  });
}

/**
 * Level sistemi için XP verme
 */
async function handleLevelXp(message: Message): Promise<void> {
  try {
    if (!message.guild || !message.member) {
      return;
    }

    const guildId = message.guild.id;
    const userId = message.author.id;
    const channelId = message.channel.id;

    const { isFeatureEnabled } = await import('../utils/apiClient');
    const levelEnabled = await isFeatureEnabled(guildId, 'level');
    
    if (!levelEnabled) {
      return;
    }

    const { getLevelSettings, addXpToUser, getUserLevel } = await import('../utils/apiClient');
    const levelSettings = await getLevelSettings(guildId);
    
    if (!levelSettings || !levelSettings.enabled) {
      return;
    }

    // Ignored channels kontrolü
    if (levelSettings.ignoredChannelIds) {
      const ignoredChannels = levelSettings.ignoredChannelIds.split(',').filter(Boolean);
      if (ignoredChannels.includes(channelId)) {
        return;
      }
    }

    // Ignored roles kontrolü
    if (levelSettings.ignoredRoleIds && message.member.roles) {
      const ignoredRoles = levelSettings.ignoredRoleIds.split(',').filter(Boolean);
      const memberRoles = message.member.roles.cache.map(r => r.id);
      if (memberRoles.some(roleId => ignoredRoles.includes(roleId))) {
        return;
      }
    }

    // Cooldown kontrolü
    const userLevel = await getUserLevel(guildId, userId);
    if (userLevel && levelSettings.cooldownSeconds > 0) {
      const lastMessageAt = userLevel.lastMessageAt ? new Date(userLevel.lastMessageAt) : null;
      if (lastMessageAt) {
        const now = new Date();
        const diffSeconds = (now.getTime() - lastMessageAt.getTime()) / 1000;
        if (diffSeconds < levelSettings.cooldownSeconds) {
          return; // Cooldown süresi dolmamış
        }
      }
    }

    // XP hesapla
    let xpToAdd: number;
    if (levelSettings.useRandomXp) {
      const min = levelSettings.xpPerMessageMin;
      const max = levelSettings.xpPerMessageMax;
      xpToAdd = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      xpToAdd = levelSettings.xpPerMessage;
    }

    // XP ekle
    const updatedUserLevel = await addXpToUser(guildId, userId, xpToAdd);
    
    if (!updatedUserLevel) {
      return;
    }

    // Her mesajda "X XP kazandınız" bildirimini yalnız kullanıcıya göster (DM)
    try {
      const xpGainTemplate = levelSettings.xpGainMessage?.trim() ||
        `**+{xp} XP** kazandınız! (Toplam: **{totalxp} XP** | Level {level})`;
      const xpGainText = xpGainTemplate
        .replace(/{xp}/g, String(xpToAdd))
        .replace(/{totalxp}/g, String(updatedUserLevel.totalXp))
        .replace(/{level}/g, String(updatedUserLevel.level));

      if (levelSettings.useEmbedForXpGain) {
        const embed = buildSingleEmbedFromConfig(
          toEmbedConfig({
            isEmbed: true,
            embedDescription: xpGainText,
            embedColor: levelSettings.xpGainEmbedColor ?? null,
            embedUseTimestamp: levelSettings.xpGainEmbedUseTimestamp,
          }),
          { defaultColor: 0x5865f2 },
        );
        await message.author.send({ embeds: [embed] }).catch((error) => logError('messageCreate:xpGainDmEmbed', error, 'debug'));
      } else {
        await message.author.send(xpGainText).catch((error) => logError('messageCreate:xpGainDmText', error, 'debug'));
      }
    } catch (error) {
      logError('messageCreate:xpGainNotify', error, 'debug');
      // Reply başarısız olursa (izin, silinmiş kanal vb.) sessizce geç
    }

    // Level atlama kontrolü
    const oldLevel = userLevel?.level || 1;
    const newLevel = updatedUserLevel.level;

    if (newLevel > oldLevel && levelSettings.notifyOnLevelUp) {
      // Level atlandı, bildirim gönder
      await sendLevelUpNotification(message, updatedUserLevel, levelSettings);
      
      // Rol ödülü kontrolü
      if (levelSettings.enableRoleRewards && levelSettings.roleRewardsJson) {
        await handleRoleRewards(message, newLevel, levelSettings.roleRewardsJson);
      }
    }
  } catch (error) {
    // Level sistemi hataları kritik değil, sadece logla
    console.error('[ERROR] Level XP verme hatası:', error);
  }
}

/**
 * Level atlama bildirimi gönder
 */
async function sendLevelUpNotification(
  message: Message,
  userLevel: any,
  levelSettings: any
): Promise<void> {
  try {
    if (!message.guild || !message.member) {
      return;
    }

    const channelId = levelSettings.notificationChannelId || message.channel.id;
    const channel = message.guild.channels.cache.get(channelId);
    
    if (!channel || !channel.isTextBased()) {
      return;
    }

    const replaceTags = (text: string) =>
      text
        .replace(/{user}/g, message.author.toString())
        .replace(/{username}/g, message.author.username)
        .replace(/{level}/g, userLevel.level.toString())
        .replace(/{xp}/g, userLevel.totalXp.toString())
        .replace(/{currentxp}/g, userLevel.currentXp.toString())
        .replace(/{nextlevelxp}/g, userLevel.xpForNextLevel.toString());

    let notificationMessage = levelSettings.notificationMessage || 
      `🎉 {user} level {level} seviyesine ulaştı! Toplam XP: {xp}`;
    notificationMessage = replaceTags(notificationMessage);

    if (levelSettings.useEmbedForNotification) {
      const embed = buildSingleEmbedFromConfig(
        toEmbedConfig({
          isEmbed: true,
          embedTitle: levelSettings.notificationEmbedTitle ?? '🎉 Level Atladın!',
          embedTitleUrl: levelSettings.notificationEmbedTitleUrl ?? null,
          embedDescription: levelSettings.notificationEmbedDescription ?? notificationMessage,
          embedColor: levelSettings.notificationEmbedColor ?? null,
          embedAuthorName: levelSettings.notificationEmbedAuthorName ?? null,
          embedAuthorIcon: levelSettings.notificationEmbedAuthorIcon ?? null,
          embedAuthorUrl: levelSettings.notificationEmbedAuthorUrl ?? null,
          embedThumbnail: levelSettings.notificationEmbedThumbnail ?? null,
          embedImage: levelSettings.notificationEmbedImage ?? null,
          embedFooter: levelSettings.notificationEmbedFooter ?? null,
          embedFooterIcon: levelSettings.notificationEmbedFooterIcon ?? null,
          embedUseTimestamp: levelSettings.notificationEmbedUseTimestamp,
          embedFieldsJson: levelSettings.notificationEmbedFieldsJson ?? null,
        }),
        {
          replaceTags,
          defaultColor: 0x5865f2,
        },
      );
      await channel.send({ embeds: [embed] });
    } else {
      await channel.send(notificationMessage);
    }
  } catch (error) {
    console.error('[ERROR] Level up bildirimi gönderme hatası:', error);
  }
}

/**
 * Rol ödüllerini uygula
 */
async function handleRoleRewards(
  message: Message,
  newLevel: number,
  roleRewardsJson: string
): Promise<void> {
  try {
    if (!message.guild || !message.member) {
      return;
    }

    const roleRewards = JSON.parse(roleRewardsJson) as Array<{
      level: number;
      roleId: string;
      removePreviousRole?: boolean;
    }>;

    // Bu level için ödül var mı?
    const reward = roleRewards.find(r => r.level === newLevel);
    if (!reward) {
      return;
    }

    const role = message.guild.roles.cache.get(reward.roleId);
    if (!role) {
      console.error(`[ERROR] Rol ödülü bulunamadı: ${reward.roleId}`);
      return;
    }

    // Önceki rolü kaldır (eğer ayarlanmışsa)
    if (reward.removePreviousRole) {
      const previousReward = roleRewards
        .filter(r => r.level < newLevel)
        .sort((a, b) => b.level - a.level)[0];
      
      if (previousReward) {
        const previousRole = message.guild.roles.cache.get(previousReward.roleId);
        if (previousRole && message.member.roles.cache.has(previousRole.id)) {
          try {
            await message.member.roles.remove(previousRole);
          } catch (error) {
            console.error(`[ERROR] Önceki rol kaldırılamadı: ${previousRole.id}`, error);
          }
        }
      }
    }

    // Yeni rolü ver
    if (!message.member.roles.cache.has(role.id)) {
      try {
        await message.member.roles.add(role);
      } catch (error) {
        console.error(`[ERROR] Rol ödülü verilemedi: ${role.id}`, error);
      }
    }
  } catch (error) {
    console.error('[ERROR] Rol ödülü uygulama hatası:', error);
  }
}

/**
 * Moderator aksiyonlarını uygular
 * 0: Devre Dışı
 * 1: Mesaj Sil
 * 2: Kullanıcıyı Uyar
 * 3: Mesajı Sil & Üyeyi Uyar
 */
async function applyModeratorAction(message: Message, action: number, ruleType: string): Promise<void> {
  try {
    if (!message.guild || !message.member) {
      return;
    }

    // Action 2 veya 3: Kullanıcıyı uyar (yalnızca DM)
    if (action === 2 || action === 3) {
      let deliveryStatus = 'sent';
      try {
        const ruleNames: Record<string, string> = {
          'ForbiddenWords': 'Yasaklı Kelime',
          'RepeatedText': 'Tekrarlanan Yazı',
          'ServerInvites': 'Sunucu Daveti',
          'ExternalLinks': 'Harici Bağlantı',
          'ExcessiveCaps': 'Aşırı Büyük Harf',
          'ExcessiveEmoji': 'Aşırı Emoji',
          'ExcessiveSpoiler': 'Aşırı Spoiler',
          'ExcessiveMention': 'Aşırı Bahsetme',
          'Zalgo': 'Zalgo Text',
          'SpamProtection': 'Spam',
        };

        const ruleName = ruleNames[ruleType] || ruleType;
        const warningMessage = `⚠️ **Moderatör Uyarısı**\n\n${message.author}, sunucu kurallarını ihlal ettiniz: **${ruleName}**\n\nLütfen kurallara uyun, aksi takdirde daha ciddi yaptırımlar uygulanabilir.`;

        // DM'de uyarı mesajı gönder
        await message.member.send(warningMessage).catch(() => {
          // DM'ler kapalı olabilir, bu normal
          deliveryStatus = 'failed_dm_closed';
          console.log(`[MODERATOR] ${message.author.tag} için DM uyarı mesajı gönderilemedi (DM'ler kapalı)`);
        });

        await logModerationNotice(message, action, ruleType, deliveryStatus);
        console.log(`[MODERATOR] Kullanıcı uyarıldı (Rule: ${ruleType}, User: ${message.author.tag})`);
      } catch (error) {
        await logModerationNotice(message, action, ruleType, 'failed_error');
        console.error(`[ERROR] Kullanıcı uyarılamadı:`, error);
      }
    }

    // Action 1 veya 3: Mesajı sil (uyarı mesajından sonra)
    if (action === 1 || action === 3) {
      try {
        await message.delete();
        await logModerationAction(message, action, ruleType, 'applied');
        console.log(`[MODERATOR] Mesaj silindi (Rule: ${ruleType}, User: ${message.author.tag})`);
      } catch (error) {
        await logModerationAction(message, action, ruleType, 'failed', 'discord_delete_failed');
        console.error(`[ERROR] Mesaj silinemedi:`, error);
      }
    }
  } catch (error) {
    console.error(`[ERROR] Moderator aksiyonu uygulanamadı:`, error);
  }
}

function hashDiscordId(guildId: string, userId: string): string {
  return createHash('sha256').update(`${guildId}:${userId}`).digest('hex');
}

function actionToKey(action: number): string {
  switch (action) {
    case 1:
      return 'delete';
    case 2:
      return 'warn';
    case 3:
      return 'delete_and_warn';
    default:
      return 'none';
  }
}

async function logModerationAction(
  message: Message,
  action: number,
  ruleType: string,
  status: string,
  errorCode?: string,
): Promise<void> {
  if (!message.guild) return;
  try {
    await createModerationActionLog({
      guildId: message.guild.id,
      source: 'keyword',
      ruleType,
      userIdHash: hashDiscordId(message.guild.id, message.author.id),
      channelId: message.channelId,
      messageId: message.id,
      action: actionToKey(action),
      actionStatus: status,
      reasonKey: `moderation.keyword.${ruleType}`,
      reasonParamsJson: JSON.stringify({ ruleType }),
      actorType: 'system',
      errorCode,
    });
  } catch (error) {
    console.warn('[WARN] Moderasyon aksiyon logu yazılamadı:', error);
  }
}

async function logModerationNotice(
  message: Message,
  action: number,
  ruleType: string,
  deliveryStatus: string,
): Promise<void> {
  if (!message.guild) return;
  try {
    const actionLog = await createModerationActionLog({
      guildId: message.guild.id,
      source: 'keyword',
      ruleType,
      userIdHash: hashDiscordId(message.guild.id, message.author.id),
      channelId: message.channelId,
      messageId: message.id,
      action: actionToKey(action),
      actionStatus: deliveryStatus === 'sent' ? 'notice_sent' : 'notice_failed',
      reasonKey: `moderation.keyword.${ruleType}`,
      reasonParamsJson: JSON.stringify({ ruleType }),
      actorType: 'system',
      errorCode: deliveryStatus === 'sent' ? undefined : deliveryStatus,
    });

    if (actionLog?.id) {
      await createModerationUserNotice({
        guildId: message.guild.id,
        userIdHash: hashDiscordId(message.guild.id, message.author.id),
        messageId: message.id,
        actionLogId: actionLog.id,
        noticeType: 'dm',
        noticeTextKey: `moderation.notice.${ruleType}`,
        noticeParamsJson: JSON.stringify({ action: actionToKey(action), ruleType }),
        deliveryStatus,
      });
    }
  } catch (error) {
    console.warn('[WARN] Moderasyon kullanıcı bildirim logu yazılamadı:', error);
  }
}

// Özel komutlar sadece slash (/komut-adi) olarak çalışır; işleyici: utils/customCommandSlashHandler.ts

