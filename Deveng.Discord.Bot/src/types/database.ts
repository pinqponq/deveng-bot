import type { EmbedExtendedOptionalFields } from './embedConfig';

export interface WelcomeData extends EmbedExtendedOptionalFields {
  channelId: string;
  message: string;
  isEmbed: boolean;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
  embedThumbnail?: string | null;
  embedImage?: string | null;
  embedFooter?: string | null;
  sendWelcomeCard: boolean;
  sendDM: boolean;
  dmMessage?: string | null;
  isDMEmbed: boolean;
  dmEmbedTitle?: string | null;
  dmEmbedDescription?: string | null;
  dmEmbedColor?: string | null;
  dmEmbedThumbnail?: string | null;
  dmEmbedImage?: string | null;
  dmEmbedFooter?: string | null;
  dmEmbedTitleUrl?: string | null;
  dmEmbedAuthorName?: string | null;
  dmEmbedAuthorIcon?: string | null;
  dmEmbedAuthorUrl?: string | null;
  dmEmbedFooterIcon?: string | null;
  dmEmbedUseTimestamp?: boolean;
  dmEmbedFieldsJson?: string | null;
  sendDMCard: boolean;
  dmCardTitle?: string | null;
  dmCardUsernameText?: string | null;
  dmCardMemberText?: string | null;
  dmCardBackgroundColor1?: string | null;
  dmCardBackgroundColor2?: string | null;
  dmCardTextColor?: string | null;
  dmCardBorderColor?: string | null;
  cardTitle?: string | null;
  cardUsernameText?: string | null;
  cardMemberText?: string | null;
  cardBackgroundColor1?: string | null;
  cardBackgroundColor2?: string | null;
  cardTextColor?: string | null;
  cardBorderColor?: string | null;
  giveRole: boolean;
  roleId?: string | null;
}

export interface GoodbyeData extends EmbedExtendedOptionalFields {
  channelId: string;
  message: string;
  isEmbed: boolean;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
  embedThumbnail?: string | null;
  embedImage?: string | null;
  embedFooter?: string | null;
}

// SQL result record interfaces
export interface WelcomeRecord {
  ChannelId: string;
  Message: string;
  IsEmbed: boolean | number;
  EmbedTitle: string | null;
  EmbedColor: string | null;
  EmbedThumbnail: string | null;
  EmbedImage: string | null;
  EmbedFooter: string | null;
  SendWelcomeCard: boolean | number;
  SendDM: boolean | number;
  DMMessage: string | null;
  IsDMEmbed: boolean | number;
  DMEmbedTitle: string | null;
  DMEmbedColor: string | null;
  DMEmbedThumbnail: string | null;
  DMEmbedImage: string | null;
  DMEmbedFooter: string | null;
  SendDMCard: boolean | number;
  DMCardTitle: string | null;
  DMCardUsernameText: string | null;
  DMCardMemberText: string | null;
  DMCardBackgroundColor1: string | null;
  DMCardBackgroundColor2: string | null;
  DMCardTextColor: string | null;
  DMCardBorderColor: string | null;
  CardTitle: string | null;
  CardUsernameText: string | null;
  CardMemberText: string | null;
  CardBackgroundColor1: string | null;
  CardBackgroundColor2: string | null;
  CardTextColor: string | null;
  CardBorderColor: string | null;
  GiveRole: boolean | number;
  RoleId: string | null;
}

export interface GoodbyeRecord {
  ChannelId: string;
  Message: string;
  IsEmbed: boolean | number;
  EmbedTitle: string | null;
  EmbedColor: string | null;
  EmbedThumbnail: string | null;
  EmbedImage: string | null;
  EmbedFooter: string | null;
}

export interface ReactionRoleData extends EmbedExtendedOptionalFields {
  id: number;
  guildId: string;
  channelId: string | null;
  normalMessage: string | null;
  isEmbed: boolean;
  embedTitle: string | null;
  embedDescription: string | null;
  embedColor: string | null;
  embedThumbnail: string | null;
  embedImage: string | null;
  embedFooter: string | null;
  messageId: string | null;
  enabled: boolean;
  enableEmoji: boolean;
  enableButton: boolean;
  enableMenu: boolean;
  emojis: ReactionRoleEmojiData[];
  buttons: ReactionRoleButtonData[];
  menus: ReactionRoleMenuData[];
}

