import { GuildMember, PartialGuildMember } from 'discord.js';
import { replacePlaceholders } from './helpers';

/**
 * Placeholder değiştirme fonksiyonları
 */

export function replaceWelcomePlaceholders(member: GuildMember, message: string): string {
  return replacePlaceholders(message, {
    user: `<@${member.id}>`,
    username: member.user.username,
    tag: member.user.tag,
    count: member.guild.memberCount.toString(),
    memberCount: member.guild.memberCount.toString(),
    serverName: member.guild.name,
  });
}

export function replaceGoodbyePlaceholders(
  member: GuildMember | PartialGuildMember,
  message: string
): string {
  const username = member.user ? member.user.tag : 'Birisi';
  return replacePlaceholders(message, {
    user: member.user ? `<@${member.user.id}>` : 'Birisi',
    username: member.user?.username || 'Birisi',
    tag: username,
    serverName: member.guild.name,
    count: member.guild.memberCount.toString(),
    memberCount: member.guild.memberCount.toString(),
  });
}

