import { Guild, Role, PermissionFlagsBits } from 'discord.js';

export type RoleAssignBlockReason =
  | 'bot-member-missing'
  | 'missing-manage-roles'
  | 'everyone-role'
  | 'managed-role'
  | 'hierarchy';

export interface RoleAssignCheck {
  ok: boolean;
  reason?: RoleAssignBlockReason;
}

/**
 * Bir rolün bot tarafından üyeye verilip/alınabileceğini merkezi olarak doğrular.
 *
 * Discord kuralları:
 *  - Botun `ManageRoles` iznine ihtiyacı vardır (yoksa 50013).
 *  - `@everyone` rolü (id === guild.id) ve entegrasyon/booster gibi `managed` roller elle
 *    atanamaz (Invalid Form Body / 50013).
 *  - Hedef rol, botun en yüksek rolünden düşük konumda olmalıdır (aksi halde 50013).
 *
 * Bu yardımcı welcome autorole, reaction-role (buton/menü/emoji) ve otomasyon rol eylemleri
 * gibi tüm rol atama yollarında tekrar eden bu mantığı tek yerde toplar.
 */
export function botCanAssignRole(guild: Guild, role: Role): RoleAssignCheck {
  const me = guild.members.me;
  if (!me) return { ok: false, reason: 'bot-member-missing' };
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) return { ok: false, reason: 'missing-manage-roles' };
  if (role.id === guild.id) return { ok: false, reason: 'everyone-role' };
  if (role.managed) return { ok: false, reason: 'managed-role' };
  if (role.position >= me.roles.highest.position) return { ok: false, reason: 'hierarchy' };
  return { ok: true };
}

/** İnsan-okur/log dostu Türkçe açıklama. */
export function describeRoleAssignBlock(reason: RoleAssignBlockReason): string {
  switch (reason) {
    case 'bot-member-missing':
      return 'Bot sunucu üyeliği bulunamadı';
    case 'missing-manage-roles':
      return 'Botta "Rolleri Yönet" izni yok';
    case 'everyone-role':
      return '@everyone rolü elle atanamaz';
    case 'managed-role':
      return 'Entegrasyon/booster rolü elle atanamaz';
    case 'hierarchy':
      return 'Rol, botun en yüksek rolünden yüksekte (hiyerarşi)';
    default:
      return 'Rol atanamıyor';
  }
}
