/**
 * Discord guild permission bitfield (users/@me/guilds).
 * Değerler 53 bitten büyük olabilir; JS Number ve 32-bit & ile kontrol edilmemeli.
 * @see https://discord.com/developers/docs/topics/permissions
 */
const FLAG_ADMINISTRATOR = 1n << 3n
const FLAG_MANAGE_GUILD = 1n << 5n

/**
 * Kullanıcı bu sunucuda panelde yönetim sayılabilecek yetkiye sahip mi (Owner / Administrator / Manage Guild).
 */
export function canManageDiscordGuild(
  permissions: string | number | bigint | undefined | null,
  owner?: boolean
): boolean {
  if (owner === true) return true
  if (permissions === undefined || permissions === null) return false
  try {
    const p = typeof permissions === 'bigint' ? permissions : BigInt(String(permissions))
    return (
      (p & FLAG_ADMINISTRATOR) === FLAG_ADMINISTRATOR ||
      (p & FLAG_MANAGE_GUILD) === FLAG_MANAGE_GUILD
    )
  } catch {
    return false
  }
}
