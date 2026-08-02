import { 
  getGiveawayById,
  updateGiveawayMessageId,
  addGiveawayParticipant,
  removeGiveawayParticipant,
  endGiveaway,
  addGiveawayWinner,
  getActiveGiveaways,
  getGiveawayByMessageId,
  getGiveawayParticipants
} from './apiClient';
import {
  Client,
  EmbedBuilder,
  MessageReaction,
  User,
  PartialMessageReaction,
  PartialUser,
} from 'discord.js';
import { getBotClient } from './botClientHelper';
import { getTextChannel } from './channelHelper';
import { logError } from './logger';
import { buildSingleEmbedFromConfig, toEmbedConfig } from './buildEmbedFromConfig';
import type { GiveawayData } from '../types/database';

const GIVEAWAY_EMOJI = '🎉';

function isGiveawayPartyEmoji(emoji: { id: string | null; name: string | null }): boolean {
  if (emoji.id) {
    return false;
  }
  const n = emoji.name;
  if (!n) {
    return false;
  }
  if (n === GIVEAWAY_EMOJI) {
    return true;
  }
  if (n === 'tada') {
    return true;
  }
  return n.codePointAt(0) === 0x1f389;
}

/**
 * Çekiliş mesajı kanala gönderir
 * @param id Çekiliş ID'si
 * @param botClientId Custom bot clientId (opsiyonel - varsa custom bot kullanılır)
 * @param apiToken API'ye geri çağrıda kullanılacak token (opsiyonel - API'den gelen X-Bot-Token)
 */
export async function sendGiveawayToChannel(id: number, botClientId?: string, apiToken?: string): Promise<void> {
  const client = getBotClient(botClientId);

  const giveaway = await getGiveawayById(id, botClientId, apiToken);
  if (!giveaway) {
    throw new Error(`Çekiliş bulunamadı (Id: ${id})`);
  }

  if (giveaway.isEnded) {
    throw new Error('Çekiliş bitmiş');
  }

  // Eğer çekiliş zaten gönderilmişse, tekrar gönderme
  if (giveaway.messageId) {
    throw new Error('Çekiliş zaten gönderilmiş');
  }

  const guild = client.guilds.cache.get(giveaway.guildId);
  if (!guild) {
    throw new Error(`Sunucu bulunamadı (GuildId: ${giveaway.guildId})`);
  }

  const channel = getTextChannel(guild, giveaway.channelId);
  if (!channel) {
    throw new Error(`Kanal bulunamadı (ChannelId: ${giveaway.channelId})`);
  }

  // Embed oluştur
  const embed = createGiveawayEmbed(giveaway, channel);
  
  // Mesajı gönder
  const message = await channel.send({ embeds: [embed] });
  
  // Reaction ekle
  await message.react(GIVEAWAY_EMOJI);
  
  // MessageId'yi güncelle (başarısızsa tepkiyle katılımcı eşleşmez)
  const messageIdSaved = await updateGiveawayMessageId(giveaway.guildId, id, message.id, botClientId, apiToken);
  if (!messageIdSaved) {
    throw new Error(
      `Çekiliş MessageId API'ye yazılamadı (Id: ${id}, GuildId: ${giveaway.guildId}). Bot güncel mi (npm run build)?`
    );
  }

  console.log(`[INFO] Çekiliş mesajı gönderildi (Id: ${id}, MessageId: ${message.id})`);
}

/**
 * Çekiliş tag'lerini gerçek değerlerle değiştirir
 */
