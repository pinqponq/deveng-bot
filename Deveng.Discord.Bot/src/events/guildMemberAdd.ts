import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { createHash } from 'crypto';
import { loadConfig } from '../utils/config';
import { getWelcomeMessage } from '../utils/database';
import { createAutoRoleAudit, getAutoRoleConfig, getGuildLocale, type AutoRoleConfig } from '../utils/apiClient';
import { sendWelcomeCard } from '../utils/welcomeCardSender';
import { sendWelcomeDM } from '../utils/dmSender';
import { createWelcomeEmbed } from '../utils/embedBuilder';
import { replaceWelcomePlaceholders } from '../utils/placeholders';
import { sendMessage } from '../utils/messageSender';
import { getTextChannel } from '../utils/channelHelper';
import { assignWelcomeRole } from '../utils/roleAssigner';
import { updateStatisticsChannelByType } from '../utils/statisticsChannel';
import { trackInviteContribution } from '../utils/inviteLeaderboard';
import { apiRecordGuildMemberEvent } from '../utils/apiClient';

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const config = loadConfig();
    const guildId = member.guild.id;

    await trackInviteContribution(member);
    await apiRecordGuildMemberEvent(guildId, { userId: member.id, eventType: 0 });
    await assignAutoRoles(member);
    
    // Veritabanından hoşgeldin mesajını al
    const locale = await getLocaleOrDefault(guildId, config.defaultLanguage);
    const welcomeData = await getWelcomeMessage(guildId, locale.defaultLocale, locale.fallbackLocale);
    
    if (!welcomeData) {
      console.error(`[ERROR] Hoşgeldin mesajı bulunamadı sunucu için: ${guildId}`);
      await updateMemberStatistics(member);
      return;
    }
    
    const channel = getTextChannel(member.guild, welcomeData.channelId);

    if (!channel) {
      console.error(`[ERROR] Hoşgeldin kanalı bulunamadı: ${welcomeData.channelId}`);
      await updateMemberStatistics(member);
      return;
    }
    
    // Rol ver (eğer aktifse) — kanal iznine bağlı değil, her durumda dene.
    await assignWelcomeRole(member, welcomeData);

    // Özel mesaj (DM) gönder (eğer aktifse) — kanal iznine bağlı değil.
    await sendWelcomeDM(member, welcomeData);

    // Kanal izin ön-kontrolü: bot kanalda görüp yazamıyorsa kart/mesaj sessizce düşerdi
    // (rol + DM verilip kanala hiçbir şey gelmeyen "kısmi karşılama" tanısı zor). Net logla.
    const me = member.guild.members.me;
    const perms = me ? channel.permissionsFor(me) : null;
    if (!perms || !perms.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.SendMessages)) {
      console.error(`[ERROR] Hoşgeldin kanalına yazılamıyor (Görüntüle/Mesaj Gönder izni yok): ${welcomeData.channelId} (Sunucu: ${guildId})`);
      await updateMemberStatistics(member);
      return;
    }

    // Karşılama kartı gönder (eğer aktifse)
    await sendWelcomeCard(member, channel, welcomeData);

    // Placeholder'ları değiştir
    const finalMessage = replaceWelcomePlaceholders(member, welcomeData.message);

    // Embed veya normal mesaj olarak gönder
    const content = welcomeData.isEmbed
      ? createWelcomeEmbed(member, welcomeData, finalMessage)
      : finalMessage;

    await sendMessage(channel, content, welcomeData.isEmbed, 'Hoşgeldin mesajı gönderilemedi');

    console.log(`[INFO] ${member.user.tag} için hoşgeldin mesajı gönderildi (Sunucu: ${guildId}, Embed: ${welcomeData.isEmbed}, Card: ${welcomeData.sendWelcomeCard}, DM: ${welcomeData.sendDM}, Role: ${welcomeData.giveRole}).`);
    
    // İstatistik kanallarını güncelle
    await updateMemberStatistics(member);
  } catch (error) {
    console.error(`[ERROR] GuildMemberAdd event handler hatası:`, error);
  }
}

