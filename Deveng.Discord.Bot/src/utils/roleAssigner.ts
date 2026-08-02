import { GuildMember } from 'discord.js';
import { WelcomeData } from '../types/database';
import { botCanAssignRole, describeRoleAssignBlock } from './roleAssignment';

/**
 * Rol verme yardımcı fonksiyonları
 */

export async function assignWelcomeRole(
  member: GuildMember,
  welcomeData: WelcomeData
): Promise<void> {
  if (!welcomeData.giveRole) {
    return;
  }

  if (!welcomeData.roleId) {
    console.log(`[INFO] ${member.user.tag} için rol verilmedi (RoleId boş).`);
    return;
  }

  try {
    const role = member.guild.roles.cache.get(welcomeData.roleId);

    if (!role) {
      console.error(`[ERROR] Rol bulunamadı: ${welcomeData.roleId} (Sunucu: ${member.guild.id})`);
      return;
    }

    // Kullanıcının zaten bu rolü var mı kontrol et
    if (member.roles.cache.has(welcomeData.roleId)) {
      console.log(`[INFO] ${member.user.tag} zaten ${role.name} rolüne sahip.`);
      return;
    }

    // Bot'un bu rolü verebilme yetkisi var mı kontrol et (ManageRoles + hiyerarşi + managed/@everyone)
    const assignCheck = botCanAssignRole(member.guild, role);
    if (!assignCheck.ok) {
      console.error(`[ERROR] Bot, ${role.name} rolünü veremez (${describeRoleAssignBlock(assignCheck.reason!)}) (Sunucu: ${member.guild.id})`);
      return;
    }

    // Rolü ver
    await member.roles.add(role);

    console.log(`[INFO] ${member.user.tag} için ${role.name} rolü verildi.`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Missing Permissions')) {
        console.error(`[ERROR] Rol verme yetkisi yok: ${welcomeData.roleId} (Sunucu: ${member.guild.id})`);
      } else if (error.message.includes('Invalid Form Body')) {
        console.error(`[ERROR] Geçersiz rol ID: ${welcomeData.roleId} (Sunucu: ${member.guild.id})`);
      } else {
        console.error(`[ERROR] Rol verilemedi (${member.user.tag}, Sunucu: ${member.guild.id}):`, error.message);
      }
    } else {
      console.error(`[ERROR] Rol verilemedi (${member.user.tag}, Sunucu: ${member.guild.id}):`, error);
    }
  }
}

