import { 
  endPoll,
  getPollById,
  getPollsByGuildId,
  getPollResults,
  updatePollMessageId
} from './apiClient';
import {
  Client,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { getBotClient } from './botClientHelper';
import { getTextChannel } from './channelHelper';
import { stripMassMentions } from './mentionSanitize';
import { buildSingleEmbedFromConfig, toEmbedConfig } from './buildEmbedFromConfig';
import type { PollData } from '../types/database';
import type { EmbedConfig } from '../types/embedConfig';

/**
 * Anket mesajı kanala gönderir
 * @param id Anket ID'si
 * @param botClientId Custom bot clientId (opsiyonel - varsa custom bot kullanılır)
 * @param apiToken API'ye geri çağrıda kullanılacak token (opsiyonel - API'den gelen X-Bot-Token)
 */
export async function sendPollToChannel(id: number, botClientId?: string, apiToken?: string): Promise<void> {
  const client = getBotClient(botClientId);

  const poll = await getPollById(id, botClientId, apiToken);
  if (!poll) {
    throw new Error(`Anket bulunamadı (Id: ${id})`);
  }

  if (!poll.isActive) {
    throw new Error('Anket aktif değil');
  }

  if (poll.messageId && String(poll.messageId).trim() !== '') {
    throw new Error('Bu anket zaten kanala gönderilmiş.');
  }

  const guild = client.guilds.cache.get(poll.guildId);
  if (!guild) {
    throw new Error(`Sunucu bulunamadı (GuildId: ${poll.guildId})`);
  }

  const channel = getTextChannel(guild, poll.channelId);
  if (!channel) {
    throw new Error(`Kanal bulunamadı (ChannelId: ${poll.channelId})`);
  }

  // İzin ön-kontrolü: anket embed olarak gönderilir ve oy tepkilerle toplanır. AddReactions
  // yoksa anket görünür ama OY KULLANILAMAZ; sessizce "gönderildi" demek yerine net hata ver
  // (poll.ts komutu bu hatayı kullanıcıya yansıtır). "Bir üye tepki ekleyemez" durumu ayrı;
  // bot tepki EKLEYEMEZSE anket işlevsizdir.
  const me = guild.members.me;
  const perms = me ? channel.permissionsFor(me) : null;
  const missing: string[] = [];
  if (!perms || !perms.has(PermissionFlagsBits.ViewChannel)) missing.push('Kanalı Görüntüle');
  if (!perms || !perms.has(PermissionFlagsBits.SendMessages)) missing.push('Mesaj Gönder');
  if (!perms || !perms.has(PermissionFlagsBits.EmbedLinks)) missing.push('Bağlantıları Göm');
  if (!perms || !perms.has(PermissionFlagsBits.AddReactions)) missing.push('Tepki Ekle');
  if (missing.length > 0) {
    throw new Error(`Anket gönderilemiyor: botta şu izin(ler) eksik: ${missing.join(', ')} (Kanal: ${poll.channelId}).`);
  }

  // Tag replacement için placeholder'lar
  const placeholders: Record<string, string> = {
    question: poll.question,
    options: poll.options.sort((a, b) => a.orderIndex - b.orderIndex).map(o => `${o.emoji || '•'} ${o.optionText}`).join('\n'),
    votes: '0',
    totalvotes: '0',
    timestamp: new Date().toLocaleString('tr-TR'),
  };
  
  // Tag replacement fonksiyonu
  const replaceTags = (text: string): string => {
    if (!text) return '';
    let result = text;
    for (const [key, value] of Object.entries(placeholders)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return stripMassMentions(result);
  };

  const sortedOptions = [...poll.options].sort((a, b) => a.orderIndex - b.orderIndex);

  // Embed oluştur
  const embed = buildPollEmbed(
    {
      isEmbed: true,
      embedTitle: poll.pollEmbedTitle ?? '📊 Anket',
      embedTitleUrl: poll.pollEmbedTitleUrl ?? null,
      embedDescription: poll.pollEmbedDescription,
      embedColor: poll.pollEmbedColor,
      embedAuthorName: poll.pollEmbedAuthorName ?? null,
      embedAuthorIcon: poll.pollEmbedAuthorIcon ?? null,
      embedAuthorUrl: poll.pollEmbedAuthorUrl ?? null,
      embedThumbnail: poll.pollEmbedThumbnail,
      embedImage: poll.pollEmbedImage,
      embedFooter: poll.pollEmbedFooter ?? 'Anket için tepki ekleyerek oy kullanabilirsiniz',
      embedFooterIcon: poll.pollEmbedFooterIcon ?? null,
      embedUseTimestamp: poll.pollEmbedUseTimestamp,
      embedFieldsJson: poll.pollEmbedFieldsJson ?? null,
    },
    poll,
    sortedOptions,
    replaceTags,
    0x5865F2,
  );

  const sentMessage = await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });

  // Seçeneklere tepki ekle
  for (const option of sortedOptions) {
    const emoji = option.emoji || '•';
    try {
      await sentMessage.react(emoji);
    } catch (error) {
      console.error(`[ERROR] Tepki eklenemedi (Emoji: ${emoji}):`, error);
    }
  }

  const updated = await updatePollMessageId(poll.guildId, id, sentMessage.id, botClientId, apiToken);
  if (!updated) {
    throw new Error('Anket mesajı gönderildi ancak veritabanında mesaj kimliği kaydedilemedi.');
  }

  console.log(`[INFO] Anket mesajı gönderildi (Id: ${id}, MessageId: ${sentMessage.id}, ChannelId: ${poll.channelId})`);
}

