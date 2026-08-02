import { Client, TextChannel } from 'discord.js';
import { apiRequest } from './apiClient';
import { logError } from './logger';

interface ScheduledAnnouncement {
  id: number;
  guildId: string;
  channelId: string;
  title?: string | null;
  content?: string | null;
  mentionPolicy: string;
  nextRunAtUtc?: string | null;
}

export async function checkAndSendScheduledAnnouncements(
  client: Client,
  isGuildHandledByCustomBot: (guildId: string) => boolean,
): Promise<void> {
  const announcements = await apiRequest<ScheduledAnnouncement[]>('/api/ScheduledAnnouncement/pending?batchSize=50');
  for (const announcement of announcements ?? []) {
    if (isGuildHandledByCustomBot(announcement.guildId)) continue;
    await processAnnouncement(client, announcement);
  }
}

async function processAnnouncement(client: Client, announcement: ScheduledAnnouncement): Promise<void> {
  const plannedRunAtUtc = announcement.nextRunAtUtc ?? new Date().toISOString();
  try {
    const guild = client.guilds.cache.get(announcement.guildId) ?? await client.guilds.fetch(announcement.guildId).catch((error) => { logError('scheduledAnnouncementWorker:fetchGuild', error, 'debug'); return null; });
    const channel = guild
      ? guild.channels.cache.get(announcement.channelId) ?? await guild.channels.fetch(announcement.channelId).catch((error) => { logError('scheduledAnnouncementWorker:fetchChannel', error, 'debug'); return null; })
      : null;

    if (!guild || !channel?.isTextBased()) throw new Error('Hedef kanal bulunamadi.');
    const mention = announcement.mentionPolicy === 'everyone' ? '@everyone\n' : '';
    let body = `${announcement.title ? `**${announcement.title}**\n` : ''}${announcement.content ?? ''}`.trim();
    if (announcement.mentionPolicy !== 'everyone') {
      body = body.replace(/@everyone/gi, '').replace(/@here/gi, '');
    }
    const content = `${mention}${body}`.trim();
    const sent = await (channel as TextChannel).send(content || 'Zamanlanmış duyuru');

    await apiRequest(`/api/ScheduledAnnouncement/${announcement.id}/run`, {
      method: 'POST',
      body: JSON.stringify({
        plannedRunAtUtc,
        status: 'sent',
        sentMessageId: sent.id,
        nextRunAtUtc: null,
      }),
    });
  } catch (error) {
    await apiRequest(`/api/ScheduledAnnouncement/${announcement.id}/run`, {
      method: 'POST',
      body: JSON.stringify({
        plannedRunAtUtc,
        status: 'failed',
        errorCode: error instanceof Error ? error.message.slice(0, 120) : 'unknown',
        nextRunAtUtc: null,
      }),
    });
  }
}
