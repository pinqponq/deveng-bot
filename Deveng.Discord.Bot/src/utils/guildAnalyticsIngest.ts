import type { Message } from 'discord.js';
import {
  apiMergeGuildUserActivityDay,
  apiTryTicketLastMessage,
} from './apiClient';
import { logError } from './logger';

function utcDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Mesaj başına: günlük aktivite + açık talep kanalıysa son mesaj meta. */
export async function ingestMessageAnalytics(message: Message): Promise<void> {
  try {
    if (!message.guild || message.author.bot) return;
    const guildId = message.guild.id;
    const userId = message.author.id;
    const day = utcDateString();
    await apiMergeGuildUserActivityDay(guildId, {
      userId,
      activityDate: day,
      deltaMessages: 1,
      deltaVoiceSeconds: 0,
      deltaReactions: 0,
    });
    await apiTryTicketLastMessage(guildId, {
      channelId: message.channel.id,
      authorId: userId,
      occurredAtUtc: message.createdAt.toISOString(),
    });
  } catch (error) {
    // no-op
    logError('guildAnalyticsIngest:ingestMessage', error, 'debug');
  }
}

export async function ingestReactionAnalytics(guildId: string, userId: string): Promise<void> {
  try {
    const day = utcDateString();
    await apiMergeGuildUserActivityDay(guildId, {
      userId,
      activityDate: day,
      deltaMessages: 0,
      deltaVoiceSeconds: 0,
      deltaReactions: 1,
    });
  } catch (error) {
    // no-op
    logError('guildAnalyticsIngest:ingestReaction', error, 'debug');
  }
}