/**
 * Anket sonuç mesajını gönderir
 * @param id Anket ID'si
 * @param botClientId Custom bot clientId (opsiyonel - varsa custom bot kullanılır)
 * @param apiToken API'ye geri çağrıda kullanılacak token (opsiyonel - API'den gelen X-Bot-Token)
 */
export async function sendPollResultToChannel(id: number, botClientId?: string, apiToken?: string): Promise<void> {
  const client = getBotClient(botClientId);

  const poll = await getPollById(id, botClientId, apiToken);
  if (!poll) {
    throw new Error(`Anket bulunamadı (Id: ${id})`);
  }

  const guild = client.guilds.cache.get(poll.guildId);
  if (!guild) {
    throw new Error(`Sunucu bulunamadı (GuildId: ${poll.guildId})`);
  }

  const channel = getTextChannel(guild, poll.channelId);
  if (!channel) {
    throw new Error(`Kanal bulunamadı (ChannelId: ${poll.channelId})`);
  }

  const result = await getPollResults(id, botClientId, apiToken);
  if (!result) {
    throw new Error('Anket sonuçları alınamadı');
  }

  const hasVotes = result.totalVotes > 0;
  const sortedResults = [...result.optionResults].sort((a, b) => b.voteCount - a.voteCount);
  const winnerResult = hasVotes ? sortedResults[0] : undefined;

  // Tag replacement için placeholder'lar (result için)
  const resultPlaceholders: Record<string, string> = {
    question: result.question,
    winner: winnerResult ? winnerResult.optionText : 'Kazanan yok',
    winnervotes: winnerResult ? winnerResult.voteCount.toString() : '0',
    totalvotes: result.totalVotes.toString(),
    timestamp: new Date().toLocaleString('tr-TR'),
  };
  
  // Tag replacement fonksiyonu (result için)
  const replaceResultTags = (text: string): string => {
    if (!text) return '';
    let result = text;
    for (const [key, value] of Object.entries(resultPlaceholders)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return stripMassMentions(result);
  };

  // Embed oluştur
  const embed = buildPollResultEmbed(
    {
      isEmbed: true,
      embedTitle: poll.resultEmbedTitle ?? '📊 Anket Sonuçları',
      embedTitleUrl: poll.resultEmbedTitleUrl ?? null,
      embedDescription: poll.resultEmbedDescription,
      embedColor: poll.resultEmbedColor,
      embedAuthorName: poll.resultEmbedAuthorName ?? null,
      embedAuthorIcon: poll.resultEmbedAuthorIcon ?? null,
      embedAuthorUrl: poll.resultEmbedAuthorUrl ?? null,
      embedThumbnail: poll.resultEmbedThumbnail,
      embedImage: poll.resultEmbedImage,
      embedFooter: poll.resultEmbedFooter ?? 'Anket sonlandırıldı',
      embedFooterIcon: poll.resultEmbedFooterIcon ?? null,
      embedUseTimestamp: poll.resultEmbedUseTimestamp,
      embedFieldsJson: poll.resultEmbedFieldsJson ?? null,
    },
    result,
    sortedResults,
    hasVotes,
    replaceResultTags,
    0x00ff00,
  );

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });

  console.log(`[INFO] Anket sonuç mesajı gönderildi (Id: ${id}, ChannelId: ${poll.channelId})`);
}