function replaceGiveawayTags(text: string, giveaway: any, channel?: any): string {
  if (!text) return '';
  
  let result = text;
  
  // Bitiş tarihi hesaplama (UTC'den parse et)
  const endDate = new Date(giveaway.endDate);
  const now = new Date();
  const timeLeft = endDate.getTime() - now.getTime();
  
  // Debug log (sadece sorunlu durumlar için)
  if (timeLeft < 0 && timeLeft > -3600000) { // Son 1 saat içinde bitmişse
    console.log(`[DEBUG] replaceGiveawayTags - EndDate: ${endDate.toISOString()}, Now: ${now.toISOString()}, TimeLeft: ${timeLeft}ms, IsEnded: ${giveaway.isEnded}`);
  }
  
  // Çekiliş bitmişse veya süre dolmuşsa
  if (giveaway.isEnded || timeLeft <= 0) {
    result = result.replace(/{timeleft}/g, 'Zamanı doldu');
  } else {
    // Kalan süre hesaplama (sadece pozitif değerler için)
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeLeftString = '';
    if (days > 0) timeLeftString += `${days} gün `;
    if (hours > 0) timeLeftString += `${hours} saat `;
    if (minutes > 0) timeLeftString += `${minutes} dakika`;
    if (!timeLeftString) timeLeftString = 'Birkaç saniye';
    
    result = result.replace(/{timeleft}/g, timeLeftString);
  }
  
  const displayTz = giveaway.timeZone && String(giveaway.timeZone).trim() !== ''
    ? String(giveaway.timeZone)
    : 'Europe/Istanbul';
  let endDateStr = '';
  let endTimeStr = '';
  try {
    endDateStr = endDate.toLocaleDateString('tr-TR', { timeZone: displayTz, year: 'numeric', month: '2-digit', day: '2-digit' });
    endTimeStr = endDate.toLocaleTimeString('tr-TR', { timeZone: displayTz, hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    endDateStr = endDate.toLocaleDateString('tr-TR');
    endTimeStr = endDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Tag replacement
  result = result.replace(/{giveawayname}/g, giveaway.name || 'Çekiliş');
  result = result.replace(/{prize}/g, giveaway.prize || 'Ödül');
  result = result.replace(/{winnercount}/g, String(giveaway.winnerCount || 1));
  result = result.replace(/{enddate}/g, endDateStr);
  result = result.replace(/{endtime}/g, endTimeStr);
  // {timeleft} zaten yukarıda replace edildi (bitmişse veya devam ediyorsa)
  result = result.replace(/{participantcount}/g, String(giveaway.participantCount || 0));
  
  if (channel) {
    result = result.replace(/{channel}/g, channel.name || 'Kanal');
    result = result.replace(/{channelmention}/g, `<#${channel.id}>`);
  } else {
    result = result.replace(/{channel}/g, 'Kanal');
    result = result.replace(/{channelmention}/g, '#kanal');
  }
  
  result = result.replace(/{timestamp}/g, now.toLocaleString('tr-TR'));
  
  return result;
}

/**
 * Çekiliş embed'i oluşturur
 */
function createGiveawayEmbed(giveaway: GiveawayData, channel?: { id: string; name?: string | null }): EmbedBuilder {
  const replaceTags = (text: string) => replaceGiveawayTags(text, giveaway, channel);

  let description = '';
  if (giveaway.embedDescription) {
    description = replaceGiveawayTags(giveaway.embedDescription, giveaway, channel).replace(/\\n/g, '\n');
  } else {
    description += `**Ödül:** ${giveaway.prize}\n\n`;
    description += `**Kazanan Sayısı:** ${giveaway.winnerCount}\n\n`;

    const endDate = new Date(giveaway.endDate);
    const now = new Date();
    const timeLeft = endDate.getTime() - now.getTime();

    if (giveaway.isEnded || timeLeft <= 0) {
      description += `**Bitiş:** Zamanı doldu\n\n`;
    } else {
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      let timeString = '';
      if (days > 0) timeString += `${days} gün `;
      if (hours > 0) timeString += `${hours} saat `;
      if (minutes > 0) timeString += `${minutes} dakika`;
      if (!timeString) timeString = 'Birkaç saniye';

      description += `**Bitiş:** <t:${Math.floor(endDate.getTime() / 1000)}:R> (${timeString})\n\n`;
    }

    description += `**Katılımcı Sayısı:** ${giveaway.participantCount || 0}\n\n`;
  }

  if (!description.includes(GIVEAWAY_EMOJI) && !description.toLowerCase().includes('katıl')) {
    description += `\nKatılmak için ${GIVEAWAY_EMOJI} tepkisine tıklayın!`;
  }

  const embed = buildSingleEmbedFromConfig(
    toEmbedConfig({
      isEmbed: true,
      embedTitle: giveaway.embedTitle ?? '🎉 Çekiliş',
      embedTitleUrl: giveaway.embedTitleUrl ?? null,
      embedDescription: description,
      embedColor: giveaway.embedColor ?? null,
      embedAuthorName: giveaway.embedAuthorName ?? null,
      embedAuthorIcon: giveaway.embedAuthorIcon ?? null,
      embedAuthorUrl: giveaway.embedAuthorUrl ?? null,
      embedThumbnail: giveaway.embedThumbnail ?? null,
      embedImage: giveaway.embedImage ?? null,
      embedFooter: giveaway.embedFooter ?? 'Çekiliş için tepki ekleyerek katılabilirsiniz',
      embedFooterIcon: giveaway.embedFooterIcon ?? null,
      embedUseTimestamp: giveaway.embedUseTimestamp,
      embedFieldsJson: giveaway.embedFieldsJson ?? null,
    }),
    {
      replaceTags,
      defaultColor: 0x5865f2,
    },
  );

  return embed;
}

/**
 * Çekiliş mesajını günceller
 */
export async function updateGiveawayMessage(giveaway: any, discordClient?: Client): Promise<void> {
  const client = discordClient ?? getBotClient();

  if (!giveaway.messageId) {
    return;
  }

  const guild = client.guilds.cache.get(giveaway.guildId);
  if (!guild) {
    return;
  }

  const channel = getTextChannel(guild, giveaway.channelId);
  if (!channel) {
    return;
  }

  try {
    const message = await channel.messages.fetch(giveaway.messageId);
    const embed = createGiveawayEmbed(giveaway, channel);
    await message.edit({ embeds: [embed] });
  } catch (error) {
    console.error(`[ERROR] Çekiliş mesajı güncellenemedi (MessageId: ${giveaway.messageId}):`, error);
  }
}

/**
 * Reaction eklendiğinde çağrılır
 */
export async function handleGiveawayReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  try {
    if (!isGiveawayPartyEmoji(reaction.emoji)) {
      return;
    }

    let u = user;
    if (u.partial) {
      try {
        u = await u.fetch();
      } catch {
        return;
      }
    }
    if (u.bot) {
      return;
    }

    let message = reaction.message;
    if (message.partial) {
      try {
        message = await message.fetch();
      } catch {
        return;
      }
    }
    if (!message.guild) {
      return;
    }

    const discordClient = reaction.client as Client;
    
    console.log(`[DEBUG] Çekiliş tepkisi eklendi - MessageId: ${message.id}, UserId: ${u.id}`);
    
    const giveaway = await findGiveawayByMessageId(message.id);
    if (!giveaway) {
      console.log(`[DEBUG] Çekiliş bulunamadı - MessageId: ${message.id}`);
      return;
    }
    
    console.log(`[DEBUG] Çekiliş bulundu - Id: ${giveaway.id}, IsActive: ${giveaway.isActive}, IsEnded: ${giveaway.isEnded}`);
    
    if (!giveaway.isActive || giveaway.isEnded) {
      console.log(`[DEBUG] Çekiliş aktif değil veya bitmiş`);
      return;
    }
    
    // Bitiş tarihi kontrolü
    const endDate = new Date(giveaway.endDate);
    const now = Date.now();
    const endTime = endDate.getTime();
    
    console.log(`[DEBUG] Bitiş tarihi kontrolü - EndDate: ${endDate.toISOString()}, EndTime: ${endTime}, Now: ${now}, Fark: ${endTime - now}ms`);
    
    if (endTime <= now) {
      console.log(`[DEBUG] Çekiliş süresi dolmuş - EndDate: ${endDate.toLocaleString('tr-TR')}, Now: ${new Date().toLocaleString('tr-TR')}`);
      return;
    }
    
    // Rol izin kontrolü
    const canParticipate = await checkUserCanParticipate(message.guild.id, u.id, giveaway, discordClient);
    if (!canParticipate) {
      console.log(`[DEBUG] Kullanıcı çekilişe katılamaz - UserId: ${u.id}`);
      return;
    }
    
    console.log(`[DEBUG] Katılımcı ekleniyor - GiveawayId: ${giveaway.id}, UserId: ${u.id}`);
    
    // Katılımcı ekle
    const added = await addGiveawayParticipant(giveaway.id, u.id);
    if (!added) {
      console.log(`[ERROR] Katılımcı eklenemedi - GiveawayId: ${giveaway.id}, UserId: ${u.id}`);
      return;
    }
    
    console.log(`[DEBUG] Katılımcı eklendi, mesaj güncelleniyor`);
    
    // Güncel çekiliş bilgilerini al (participantCount güncel olsun)
    const updatedGiveaway = await getGiveawayById(giveaway.id);
    if (updatedGiveaway) {
      // Mesajı güncelle
      await updateGiveawayMessage(updatedGiveaway, discordClient);
      console.log(`[DEBUG] Çekiliş mesajı güncellendi`);
    }
  } catch (error) {
    console.error(`[ERROR] handleGiveawayReactionAdd hatası:`, error);
  }
}

/**
 * Reaction kaldırıldığında çağrılır
 */
export async function handleGiveawayReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  if (!isGiveawayPartyEmoji(reaction.emoji)) {
    return;
  }

  let u = user;
  if (u.partial) {
    try {
      u = await u.fetch();
    } catch {
      return;
    }
  }
  if (u.bot) {
    return;
  }

  let message = reaction.message;
  if (message.partial) {
    try {
      message = await message.fetch();
    } catch {
      return;
    }
  }
  if (!message.guild) {
    return;
  }

  const discordClient = reaction.client as Client;

  const giveaway = await findGiveawayByMessageId(message.id);
  if (!giveaway) return;
  
  if (!giveaway.isActive || giveaway.isEnded) return;
  
  // Bitiş tarihi kontrolü
  const endDate = new Date(giveaway.endDate);
  if (endDate.getTime() <= Date.now()) {
    return;
  }
  
  // Katılımcı kaldır
  await removeGiveawayParticipant(giveaway.id, u.id);
  
  // Güncel çekiliş bilgilerini al (participantCount güncel olsun)
  const updatedGiveaway = await getGiveawayById(giveaway.id);
  if (updatedGiveaway) {
    // Mesajı güncelle
    await updateGiveawayMessage(updatedGiveaway, discordClient);
  }
}

/**
 * MessageId'ye göre çekiliş bulur
 */
async function findGiveawayByMessageId(messageId: string): Promise<any | null> {
  try {
    // Önce aktif çekilişlerde ara
    const activeGiveaways = await getActiveGiveaways();
    let giveaway = activeGiveaways.find(g => g.messageId === messageId);
    
    if (giveaway) {
      return giveaway;
    }
    
    // Eğer aktif çekilişlerde bulunamazsa, MessageId ile direkt ara
    console.log(`[DEBUG] Aktif çekilişlerde bulunamadı, MessageId ile aranıyor - MessageId: ${messageId}`);
    const foundGiveaway = await getGiveawayByMessageId(messageId);
    
    return foundGiveaway || null;
  } catch (error) {
    console.error(`[ERROR] findGiveawayByMessageId hatası:`, error);
    return null;
  }
}

/**
 * Kullanıcının çekilişe katılabilir olup olmadığını kontrol eder
 */
async function checkUserCanParticipate(
  guildId: string,
  userId: string,
  giveaway: any,
  discordClient: Client
): Promise<boolean> {
  const client = discordClient;
  if (!client) return false;
  
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return false;
  
  const member = await guild.members.fetch(userId).catch((error) => { logError('giveawaySender:fetchMember', error, 'debug'); return null; });
  if (!member) return false;
  
  // Eğer izin verilen roller varsa kontrol et
  if (giveaway.allowedRoles && giveaway.allowedRoles.length > 0) {
    const userRoleIds = member.roles.cache.map(r => r.id);
    const hasAllowedRole = giveaway.allowedRoles.some((ar: any) => userRoleIds.includes(ar.roleId));
    
    if (giveaway.rolePermissionType === 0) {
      // Bu roller dışındaki tüm rolleri yok say
      return hasAllowedRole;
    } else {
      // Bu roller dışındaki tüm rollere izin ver
      return !hasAllowedRole;
    }
  }
  
  return true;
}

/**
 * Çekilişi sonlandırır ve kazananları seçer
 */
export async function endGiveawayAndSelectWinners(id: number): Promise<void> {
  const giveaway = await getGiveawayById(id);
  if (!giveaway) {
    throw new Error(`Çekiliş bulunamadı (Id: ${id})`);
  }
  
  if (giveaway.isEnded) {
    return;
  }
  
  // Çekilişi sonlandır
  await endGiveaway(giveaway.guildId, id);
  
  // Katılımcıları al
  const participants = await getGiveawayParticipants(id);
  
  console.log(`[DEBUG] Çekiliş katılımcıları alındı - Id: ${id}, Katılımcı sayısı: ${participants.length}, ParticipantCount: ${giveaway.participantCount}`);
  
  // Minimum 2 katılımcı kontrolü
  if (participants.length < 2) {
    console.log(`[INFO] Çekiliş sonlandırıldı ancak yeterli katılımcı yok - Id: ${id}, Katılımcı sayısı: ${participants.length}`);
    await sendGiveawayEndMessage(giveaway, []);
    return;
  }
  
  // Kazananları seç
  const winners = await selectWinners(participants, giveaway);
  
  // Kazananları kaydet
  for (const winner of winners) {
    await addGiveawayWinner(id, winner.userId);
  }
  
  // Sonuç mesajını gönder
  await sendGiveawayEndMessage(giveaway, winners);
}


/**
 * Kazananları seçer (rol çarpanlarına göre).
 * Panelde tanımlanan rol çarpanları (giveaway.roles[].winChanceMultiplier) uygulanır:
 * katılımcının Discord rollerinden en yüksek çarpan alınır ve o kadar kopya ile ağırlıklandırılır.
 */
async function selectWinners(participants: any[], giveaway: any): Promise<any[]> {
  const winnerCount = Math.min(giveaway.winnerCount, participants.length);
  const winners: any[] = [];

  const roleMultipliers: Array<{ roleId: string; winChanceMultiplier: number }> =
    Array.isArray(giveaway.roles) ? giveaway.roles : [];

  // Rol çarpanı yoksa basit rastgele seçim
  if (roleMultipliers.length === 0) {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    winners.push(...shuffled.slice(0, winnerCount));
    return winners;
  }

  // Ağırlıklı seçim: her katılımcının rollerine göre çarpanı hesapla
  const client = getBotClient(); // Context'ten otomatik alır (sendGiveawayEndMessage ile aynı)
  const guild = client?.guilds.cache.get(giveaway.guildId) ?? null;

  const weightedParticipants: any[] = [];
  for (const participant of participants) {
    let multiplier = 1.0;
    if (guild) {
      const member =
        guild.members.cache.get(participant.userId) ??
        (await guild.members.fetch(participant.userId).catch((error) => {
          logError('giveawaySender:selectWinners:fetchMember', error, 'debug');
          return null;
        }));
      if (member) {
        const userRoleIds = new Set(member.roles.cache.map((r) => r.id));
        for (const rm of roleMultipliers) {
          if (userRoleIds.has(rm.roleId) && rm.winChanceMultiplier > multiplier) {
            multiplier = rm.winChanceMultiplier; // en yüksek uygulanan çarpan
          }
        }
      }
    }

    // Çarpan kadar kopya ekle (en az 1). Ör. 2.0 → 2 kopya, 1.5 → 2 kopya (ceil).
    const count = Math.max(1, Math.ceil(multiplier));
    for (let i = 0; i < count; i++) {
      weightedParticipants.push(participant);
    }
  }

  // Ağırlıklı havuzdan rastgele seç; kazananın TÜM kopyalarını çıkar (tekrar seçilmesin)
  for (let i = 0; i < winnerCount; i++) {
    if (weightedParticipants.length === 0) break;

    const randomIndex = Math.floor(Math.random() * weightedParticipants.length);
    const winner = weightedParticipants[randomIndex];

    for (let j = weightedParticipants.length - 1; j >= 0; j--) {
      if (weightedParticipants[j].userId === winner.userId) {
        weightedParticipants.splice(j, 1);
      }
    }

    if (!winners.find((w) => w.userId === winner.userId)) {
      winners.push(winner);
    }
  }

  return winners;
}

/**
 * Çekiliş bitiş mesajını gönderir
 */
async function sendGiveawayEndMessage(giveaway: any, winners: any[]): Promise<void> {
  const client = getBotClient(); // Context'ten otomatik alır
  if (!client) {
    console.error('[ERROR] Discord client bulunamadı');
    return;
  }
  
  const guild = client.guilds.cache.get(giveaway.guildId);
  if (!guild) {
    console.error(`[ERROR] Sunucu bulunamadı (GuildId: ${giveaway.guildId})`);
    return;
  }
  
  const channel = getTextChannel(guild, giveaway.channelId);
  if (!channel) {
    console.error(`[ERROR] Kanal bulunamadı (ChannelId: ${giveaway.channelId})`);
    return;
  }
  
  console.log(`[INFO] Çekiliş sonuç mesajı gönderiliyor - GiveawayId: ${giveaway.id}, Winners: ${winners.length}`);
  
  const embed = new EmbedBuilder();
  embed.setTitle('🎉 Çekiliş Bitti!');
  
  let description = `**Çekiliş:** ${giveaway.name}\n\n`;
  description += `**Ödül:** ${giveaway.prize}\n\n`;
  
  // Katılımcı sayısını göster
  const participantCount = giveaway.participantCount || 0;
  description += `**Katılımcı Sayısı:** ${participantCount}\n\n`;
  
  if (winners.length === 0) {
    if (participantCount < 2) {
      description += `❌ Çekiliş için en az **2 katılımcı** gereklidir. Şu anki katılımcı sayısı: **${participantCount}**. Kazanan seçilemedi.`;
    } else {
      description += '❌ Yeterli katılımcı olmadığı için kazanan seçilemedi.';
    }
    embed.setColor(0xED4245); // Kırmızı
  } else {
    description += `**🎊 Kazananlar (${winners.length}):**\n\n`;
    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      description += `${i + 1}. 🎉 <@${winner.userId}>\n`;
    }
    embed.setColor(0x57F287); // Yeşil
  }
  
  embed.setDescription(description);
  embed.setFooter({ text: 'Çekiliş sonlandırıldı' });
  embed.setTimestamp();
  
  try {
    await channel.send({ embeds: [embed] });
    console.log(`[INFO] Çekiliş sonuç mesajı gönderildi - GiveawayId: ${giveaway.id}`);
  } catch (error) {
    console.error(`[ERROR] Çekiliş sonuç mesajı gönderilemedi:`, error);
  }
  
  // Eski mesajı güncelle
  if (giveaway.messageId) {
    try {
      const message = await channel.messages.fetch(giveaway.messageId);
      const oldEmbed = createGiveawayEmbed(giveaway, channel);
      oldEmbed.setTitle('🎉 Çekiliş Bitti!');
      oldEmbed.setDescription('Bu çekiliş sona ermiştir. Sonuçlar yukarıda açıklanmıştır.');
      oldEmbed.setColor(0x99AAB5); // Gri
      await message.edit({ embeds: [oldEmbed] });
      console.log(`[INFO] Çekiliş mesajı güncellendi - MessageId: ${giveaway.messageId}`);
    } catch (error) {
      console.error(`[ERROR] Çekiliş mesajı güncellenemedi:`, error);
    }
  }
}

