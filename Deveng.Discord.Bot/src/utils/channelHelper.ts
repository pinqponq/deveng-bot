import { Guild, TextChannel, ChannelType } from 'discord.js';

/**
 * Kanal yardımcı fonksiyonları
 */

export function getTextChannel(guild: Guild, channelId: string): TextChannel | null {
  const channel = guild.channels.cache.get(channelId);
  
  if (!channel) {
    return null;
  }
  
  if (channel.type === ChannelType.GuildText) {
    return channel;
  }
  
  return null;
}