export async function checkAndEndExpiredPolls(
  client: Client,
  shouldSkipGuild?: (guildId: string) => boolean
): Promise<void> {
  const botClientId = client.application?.id ?? client.user?.id;
  const now = Date.now();
  const guilds = Array.from(client.guilds.cache.values());

  for (const guild of guilds) {
    if (shouldSkipGuild?.(guild.id)) {
      continue;
    }

    const polls = await getPollsByGuildId(guild.id, botClientId);
    const activePolls = polls.filter((poll) => poll.isActive && poll.messageId);

    for (const poll of activePolls) {
      const sentAt = poll.updatedAt ?? poll.createdAt;
      const endsByTime =
        poll.endAfterMinutes != null &&
        sentAt.getTime() + poll.endAfterMinutes * 60_000 <= now;
      const endsByVotes =
        poll.endAfterVotes != null &&
        poll.totalVotes >= poll.endAfterVotes;

      if (!endsByTime && !endsByVotes) {
        continue;
      }

      try {
        const ended = await endPoll(poll.guildId, poll.id, botClientId);
        if (!ended) {
          console.warn(`[WARN] Anket sonlandırılamadı (Id: ${poll.id})`);
          continue;
        }

        await sendPollResultToChannel(poll.id, botClientId);
        console.log(`[INFO] Süresi/oy limiti dolan anket sonlandırıldı (Id: ${poll.id})`);
      } catch (error) {
        console.error(`[ERROR] Anket otomatik sonlandırma hatası (Id: ${poll.id}):`, error);
      }
    }
  }
}

type PollOptionLike = { emoji: string | null; optionText: string; orderIndex: number };
type PollResultOptionLike = {
  emoji: string | null;
  optionText: string;
  voteCount: number;
  percentage: number;
};

function buildPollBodyDescription(
  poll: PollData,
  sortedOptions: PollOptionLike[],
): string {
  let description = `**Soru:** ${poll.question}\n\n`;
  description += '**Seçenekler:**\n';

  for (const option of sortedOptions) {
    const emoji = option.emoji || '•';
    description += `${emoji} ${option.optionText}\n`;
  }

  description += '\n';

  if (poll.endAfterMinutes) {
    description += `⏰ ${poll.endAfterMinutes} dakika içinde biter\n`;
  }
  if (poll.endAfterVotes) {
    description += `📊 ${poll.endAfterVotes} oydan sonra biter\n`;
  }

  if (poll.allowMultipleVotes) {
    description += `\n✅ Birden fazla seçeneğe oy verebilirsiniz\n`;
  } else {
    description += `\n⚠️ Sadece bir seçeneğe oy verebilirsiniz\n`;
  }

  return description;
}

function buildPollResultBodyDescription(
  result: {
    question: string;
    totalVotes: number;
    endedAt: string | null;
    allowMultipleVotes: boolean;
  },
  sortedResults: PollResultOptionLike[],
  hasVotes: boolean,
): string {
  let description = `**Soru:** ${result.question}\n\n`;
  description += `**Toplam Oy:** ${result.totalVotes}\n\n`;
  description += '**Sonuçlar:**\n';

  if (!hasVotes) {
    description += 'Hiç oy kullanılmadı.\n';
  }

  for (const optionResult of sortedResults) {
    const emoji = optionResult.emoji || '•';
    description += `${emoji} **${optionResult.optionText}** - ${optionResult.voteCount} oy`;
    if (hasVotes) {
      description += ` (${optionResult.percentage.toFixed(2)}%)`;
    }
    description += '\n';
  }

  description += '\n';

  if (result.endedAt) {
    const endedDate = new Date(result.endedAt);
    description += `⏰ Bitiş: ${endedDate.toLocaleString('tr-TR')}\n`;
  }

  if (result.allowMultipleVotes) {
    description += `\n✅ Çoklu oy kullanımı aktifti\n`;
  } else {
    description += `\n⚠️ Tek oy kullanımı aktifti\n`;
  }

  return description;
}

function buildPollEmbed(
  config: EmbedConfig,
  poll: PollData,
  sortedOptions: PollOptionLike[],
  replaceTags: (text: string) => string,
  defaultColor: number,
): EmbedBuilder {
  const prefix = config.embedDescription
    ? `${replaceTags(config.embedDescription)}\n\n`
    : '';
  const embed = buildSingleEmbedFromConfig(toEmbedConfig(config), {
    replaceTags,
    defaultColor,
  });
  embed.setDescription(`${prefix}${buildPollBodyDescription(poll, sortedOptions)}`.slice(0, 4096));
  return embed;
}

function buildPollResultEmbed(
  config: EmbedConfig,
  result: {
    question: string;
    totalVotes: number;
    endedAt: string | null;
    allowMultipleVotes: boolean;
  },
  sortedResults: PollResultOptionLike[],
  hasVotes: boolean,
  replaceTags: (text: string) => string,
  defaultColor: number,
): EmbedBuilder {
  const prefix = config.embedDescription
    ? `${replaceTags(config.embedDescription)}\n\n`
    : '';
  const embed = buildSingleEmbedFromConfig(toEmbedConfig(config), {
    replaceTags,
    defaultColor,
  });
  embed.setDescription(
    `${prefix}${buildPollResultBodyDescription(result, sortedResults, hasVotes)}`.slice(0, 4096),
  );
  return embed;
}

