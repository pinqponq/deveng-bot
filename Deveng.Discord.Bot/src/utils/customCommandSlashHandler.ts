import { type ChatInputCommandInteraction } from 'discord.js';
import { getCustomCommands } from './apiClient';
import { toSlashCommandName } from './registerCommands';
import { getTextChannel } from './channelHelper';
import { botCanAssignRole, describeRoleAssignBlock } from './roleAssignment';
import { logError } from './logger';
import type { CustomCommandData } from '../types/database';

const cooldowns = new Map<string, number>();

const CUSTOM_COMMANDS_TTL_MS = 15_000;
const customCommandsCache = new Map<string, { at: number; data: CustomCommandData[] }>();

async function getCustomCommandsCached(guildId: string): Promise<CustomCommandData[]> {
  const cached = customCommandsCache.get(guildId);
  if (cached && Date.now() - cached.at < CUSTOM_COMMANDS_TTL_MS) return cached.data;
  const data = await getCustomCommands(guildId);
  customCommandsCache.set(guildId, { at: Date.now(), data });
  return data;
}

/**
 * Slash komut olarak tetiklenen özel komutu işler (prefix ! yok, sadece /komut-adi).
 */
export async function handleCustomCommandSlash(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (!interaction.guild || !interaction.member) return false;

  const commandName = interaction.commandName;
  const customCommands = await getCustomCommandsCached(interaction.guild.id);
  const customCommand = customCommands.find(
    (c) => c.enabled && toSlashCommandName(c.commandName) === commandName
  );

  if (!customCommand) return false;

  const deferred = await interaction
    .deferReply()
    .then(() => true)
    .catch((err: { code?: number }) => {
      if (err?.code === 10062 || err?.code === 40060) return false;
      throw err;
    });
  if (!deferred) return true;

  try {
    if (!(await checkCooldown(interaction.guild.id, interaction.user.id, customCommand, interaction))) {
      return true;
    }

    switch (customCommand.actionType) {
      case 0:
        await handleSendToChannel(interaction, customCommand);
        break;
      case 1:
        await handleReply(interaction, customCommand);
        break;
      case 2:
        await handleAddRole(interaction, customCommand);
        break;
      case 3:
        await handleRemoveRole(interaction, customCommand);
        break;
      default:
        await interaction.editReply({ content: 'Bilinmeyen komut türü.' });
    }
    return true;
  } catch (error) {
    console.error('[ERROR] Custom command slash hatası:', error);
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((err) => logError('customCommandSlashHandler:errorReply', err, 'debug'));
    }
    return true;
  }
}

async function checkCooldown(
  guildId: string,
  userId: string,
  command: CustomCommandData,
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  const cooldownSeconds = Math.max(0, command.cooldownSeconds ?? 2);
  if (cooldownSeconds === 0) return true;

  const key = `${guildId}:${command.id}:${userId}`;
  const now = Date.now();
  const nextAllowedAt = cooldowns.get(key) ?? 0;
  if (nextAllowedAt > now) {
    const waitSeconds = Math.ceil((nextAllowedAt - now) / 1000);
    await interaction.editReply({ content: `Bu komutu tekrar kullanmak için ${waitSeconds} saniye bekleyin.` });
    return false;
  }

  cooldowns.set(key, now + cooldownSeconds * 1000);
  return true;
}

async function handleSendToChannel(interaction: ChatInputCommandInteraction, command: CustomCommandData): Promise<void> {
  if (!interaction.guild) return;
  if (!command.targetChannelId || !command.message) {
    await interaction.editReply({ content: 'Bu komut yapılandırılmamış.' });
    return;
  }
  const channel = getTextChannel(interaction.guild, command.targetChannelId);
  if (!channel) {
    await interaction.editReply({ content: 'Hedef kanal bulunamadı.' });
    return;
  }
  await channel.send(command.message);
  await interaction.editReply({ content: 'Mesaj gönderildi.' });
}

async function handleReply(interaction: ChatInputCommandInteraction, command: CustomCommandData): Promise<void> {
  if (!command.message) {
    await interaction.editReply({ content: 'Bu komut yapılandırılmamış.' });
    return;
  }
  await interaction.editReply(command.message);
}

async function handleAddRole(interaction: ChatInputCommandInteraction, command: CustomCommandData): Promise<void> {
  if (!interaction.guild) return;
  if (!command.roleId) {
    await interaction.editReply({ content: 'Bu komut yapılandırılmamış.' });
    return;
  }
  const role = interaction.guild.roles.cache.get(command.roleId);
  if (!role) {
    await interaction.editReply({ content: 'Rol bulunamadı.' });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id).catch((error) => { logError('customCommandSlashHandler:fetchMemberAddRole', error, 'debug'); return null; });
  if (!member) {
    await interaction.editReply({ content: 'Üye bilgisi alınamadı.' });
    return;
  }
  if (member.roles.cache.has(command.roleId)) {
    await interaction.editReply({ content: 'Bu role zaten sahipsiniz!' });
    return;
  }
  const addCheck = botCanAssignRole(interaction.guild, role);
  if (!addCheck.ok) {
    console.error(`[ERROR] Özel komut rolü verilemedi (${describeRoleAssignBlock(addCheck.reason!)}): ${role.name} (${role.id})`);
    await interaction.editReply({ content: 'Bu rol verilemiyor (botun yetkisi/rol sırası uygun değil).' });
    return;
  }
  await member.roles.add(role);
  await interaction.editReply({ content: `✅ ${role.name} rolü size verildi!` });
}

async function handleRemoveRole(interaction: ChatInputCommandInteraction, command: CustomCommandData): Promise<void> {
  if (!interaction.guild) return;
  if (!command.roleId) {
    await interaction.editReply({ content: 'Bu komut yapılandırılmamış.' });
    return;
  }
  const role = interaction.guild.roles.cache.get(command.roleId);
  if (!role) {
    await interaction.editReply({ content: 'Rol bulunamadı.' });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id).catch((error) => { logError('customCommandSlashHandler:fetchMemberRemoveRole', error, 'debug'); return null; });
  if (!member) {
    await interaction.editReply({ content: 'Üye bilgisi alınamadı.' });
    return;
  }
  if (!member.roles.cache.has(command.roleId)) {
    await interaction.editReply({ content: 'Bu role sahip değilsiniz.' });
    return;
  }
  const removeCheck = botCanAssignRole(interaction.guild, role);
  if (!removeCheck.ok) {
    console.error(`[ERROR] Özel komut rolü kaldırılamadı (${describeRoleAssignBlock(removeCheck.reason!)}): ${role.name} (${role.id})`);
    await interaction.editReply({ content: 'Bu rol kaldırılamıyor (botun yetkisi/rol sırası uygun değil).' });
    return;
  }
  await member.roles.remove(role);
  await interaction.editReply({ content: `✅ ${role.name} rolü sizden kaldırıldı!` });
}