export interface ReactionRoleEmojiData {
  id: number;
  emoji: string;
  roleId: string;
  orderIndex: number;
  enabled: boolean;
}

export interface ReactionRoleButtonData {
  id: number;
  label: string;
  emoji: string | null;
  roleId: string;
  style: number;
  orderIndex: number;
  enabled: boolean;
}

export interface ReactionRoleMenuData {
  id: number;
  placeholder: string | null;
  minValues: number;
  maxValues: number;
  enabled: boolean;
  options: ReactionRoleMenuOptionData[];
}

export interface ReactionRoleMenuOptionData {
  id: number;
  label: string;
  description: string | null;
  roleId: string;
  emoji: string | null;
  orderIndex: number;
  enabled: boolean;
}

// SQL Record Interfaces
export interface ReactionRoleRecord {
  Id: number;
  GuildId: string;
  ChannelId: string | null;
  NormalMessage: string | null;
  IsEmbed: boolean | number;
  EmbedTitle: string | null;
  EmbedDescription: string | null;
  EmbedColor: string | null;
  EmbedThumbnail: string | null;
  EmbedImage: string | null;
  EmbedFooter: string | null;
  MessageId: string | null;
  Enabled: boolean | number;
  EnableEmoji: boolean | number;
  EnableButton: boolean | number;
  EnableMenu: boolean | number;
}

export interface ReactionRoleEmojiRecord {
  Id: number;
  Emoji: string;
  RoleId: string;
  OrderIndex: number;
  Enabled: boolean | number;
}

export interface ReactionRoleButtonRecord {
  Id: number;
  Label: string;
  Emoji: string | null;
  RoleId: string;
  Style: number;
  OrderIndex: number;
  Enabled: boolean | number;
}

export interface ReactionRoleMenuRecord {
  Id: number;
  Placeholder: string | null;
  MinValues: number;
  MaxValues: number;
  Enabled: boolean | number;
}

export interface ReactionRoleMenuOptionRecord {
  Id: number;
  Label: string;
  Description: string | null;
  RoleId: string;
  Emoji: string | null;
  OrderIndex: number;
  Enabled: boolean | number;
}

export interface ModeratorData {
  id: number;
  guildId: string;
  enabled: boolean;
  rules: ModeratorRuleData[];
  forbiddenWords: ForbiddenWordData[];
}

export interface ModeratorRuleData {
  id: number;
  moderatorId: number;
  ruleType: string;
  action: number; // 0: Devre Dışı, 1: Mesaj Sil, 2: Kullanıcıyı Uyar, 3: Mesajı Sil & Üyeyi Uyar
  enabled: boolean;
}

export interface ForbiddenWordData {
  id: number;
  moderatorId: number;
  word: string;
}

export interface CustomCommandData {
  id: number;
  guildId: string;
  commandName: string;
  actionType: number; // 0: Kanalda Mesaj Gönder, 1: Kanalda Yanıt Ver, 2: Rol Ver, 3: Rol Kaldır
  targetChannelId: string | null;
  message: string | null;
  roleId: string | null;
  enabled: boolean;
  useRegex?: boolean;
  triggerPattern?: string | null;
  cooldownSeconds?: number;
  scope?: 'slash' | 'message' | 'both' | string;
}