async function getLocaleOrDefault(guildId: string, defaultLanguage: string): Promise<{ defaultLocale: string; fallbackLocale: string }> {
  try {
    const locale = await getGuildLocale(guildId);
    return {
      defaultLocale: locale?.defaultLocale || defaultLanguage,
      fallbackLocale: locale?.fallbackLocale || defaultLanguage,
    };
  } catch (error) {
    console.warn(`[WARN] Guild locale alınamadı, config dili kullanılacak (GuildId: ${guildId}):`, error);
    return { defaultLocale: defaultLanguage, fallbackLocale: defaultLanguage };
  }
}

async function updateMemberStatistics(member: GuildMember): Promise<void> {
  const guildId = member.guild.id;
  await updateStatisticsChannelByType(guildId, 'Üye Sayısı');
  await updateStatisticsChannelByType(guildId, 'Toplam Üye');
  await updateStatisticsChannelByType(guildId, 'Çevrimiçi Üye');
  if (member.user.bot) {
    await updateStatisticsChannelByType(guildId, 'Botlar');
  }
}

async function assignAutoRoles(member: GuildMember): Promise<void> {
  try {
    const config = await getAutoRoleConfig(member.guild.id);
    if (!config?.enabled || config.roles.length === 0) return;

    const assign = async () => assignAutoRolesNow(member, config);
    if (config.delaySeconds > 0) {
      setTimeout(() => {
        assign().catch((error) => console.error('[ERROR] Gecikmeli autorole uygulanamadı:', error));
      }, config.delaySeconds * 1000);
      return;
    }

    await assign();
  } catch (error) {
    console.warn(`[WARN] AutoRole yapılandırması alınamadı (GuildId: ${member.guild.id}):`, error);
  }
}

async function assignAutoRolesNow(member: GuildMember, config: AutoRoleConfig): Promise<void> {
  const botMember = member.guild.members.me;
  const userIdHash = createHash('sha256').update(`${member.guild.id}:${member.user.id}`).digest('hex');

  if (!botMember) {
    await auditAutoRole(member.guild.id, userIdHash, 'unknown', 'failed', 'bot_member_missing');
    return;
  }

  if (config.minAccountAgeDays && config.minAccountAgeDays > 0) {
    const accountAgeMs = Date.now() - member.user.createdTimestamp;
    const minAgeMs = config.minAccountAgeDays * 24 * 60 * 60 * 1000;
    if (accountAgeMs < minAgeMs) {
      await auditAutoRole(member.guild.id, userIdHash, 'all', 'skipped', 'min_account_age');
      return;
    }
  }

  for (const entry of config.roles.filter((role) => role.enabled).sort((a, b) => a.sortOrder - b.sortOrder)) {
    const role = member.guild.roles.cache.get(entry.roleId);
    if (!role) {
      await auditAutoRole(member.guild.id, userIdHash, entry.roleId, 'failed', 'role_not_found');
      continue;
    }

    if (role.managed || role.id === member.guild.id) {
      await auditAutoRole(member.guild.id, userIdHash, entry.roleId, 'failed', 'unsafe_role');
      continue;
    }

    if (member.roles.cache.has(entry.roleId)) {
      await auditAutoRole(member.guild.id, userIdHash, entry.roleId, 'skipped', 'already_has_role');
      continue;
    }

    if (role.position >= botMember.roles.highest.position) {
      await auditAutoRole(member.guild.id, userIdHash, entry.roleId, 'failed', 'role_hierarchy');
      continue;
    }

    try {
      await member.roles.add(role);
      await auditAutoRole(member.guild.id, userIdHash, entry.roleId, 'success');
      console.log(`[INFO] AutoRole: ${member.user.tag} için ${role.name} rolü verildi.`);
    } catch (error) {
      await auditAutoRole(member.guild.id, userIdHash, entry.roleId, 'failed', 'discord_add_role_failed');
      console.error(`[ERROR] AutoRole rol verilemedi (${member.user.tag}, RoleId: ${entry.roleId}):`, error);
    }
  }
}

async function auditAutoRole(
  guildId: string,
  userIdHash: string,
  roleId: string,
  result: string,
  errorCode?: string,
): Promise<void> {
  try {
    await createAutoRoleAudit({ guildId, userIdHash, roleId, result, errorCode });
  } catch (error) {
    console.warn('[WARN] AutoRole audit kaydı yazılamadı:', error);
  }
}

