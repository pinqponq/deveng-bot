/**
 * Bot davet URL’si `permissions=` — Yönetici (8) yerine parçalı izinler (MEE6 benzeri ekran).
 * @see https://discord.com/developers/docs/topics/permissions#permissions-bitwise
 */
const botInvitePermissionBits =
  0n |
  (1n << 0n) | // CreateInstantInvite
  (1n << 1n) | // KickMembers
  (1n << 2n) | // BanMembers
  (1n << 4n) | // ManageChannels — bilet / geçici ses kanalı kanal yönetimi
  (1n << 6n) | // AddReactions
  (1n << 7n) | // ViewAuditLog
  (1n << 8n) | // PrioritySpeaker
  (1n << 9n) | // Stream
  (1n << 10n) | // ViewChannel
  (1n << 11n) | // SendMessages
  (1n << 13n) | // ManageMessages
  (1n << 14n) | // EmbedLinks
  (1n << 15n) | // AttachFiles
  (1n << 16n) | // ReadMessageHistory
  (1n << 18n) | // UseExternalEmojis
  (1n << 19n) | // ViewGuildInsights
  (1n << 20n) | // Connect
  (1n << 21n) | // Speak
  (1n << 22n) | // MuteMembers
  (1n << 23n) | // DeafenMembers
  (1n << 24n) | // MoveMembers
  (1n << 25n) | // UseVAD
  (1n << 26n) | // ChangeNickname
  (1n << 27n) | // ManageNicknames
  (1n << 28n) | // ManageRoles
  (1n << 29n) | // ManageWebhooks — log / entegrasyon
  (1n << 31n) | // UseApplicationCommands
  (1n << 32n) | // RequestToSpeak
  (1n << 33n) | // ManageEvents
  (1n << 34n) | // ManageThreads
  (1n << 35n) | // CreatePublicThreads
  (1n << 36n) | // CreatePrivateThreads
  (1n << 37n) | // UseExternalStickers
  (1n << 38n) | // SendMessagesInThreads
  (1n << 39n) | // UseEmbeddedActivities
  (1n << 40n) // ModerateMembers — timeout

/** Davet URL query `permissions` (64-bit; string → büyük maskelerde kayma yok) */
export const DEFAULT_BOT_INVITE_PERMISSIONS = botInvitePermissionBits.toString()