/**
 * Aktif çekilişleri kontrol eder ve bitenleri sonlandırır
 * @param skipGuild Bu guild'de işlem yapma (örn. custom bot’lu sunucular)
 */
export async function checkAndEndExpiredGiveaways(skipGuild?: (guildId: string) => boolean): Promise<void> {
  try {
    const activeGiveaways = await getActiveGiveaways();
    const now = new Date();
    const nowTime = now.getTime();
    
    console.log(`[DEBUG] Çekiliş kontrolü yapılıyor - Aktif çekiliş sayısı: ${activeGiveaways.length}, Now (UTC): ${now.toISOString()}`);
    
    for (const giveaway of activeGiveaways) {
      if (skipGuild?.(giveaway.guildId)) continue;
      // Bitiş tarihi UTC'de parse et
      const endDate = new Date(giveaway.endDate);
      const endTime = endDate.getTime();
      const timeLeft = endTime - nowTime;
      
      console.log(`[DEBUG] Çekiliş kontrolü - Id: ${giveaway.id}, EndDate (UTC): ${endDate.toISOString()}, Now (UTC): ${now.toISOString()}, TimeLeft: ${timeLeft}ms (${Math.floor(timeLeft / 1000)}s), IsEnded: ${giveaway.isEnded}`);
      
      // Bitiş tarihi geçmişse ve çekiliş bitmemişse sonlandır
      if (timeLeft <= 0 && !giveaway.isEnded) {
        console.log(`[INFO] Çekiliş bitiş zamanı geldi, sonlandırılıyor - Id: ${giveaway.id}, TimeLeft: ${timeLeft}ms`);
        try {
          await endGiveawayAndSelectWinners(giveaway.id);
          console.log(`[INFO] Çekiliş başarıyla sonlandırıldı ve kazananlar açıklandı (Id: ${giveaway.id})`);
        } catch (error) {
          console.error(`[ERROR] Çekiliş sonlandırılamadı (Id: ${giveaway.id}):`, error);
        }
      } else if (timeLeft > 0 && !giveaway.isEnded) {
        // Hala aktif, kalan süreyi göster
        const remainingSeconds = Math.floor(timeLeft / 1000);
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        console.log(`[DEBUG] Çekiliş aktif - Id: ${giveaway.id}, Kalan süre: ${remainingMinutes} dakika (${remainingSeconds} saniye)`);
      }
    }
  } catch (error) {
    console.error(`[ERROR] checkAndEndExpiredGiveaways hatası:`, error);
  }
}
