import { GuildMember, PartialGuildMember } from 'discord.js';

/**
 * Embed placeholder değerlerini oluşturan yardımcı fonksiyonlar
 */

export function createWelcomePlaceholders(member: GuildMember): Record<string, string> {
  return {
    user: `<@${member.user.id}>`,
    username: member.user.username,
    userid: member.user.id,
    usermention: `<@${member.user.id}>`,
    tag: member.user.tag,
    server: member.guild.name,
    servername: member.guild.name,
    count: member.guild.memberCount.toString(),
    memberCount: member.guild.memberCount.toString(),
    userAvatar: member.user.displayAvatarURL(),
    timestamp: new Date().toLocaleString('tr-TR'),
  };
}

export function createGoodbyePlaceholders(member: GuildMember | PartialGuildMember): Record<string, string> {
  const username = member.user ? member.user.tag : 'Birisi';
  return {
    user: member.user ? `<@${member.user.id}>` : 'Birisi',
    username: member.user?.username || 'Birisi',
    userid: member.user?.id || 'Bilinmiyor',
    usermention: member.user ? `<@${member.user.id}>` : 'Birisi',
    tag: username,
    server: member.guild.name,
    servername: member.guild.name,
    count: member.guild.memberCount.toString(),
    memberCount: member.guild.memberCount.toString(),
    userAvatar: member.user?.displayAvatarURL() || '',
    timestamp: new Date().toLocaleString('tr-TR'),
  };
}

