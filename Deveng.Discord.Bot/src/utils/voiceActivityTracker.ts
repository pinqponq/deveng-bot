import { ChannelType, type Guild, type VoiceState } from 'discord.js';
import { apiMergeGuildUserActivityDay } from './apiClient';
import { logError } from './logger';

const voiceJoinMs = new Map<string, number>();

function isTrackedVoiceChannel(guild: Guild, channelId: string | null): boolean {
  if (!channelId) return false;
  const ch = guild.channels.cache.get(channelId);
  if (!ch) return false;
  return ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice;
}

function utcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ses oturumu süresini günlük tabloya yazar. Aynı kullanıcı için guild başına tek zamanlayıcı.
 */
export async function trackVoiceStateForAnalytics(oldState: VoiceState, newState: VoiceState): Promise<void> {
  try {
    const guild = newState.guild;
    if (!guild || newState.member?.user.bot) return;
    const uid = newState.id;
    const gid = guild.id;
    const key = `${gid}:${uid}`;
    const oldCh = oldState.channelId;
    const newCh = newState.channelId;

    if (oldCh && oldCh !== newCh && isTrackedVoiceChannel(guild, oldCh)) {
      const started = voiceJoinMs.get(key);
      voiceJoinMs.delete(key);
      if (started) {
        const sec = Math.min(86400, Math.max(0, Math.round((Date.now() - started) / 1000)));
        if (sec > 0) {
          await apiMergeGuildUserActivityDay(gid, {
            userId: uid,
            activityDate: utcDateString(),
            deltaMessages: 0,
            deltaVoiceSeconds: sec,
            deltaReactions: 0,
          });
        }
      }
    }

    if (newCh && newCh !== oldCh && isTrackedVoiceChannel(guild, newCh)) {
      voiceJoinMs.set(key, Date.now());
    }
  } catch (error) {
    // no-op
    logError('voiceActivityTracker:trackVoiceState', error, 'debug');
  }
}
