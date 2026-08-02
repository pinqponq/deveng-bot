import { GuildMember, VoiceChannel, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { getTemporaryVoiceChannelByChannelId, getTemporaryVoiceChannelLobbies, updateTemporaryVoiceChannelOwner } from './database';
import { TemporaryVoiceChannelData, TemporaryVoiceChannelLobbyData } from '../types/database';
import { logError } from './logger';

/**
 * Kullanıcının geçici kanal sahibi olup olmadığını kontrol eder
 */
export async function isChannelOwner(
  member: GuildMember,
  channel: VoiceChannel
): Promise<boolean> {
  const tempChannel = await getTemporaryVoiceChannelByChannelId(channel.id);
  if (!tempChannel) return false;
  return tempChannel.ownerId === member.id;
}

/**
 * Kullanıcının moderator olup olmadığını kontrol eder
 */
export async function isModerator(
  member: GuildMember,
  channel: VoiceChannel
): Promise<boolean> {
  const tempChannel = await getTemporaryVoiceChannelByChannelId(channel.id);
  if (!tempChannel) return false;

  const lobbies = await getTemporaryVoiceChannelLobbies(member.guild.id);
  const lobby = lobbies.find(l => l.id === tempChannel.lobbyId);
  if (!lobby) return false;

  // Moderator rolleri kontrol et
  const moderatorRoles = lobby.roles.filter(r => r.roleType === 2); // 2 = Moderator
  if (moderatorRoles.length === 0) return false;

  return member.roles.cache.some(role => 
    moderatorRoles.some(mr => mr.roleId === role.id)
  );
}

/**
 * Kullanıcının bot admini olup olmadığını kontrol eder
 */
export function isBotAdmin(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
         member.permissions.has(PermissionFlagsBits.ManageGuild);
}

/**
 * Kullanıcının geçici kanal üzerinde yetkisi olup olmadığını kontrol eder
 */
export async function hasChannelPermission(
  member: GuildMember,
  channel: VoiceChannel
): Promise<boolean> {
  // Bot admini ise her zaman yetkili
  if (isBotAdmin(member)) return true;

  // Kanal sahibi ise yetkili
  if (await isChannelOwner(member, channel)) return true;

  // Moderator ise yetkili
  if (await isModerator(member, channel)) return true;

  return false;
}

/**
 * Interaction'dan geçici kanal bilgisini alır
 */
export async function getTemporaryChannelFromInteraction(
  interaction: ChatInputCommandInteraction
): Promise<{ channel: VoiceChannel; tempChannel: TemporaryVoiceChannelData; lobby: TemporaryVoiceChannelLobbyData } | null> {
  if (!interaction.guild || !interaction.member) return null;

  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice?.channel;

  if (!voiceChannel || !voiceChannel.isVoiceBased() || voiceChannel.type !== ChannelType.GuildVoice) {
    return null;
  }

  const tempChannel = await getTemporaryVoiceChannelByChannelId(voiceChannel.id);
  if (!tempChannel) return null;

  const lobbies = await getTemporaryVoiceChannelLobbies(interaction.guild.id);
  const lobby = lobbies.find(l => l.id === tempChannel.lobbyId);
  if (!lobby) return null;

  return {
    channel: voiceChannel as VoiceChannel,
    tempChannel,
    lobby
  };
}

/**
 * Komut kullanım yetkisini kontrol eder ve hata mesajı döner
 */
export async function checkChannelPermission(
  interaction: ChatInputCommandInteraction,
  requireOwner: boolean = false
): Promise<{ hasPermission: boolean; channel?: VoiceChannel; tempChannel?: TemporaryVoiceChannelData; lobby?: TemporaryVoiceChannelLobbyData }> {
  const respond = async (content: string): Promise<void> => {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content }).catch((error) => logError('voiceChannelHelpers:editReply', error, 'debug'));
      return;
    }
    await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch((error) => logError('voiceChannelHelpers:reply', error, 'debug'));
  };

  if (!interaction.guild || !interaction.member) {
    await respond('Bu komut sadece sunucularda kullanılabilir!');
    return { hasPermission: false };
  }

  const member = interaction.member as GuildMember;
  const channelData = await getTemporaryChannelFromInteraction(interaction);

  if (!channelData) {
    await respond('Bir geçici ses kanalında olmalısınız!');
    return { hasPermission: false };
  }

  const { channel, tempChannel, lobby } = channelData;

  // Bot admini kontrolü
  if (isBotAdmin(member)) {
    return { hasPermission: true, channel, tempChannel, lobby };
  }

  // Sahip kontrolü (eğer gerekliyse)
  if (requireOwner) {
    if (tempChannel.ownerId !== member.id) {
      await respond('Bu komutu sadece kanal sahibi kullanabilir!');
      return { hasPermission: false };
    }
    return { hasPermission: true, channel, tempChannel, lobby };
  }

  // Moderator veya sahip kontrolü
  const isOwner = tempChannel.ownerId === member.id;
  const isMod = await isModerator(member, channel);

  if (!isOwner && !isMod) {
    await respond('Bu komutu kullanmak için kanal sahibi veya moderator olmalısınız!');
    return { hasPermission: false };
  }

  return { hasPermission: true, channel, tempChannel, lobby };
}

