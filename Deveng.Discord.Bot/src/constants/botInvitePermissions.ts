/**
 * @see Deveng.Discord.Web/src/lib/discord-bot-invite-permissions.ts (aynı maske; davet ekranında Yönetici yok)
 */
const botInvitePermissionBits =
  0n |
  (1n << 0n) |
  (1n << 1n) |
  (1n << 2n) |
  (1n << 4n) |
  (1n << 6n) |
  (1n << 7n) |
  (1n << 8n) |
  (1n << 9n) |
  (1n << 10n) |
  (1n << 11n) |
  (1n << 13n) |
  (1n << 14n) |
  (1n << 15n) |
  (1n << 16n) |
  (1n << 18n) |
  (1n << 19n) |
  (1n << 20n) |
  (1n << 21n) |
  (1n << 22n) |
  (1n << 23n) |
  (1n << 24n) |
  (1n << 25n) |
  (1n << 26n) |
  (1n << 27n) |
  (1n << 28n) |
  (1n << 29n) |
  (1n << 31n) |
  (1n << 32n) |
  (1n << 33n) |
  (1n << 34n) |
  (1n << 35n) |
  (1n << 36n) |
  (1n << 37n) |
  (1n << 38n) |
  (1n << 39n) |
  (1n << 40n)

export const DEFAULT_BOT_INVITE_PERMISSIONS = botInvitePermissionBits.toString()