export interface TicketPanelData extends EmbedExtendedOptionalFields {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  panelMessage: string | null;
  isEmbed: boolean;
  embedTitle: string | null;
  embedDescription: string | null;
  embedColor: string | null;
  embedThumbnail: string | null;
  embedImage: string | null;
  embedFooter: string | null;
  welcomeMessage: string | null;
  isWelcomeEmbed: boolean;
  welcomeEmbedTitle: string | null;
  welcomeEmbedDescription: string | null;
  welcomeEmbedColor: string | null;
  welcomeEmbedThumbnail: string | null;
  welcomeEmbedImage: string | null;
  welcomeEmbedFooter: string | null;
  transcriptChannelId: string | null;
  sendTranscriptToUser: boolean;
  openCategoryId: string | null;
  openCategoryName: string | null;
  claimedCategoryId: string | null;
  claimedCategoryName: string | null;
  closedCategoryId: string | null;
  closedCategoryName: string | null;
  enabled: boolean;
  roleIds: string[];
  ticketTypes: TicketTypeData[];
}

export interface TicketTypeData {
  id: number;
  type: number; // 0: Buton, 1: Açılır Menü
  label: string;
  emoji: string | null;
  style: number;
  placeholder: string | null;
  orderIndex: number;
  openCategoryId: string | null;
  openCategoryName: string | null;
  claimedCategoryId: string | null;
  claimedCategoryName: string | null;
  closedCategoryId: string | null;
  closedCategoryName: string | null;
  enabled: boolean;
}