/**
 * Sahip izin overwrite'larını Discord kanalına yazar.
 * Eski sahibin manage bitlerini temizler; yeni sahibe lobi ayarlarına göre izin verir.
 * API ownerId senkronu olmadan yalnızca Discord tarafı — transferTemporaryChannelOwnership kullanın.
 */
export async function syncOwnerPermissionOverwrites(
  channel: VoiceChannel,
  lobby: TemporaryVoiceChannelLobbyData,
  newOwnerId: string,
  previousOwnerId?: string | null,
): Promise<void> {
  const me = channel.guild.members.me;
  const canGrant = (bit: bigint) => !me || me.permissions.has(bit);

  if (previousOwnerId && previousOwnerId !== newOwnerId) {
    // Eski sahip manage yetkilerini kaybetmeli; View/Connect/Speak kalabilir (kanaldaysa).
    await channel.permissionOverwrites.edit(previousOwnerId, {
      ManageChannels: null,
      ManageRoles: null,
      PrioritySpeaker: null,
      MoveMembers: null,
    }).catch((error) => logError('voiceChannelHelpers:clearPreviousOwnerPerms', error, 'debug'));
  }

  await channel.permissionOverwrites.edit(newOwnerId, {
    ViewChannel: canGrant(PermissionFlagsBits.ViewChannel) ? true : null,
    Connect: canGrant(PermissionFlagsBits.Connect) ? true : null,
    Speak: canGrant(PermissionFlagsBits.Speak) ? true : null,
    ManageChannels: lobby.ownerCanManageChannel && canGrant(PermissionFlagsBits.ManageChannels) ? true : null,
    ManageRoles: lobby.ownerCanManagePermissions && canGrant(PermissionFlagsBits.ManageRoles) ? true : null,
    PrioritySpeaker: lobby.ownerIsPrioritySpeaker && canGrant(PermissionFlagsBits.PrioritySpeaker) ? true : null,
    MoveMembers: lobby.ownerCanMoveMembers && canGrant(PermissionFlagsBits.MoveMembers) ? true : null,
  }).catch((error) => logError('voiceChannelHelpers:setNewOwnerPerms', error, 'warn'));
}

/**
 * Sahipliği API + Discord overwrite ile kalıcılaştırır.
 * Başarısız API güncellemesinde null döner (Discord overwrite uygulanmaz).
 */
export async function transferTemporaryChannelOwnership(
  channel: VoiceChannel,
  lobby: TemporaryVoiceChannelLobbyData,
  newOwnerId: string,
  previousOwnerId?: string | null,
): Promise<TemporaryVoiceChannelData | null> {
  const updated = await updateTemporaryVoiceChannelOwner(channel.id, newOwnerId).catch((error) => {
    logError('voiceChannelHelpers:updateOwnerApi', error, 'warn');
    return null;
  });
  if (!updated) return null;

  await syncOwnerPermissionOverwrites(channel, lobby, newOwnerId, previousOwnerId);
  return updated;
}