export interface TicketData {
  id: number;
  ticketPanelId: number;
  ticketTypeId: number | null;
  guildId: string;
  channelId: string;
  userId: string;
  status: number; // 0: Açık, 1: Üstlenildi, 2: Kapatıldı
  claimedBy: string | null;
  claimedAt: Date | null;
  closedBy: string | null;
  closedAt: Date | null;
  transcriptId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmbedMessageData extends EmbedExtendedOptionalFields {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  name: string;
  isEmbed: boolean;
  embedTitle: string | null;
  embedDescription: string | null;
  embedColor: string | null;
  embedThumbnail: string | null;
  embedImage: string | null;
  embedFooter: string | null;
  message?: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PollData {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  question: string;
  isActive: boolean;
  endedAt: Date | null;
  endAfterMinutes: number | null;
  endAfterVotes: number | null;
  allowMultipleVotes: boolean;
  totalVotes: number;
  pollEmbedTitle: string | null;
  pollEmbedDescription: string | null;
  pollEmbedColor: string | null;
  pollEmbedThumbnail: string | null;
  pollEmbedImage: string | null;
  pollEmbedFooter: string | null;
  pollEmbedTitleUrl?: string | null;
  pollEmbedAuthorName?: string | null;
  pollEmbedAuthorIcon?: string | null;
  pollEmbedAuthorUrl?: string | null;
  pollEmbedFooterIcon?: string | null;
  pollEmbedUseTimestamp?: boolean;
  pollEmbedFieldsJson?: string | null;
  resultEmbedTitle: string | null;
  resultEmbedDescription: string | null;
  resultEmbedColor: string | null;
  resultEmbedThumbnail: string | null;
  resultEmbedImage: string | null;
  resultEmbedFooter: string | null;
  resultEmbedTitleUrl?: string | null;
  resultEmbedAuthorName?: string | null;
  resultEmbedAuthorIcon?: string | null;
  resultEmbedAuthorUrl?: string | null;
  resultEmbedFooterIcon?: string | null;
  resultEmbedUseTimestamp?: boolean;
  resultEmbedFieldsJson?: string | null;
  createdAt: Date;
  updatedAt: Date;
  options: PollOptionData[];
  rolePermissions: PollRolePermissionData[];
}

export interface PollOptionData {
  id: number;
  pollId: number;
  optionText: string;
  emoji: string | null;
  orderIndex: number;
  voteCount: number;
  createdAt: Date;
}

export interface PollRolePermissionData {
  id: number;
  pollId: number;
  roleId: string;
  isAllowed: boolean;
  createdAt: Date;
}

export interface TemporaryVoiceChannelLobbyData {
  id: number;
  guildId: string;
  channelId: string;
  channelName: string;
  userLimit: number | null;
  bitrate: number | null;
  deleteAfterMinutes: number | null;
  ownershipTimeoutMinutes: number | null;
  syncCategoryPermissions: boolean;
  syncChannelPermissions: boolean;
  createTextChannel: boolean;
  restrictCommandsToTextChannel: boolean;
  pinCommandUsage: boolean;
  restrictTextChannel: boolean;
  ownerCanManageChannel: boolean;
  ownerCanManagePermissions: boolean;
  ownerIsPrioritySpeaker: boolean;
  ownerCanMoveMembers: boolean;
  enabled: boolean;
  roles: TemporaryVoiceChannelRoleData[];
}

export interface TemporaryVoiceChannelRoleData {
  id: number;
  roleId: string;
  roleType: number; // 0: Ignore, 1: Access, 2: Moderator
  canManageAccess: boolean;
}

export interface BirthdayData extends EmbedExtendedOptionalFields {
  channelId?: string | null;
  roleId?: string | null;
  isEmbed: boolean;
  message?: string | null;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
  embedThumbnail?: string | null;
  embedImage?: string | null;
  embedFooter?: string | null;
  enabled: boolean;
  checkHour?: number;
  createMessageIsEmbed?: boolean;
  createMessage?: string | null;
  createEmbedTitle?: string | null;
  createEmbedDescription?: string | null;
  createEmbedColor?: string | null;
  createEmbedThumbnail?: string | null;
  createEmbedImage?: string | null;
  createEmbedFooter?: string | null;
  createEmbedTitleUrl?: string | null;
  createEmbedAuthorName?: string | null;
  createEmbedAuthorIcon?: string | null;
  createEmbedAuthorUrl?: string | null;
  createEmbedFooterIcon?: string | null;
  createEmbedUseTimestamp?: boolean;
  createEmbedFieldsJson?: string | null;
}

export interface BirthdayUserData {
  userId: string;
  birthDate: string;
  guildId: string;
}

export interface TemporaryVoiceChannelData {
  id: number;
  lobbyId: number;
  guildId: string;
  channelId: string;
  textChannelId: string | null;
  ownerId: string;
  channelName: string;
  isLocked: boolean;
  isHidden: boolean;
  userLimit: number | null;
  bitrate: number | null;
  bannedUserIds: string[];
  lastActivityAt: Date;
  createdAt: Date;
}

export interface LogChannelData extends EmbedExtendedOptionalFields {
  id: number;
  guildId: string;
  channelId: string;
  enabled: boolean;
  isEmbed: boolean;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
  embedThumbnail?: string | null;
  embedImage?: string | null;
  embedFooter?: string | null;
  types: LogChannelTypeData[];
}

export interface LogChannelTypeData extends EmbedExtendedOptionalFields {
  id: number;
  logChannelId: number;
  logType: string;
  channelId?: string | null; // Her log türü için ayrı kanal (NULL ise varsayılan kanal kullanılır)
  enabled: boolean;
  // Embed Ayarları (Her log türü için ayrı)
  isEmbed: boolean;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
  embedThumbnail?: string | null;
  embedImage?: string | null;
  embedFooter?: string | null;
}

export interface GiveawayData extends EmbedExtendedOptionalFields {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  name: string;
  prize: string;
  winnerCount: number;
  endDate: Date;
  timeZone: string | null;
  isActive: boolean;
  isEnded: boolean;
  rolePermissionType: number; // 0: Bu roller dışındaki tüm rolleri yok say, 1: Bu roller dışındaki tüm rollere izin ver
  isEmbed: boolean;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
  embedThumbnail?: string | null;
  embedImage?: string | null;
  embedFooter?: string | null;
  createdAt: Date;
  updatedAt: Date;
  roles: GiveawayRoleData[];
  allowedRoles: GiveawayAllowedRoleData[];
  participantCount: number;
  winners: GiveawayWinnerData[];
}

export interface GiveawayRoleData {
  id: number;
  giveawayId: number;
  roleId: string;
  winChanceMultiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GiveawayAllowedRoleData {
  id: number;
  giveawayId: number;
  roleId: string;
  createdAt: Date;
}

export interface GiveawayParticipantData {
  id: number;
  giveawayId: number;
  userId: string;
  joinedAt: Date;
}

export interface GiveawayWinnerData {
  id: number;
  giveawayId: number;
  userId: string;
  wonAt: Date;
}