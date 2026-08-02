/** Discord embed genişletme alanları — API IEmbedExtendedFields ile uyumlu */
export interface EmbedExtendedFields {
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
}

/** dmEmbed* prefix'li genişletme alanları */
export interface DmEmbedExtendedFields {
  dmEmbedTitleUrl?: string
  dmEmbedAuthorName?: string
  dmEmbedAuthorIcon?: string
  dmEmbedAuthorUrl?: string
  dmEmbedFooterIcon?: string
  dmEmbedUseTimestamp?: boolean
  dmEmbedFieldsJson?: string
}

/** welcomeEmbed* prefix'li genişletme alanları */
export interface WelcomeEmbedExtendedFields {
  welcomeEmbedTitleUrl?: string
  welcomeEmbedAuthorName?: string
  welcomeEmbedAuthorIcon?: string
  welcomeEmbedAuthorUrl?: string
  welcomeEmbedFooterIcon?: string
  welcomeEmbedUseTimestamp?: boolean
  welcomeEmbedFieldsJson?: string
}

/** pollEmbed* prefix'li genişletme alanları */
export interface PollEmbedExtendedFields {
  pollEmbedTitleUrl?: string
  pollEmbedAuthorName?: string
  pollEmbedAuthorIcon?: string
  pollEmbedAuthorUrl?: string
  pollEmbedFooterIcon?: string
  pollEmbedUseTimestamp?: boolean
  pollEmbedFieldsJson?: string
}

/** resultEmbed* prefix'li genişletme alanları */
export interface ResultEmbedExtendedFields {
  resultEmbedTitleUrl?: string
  resultEmbedAuthorName?: string
  resultEmbedAuthorIcon?: string
  resultEmbedAuthorUrl?: string
  resultEmbedFooterIcon?: string
  resultEmbedUseTimestamp?: boolean
  resultEmbedFieldsJson?: string
}

/** createEmbed* prefix'li genişletme alanları */
export interface CreateEmbedExtendedFields {
  createEmbedTitleUrl?: string
  createEmbedAuthorName?: string
  createEmbedAuthorIcon?: string
  createEmbedAuthorUrl?: string
  createEmbedFooterIcon?: string
  createEmbedUseTimestamp?: boolean
  createEmbedFieldsJson?: string
}

/** sendEmbed* prefix'li genişletme alanları */
export interface SendEmbedExtendedFields {
  sendEmbedTitleUrl?: string
  sendEmbedAuthorName?: string
  sendEmbedAuthorIcon?: string
  sendEmbedAuthorUrl?: string
  sendEmbedFooterIcon?: string
  sendEmbedUseTimestamp?: boolean
  sendEmbedFieldsJson?: string
}

/** notificationEmbed* prefix'li genişletme alanları */
export interface NotificationEmbedExtendedFields {
  notificationEmbedTitleUrl?: string
  notificationEmbedAuthorName?: string
  notificationEmbedAuthorIcon?: string
  notificationEmbedAuthorUrl?: string
  notificationEmbedFooterIcon?: string
  notificationEmbedUseTimestamp?: boolean
  notificationEmbedFieldsJson?: string
}

// Welcome Types
export interface WelcomeDto {
  id: number
  guildId: string
  channelId: string
  message: string
  language: string
  enabled: boolean
  giveRole: boolean
  roleId?: string
  createdAt?: string
  updatedAt?: string
  isEmbed: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  sendWelcomeCard: boolean
  cardTitle?: string
  cardUsernameText?: string
  cardMemberText?: string
  cardBackgroundColor1?: string
  cardBackgroundColor2?: string
  cardTextColor?: string
  cardBorderColor?: string
  sendDM: boolean
  dmMessage?: string
  isDMEmbed: boolean
  dmEmbedTitle?: string
  dmEmbedDescription?: string
  dmEmbedColor?: string
  dmEmbedThumbnail?: string
  dmEmbedImage?: string
  dmEmbedFooter?: string
  dmEmbedTitleUrl?: string
  dmEmbedAuthorName?: string
  dmEmbedAuthorIcon?: string
  dmEmbedAuthorUrl?: string
  dmEmbedFooterIcon?: string
  dmEmbedUseTimestamp?: boolean
  dmEmbedFieldsJson?: string
  sendDMCard: boolean
  dmCardTitle?: string
  dmCardUsernameText?: string
  dmCardMemberText?: string
  dmCardBackgroundColor1?: string
  dmCardBackgroundColor2?: string
  dmCardTextColor?: string
  dmCardBorderColor?: string
}

export interface CreateWelcomeDto {
  guildId: string
  channelId: string
  message: string
  language?: string
  enabled?: boolean
  giveRole?: boolean
  roleId?: string
  embedSettings?: WelcomeEmbedSettingsDto
  cardSettings?: WelcomeCardSettingsDto
  dmSettings?: WelcomeDMSettingsDto
  dmEmbedSettings?: WelcomeDMEmbedSettingsDto
  dmCardSettings?: WelcomeDMCardSettingsDto
}

export interface UpdateWelcomeDto {
  channelId?: string
  message?: string
  language?: string
  enabled?: boolean
  giveRole?: boolean
  roleId?: string
  embedSettings?: WelcomeEmbedSettingsDto
  cardSettings?: WelcomeCardSettingsDto
  dmSettings?: WelcomeDMSettingsDto
  dmEmbedSettings?: WelcomeDMEmbedSettingsDto
  dmCardSettings?: WelcomeDMCardSettingsDto
}

export interface WelcomeEmbedSettingsDto {
  isEmbed?: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
}

export interface WelcomeCardSettingsDto {
  sendWelcomeCard?: boolean
  cardTitle?: string
  cardUsernameText?: string
  cardMemberText?: string
  cardBackgroundColor1?: string
  cardBackgroundColor2?: string
  cardTextColor?: string
  cardBorderColor?: string
}

export interface WelcomeDMSettingsDto {
  sendDM?: boolean
  dmMessage?: string
}

export interface WelcomeDMEmbedSettingsDto {
  isDMEmbed?: boolean
  dmEmbedTitle?: string
  dmEmbedDescription?: string
  dmEmbedColor?: string
  dmEmbedThumbnail?: string
  dmEmbedImage?: string
  dmEmbedFooter?: string
  dmEmbedTitleUrl?: string
  dmEmbedAuthorName?: string
  dmEmbedAuthorIcon?: string
  dmEmbedAuthorUrl?: string
  dmEmbedFooterIcon?: string
  dmEmbedUseTimestamp?: boolean
  dmEmbedFieldsJson?: string
}

export interface WelcomeDMCardSettingsDto {
  sendDMCard?: boolean
  dmCardTitle?: string
  dmCardUsernameText?: string
  dmCardMemberText?: string
  dmCardBackgroundColor1?: string
  dmCardBackgroundColor2?: string
  dmCardTextColor?: string
  dmCardBorderColor?: string
}

// Goodbye Types
export interface GoodbyeDto {
  id: number
  guildId: string
  channelId: string
  message: string
  language: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
  isEmbed: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
}

export interface CreateGoodbyeDto {
  guildId: string
  channelId: string
  message: string
  language?: string
  enabled?: boolean
  embedSettings?: GoodbyeEmbedSettingsDto
}

export interface UpdateGoodbyeDto {
  channelId?: string
  message?: string
  language?: string
  enabled?: boolean
  embedSettings?: GoodbyeEmbedSettingsDto
}

export interface GoodbyeEmbedSettingsDto {
  isEmbed?: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
}

// ReactionRole Types
export interface ReactionRoleDto {
  id: number
  guildId: string
  channelId?: string
  normalMessage?: string
  isEmbed: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  messageId?: string
  enabled: boolean
  enableEmoji: boolean
  enableButton: boolean
  enableMenu: boolean
  emojis: ReactionRoleEmojiDto[]
  buttons: ReactionRoleButtonDto[]
  menus: ReactionRoleMenuDto[]
}

export interface ReactionRoleEmojiDto {
  id: number
  emoji: string
  roleId: string
  orderIndex: number
  enabled: boolean
}

export interface ReactionRoleButtonDto {
  id: number
  label: string
  emoji?: string
  roleId: string
  style: number
  orderIndex: number
  enabled: boolean
}

export interface ReactionRoleMenuDto {
  id: number
  placeholder?: string
  minValues: number
  maxValues: number
  enabled: boolean
  options: ReactionRoleMenuOptionDto[]
}

export interface ReactionRoleMenuOptionDto {
  id: number
  label: string
  description?: string
  roleId: string
  emoji?: string
  orderIndex: number
  enabled: boolean
}

export interface CreateReactionRoleDto {
  guildId: string
  channelId?: string
  normalMessage?: string
  isEmbed?: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  messageId?: string
  enabled?: boolean
  enableEmoji?: boolean
  enableButton?: boolean
  enableMenu?: boolean
  emojis?: CreateReactionRoleEmojiDto[]
  buttons?: CreateReactionRoleButtonDto[]
  menus?: CreateReactionRoleMenuDto[]
}

export interface CreateReactionRoleEmojiDto {
  emoji: string
  roleId: string
  orderIndex?: number
  enabled?: boolean
}

export interface CreateReactionRoleButtonDto {
  label: string
  emoji?: string
  roleId: string
  style?: number
  orderIndex?: number
  enabled?: boolean
}

export interface CreateReactionRoleMenuDto {
  placeholder?: string
  minValues?: number
  maxValues?: number
  enabled?: boolean
  options?: CreateReactionRoleMenuOptionDto[]
}

export interface CreateReactionRoleMenuOptionDto {
  label: string
  description?: string
  roleId: string
  emoji?: string
  orderIndex?: number
  enabled?: boolean
}

// TicketPanel Types
export interface TicketPanelDto {
  id: number
  guildId: string
  channelId: string
  messageId?: string
  panelMessage?: string
  isEmbed: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  welcomeMessage?: string
  isWelcomeEmbed: boolean
  welcomeEmbedTitle?: string
  welcomeEmbedDescription?: string
  welcomeEmbedColor?: string
  welcomeEmbedThumbnail?: string
  welcomeEmbedImage?: string
  welcomeEmbedFooter?: string
  welcomeEmbedTitleUrl?: string
  welcomeEmbedAuthorName?: string
  welcomeEmbedAuthorIcon?: string
  welcomeEmbedAuthorUrl?: string
  welcomeEmbedFooterIcon?: string
  welcomeEmbedUseTimestamp?: boolean
  welcomeEmbedFieldsJson?: string
  transcriptChannelId?: string
  sendTranscriptToUser: boolean
  openCategoryId?: string
  openCategoryName?: string
  claimedCategoryId?: string
  claimedCategoryName?: string
  closedCategoryId?: string
  closedCategoryName?: string
  enabled: boolean
  roleIds: string[]
  ticketTypes: TicketTypeDto[]
}

export interface TicketTypeDto {
  id: number
  type: number // 0: Buton, 1: Açılır Menü
  label: string
  emoji?: string
  style: number
  placeholder?: string
  orderIndex: number
  openCategoryId?: string
  openCategoryName?: string
  claimedCategoryId?: string
  claimedCategoryName?: string
  closedCategoryId?: string
  closedCategoryName?: string
  enabled: boolean
}

export interface CreateTicketPanelDto {
  guildId: string
  channelId: string
  panelMessage?: string
  isEmbed?: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  welcomeMessage?: string
  isWelcomeEmbed?: boolean
  welcomeEmbedTitle?: string
  welcomeEmbedDescription?: string
  welcomeEmbedColor?: string
  welcomeEmbedThumbnail?: string
  welcomeEmbedImage?: string
  welcomeEmbedFooter?: string
  welcomeEmbedTitleUrl?: string
  welcomeEmbedAuthorName?: string
  welcomeEmbedAuthorIcon?: string
  welcomeEmbedAuthorUrl?: string
  welcomeEmbedFooterIcon?: string
  welcomeEmbedUseTimestamp?: boolean
  welcomeEmbedFieldsJson?: string
  transcriptChannelId?: string
  sendTranscriptToUser?: boolean
  openCategoryId?: string
  openCategoryName?: string
  claimedCategoryId?: string
  claimedCategoryName?: string
  closedCategoryId?: string
  closedCategoryName?: string
  enabled?: boolean
  roleIds?: string[]
  ticketTypes?: CreateTicketTypeDto[]
}

export interface CreateTicketTypeDto {
  type?: number // 0: Buton, 1: Açılır Menü
  label: string
  emoji?: string
  style?: number
  placeholder?: string
  orderIndex?: number
  openCategoryId?: string
  openCategoryName?: string
  claimedCategoryId?: string
  claimedCategoryName?: string
  closedCategoryId?: string
  closedCategoryName?: string
  enabled?: boolean
}

export interface GuildDto {
  id: number
  guildId: string
  guildName: string
  ownerId?: string
  memberCount: number
  joinedAt?: string
  lastSeen: string
  createdAt: string
  updatedAt: string
}

export interface CreateGuildDto {
  guildId: string
  guildName: string
  ownerId?: string
  memberCount?: number
  joinedAt?: string
}

export interface UpdateGuildDto {
  guildName?: string
  ownerId?: string
  memberCount?: number
  joinedAt?: string
  lastSeen?: string
}

// Moderator Types
export interface ModeratorDto {
  id: number
  guildId: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
  rules: ModeratorRuleDto[]
  forbiddenWords: ForbiddenWordDto[]
}

export interface ModeratorRuleDto {
  id: number
  moderatorId: number
  ruleType: string
  action: number // 0: Devre Dışı, 1: Mesaj Sil, 2: Kullanıcıyı Uyar, 3: Mesajı Sil & Üyeyi Uyar
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ForbiddenWordDto {
  id: number
  moderatorId: number
  word: string
  createdAt?: string
}

export interface CreateModeratorDto {
  guildId: string
  enabled?: boolean
  rules?: CreateModeratorRuleDto[]
}

export interface CreateModeratorRuleDto {
  ruleType: string
  action?: number
  enabled?: boolean
}

export interface UpdateModeratorDto {
  enabled?: boolean
}

export interface UpdateModeratorRuleDto {
  action: number
  enabled?: boolean
}

export interface AddForbiddenWordDto {
  word: string
}

// Custom Command Types
export interface CustomCommandDto {
  id: number
  guildId: string
  commandName: string
  actionType: number // 0: Kanalda Mesaj Gönder, 1: Kanalda Yanıt Ver, 2: Rol Ver, 3: Rol Kaldır
  targetChannelId?: string
  message?: string
  roleId?: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateCustomCommandDto {
  commandName: string
  actionType: number
  targetChannelId?: string
  message?: string
  roleId?: string
  enabled?: boolean
}

export interface UpdateCustomCommandDto {
  actionType: number
  targetChannelId?: string
  message?: string
  roleId?: string
  enabled?: boolean
}

/** Guild otomasyon kuralı (API GuildAutomation) */
export interface GuildAutomationDto {
  id: number
  guildId: string
  name: string
  enabled: boolean
  definitionJson: string
  retryOnFailure: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateGuildAutomationDto {
  name: string
  enabled: boolean
  definitionJson: string
  retryOnFailure: boolean
}

export interface UpdateGuildAutomationDto {
  name: string
  enabled: boolean
  definitionJson: string
  retryOnFailure: boolean
}

// EmbedMessage Types
export interface EmbedMessageDto {
  id: number
  guildId: string
  channelId: string
  messageId?: string
  name: string
  isEmbed: boolean
  message?: string
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateEmbedMessageDto {
  guildId: string
  channelId: string
  name: string
  isEmbed?: boolean
  message?: string
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  enabled?: boolean
}

export interface UpdateEmbedMessageDto {
  channelId?: string
  name?: string
  isEmbed?: boolean
  message?: string
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  enabled?: boolean
}

// Poll Types
export interface PollDto {
  id: number
  guildId: string
  channelId: string
  messageId?: string
  question: string
  isActive: boolean
  endedAt?: string
  endAfterMinutes?: number
  endAfterVotes?: number
  allowMultipleVotes: boolean
  totalVotes: number
  pollEmbedTitle?: string
  pollEmbedDescription?: string
  pollEmbedColor?: string
  pollEmbedThumbnail?: string
  pollEmbedImage?: string
  pollEmbedFooter?: string
  pollEmbedTitleUrl?: string
  pollEmbedAuthorName?: string
  pollEmbedAuthorIcon?: string
  pollEmbedAuthorUrl?: string
  pollEmbedFooterIcon?: string
  pollEmbedUseTimestamp?: boolean
  pollEmbedFieldsJson?: string
  resultEmbedTitle?: string
  resultEmbedDescription?: string
  resultEmbedColor?: string
  resultEmbedThumbnail?: string
  resultEmbedImage?: string
  resultEmbedFooter?: string
  resultEmbedTitleUrl?: string
  resultEmbedAuthorName?: string
  resultEmbedAuthorIcon?: string
  resultEmbedAuthorUrl?: string
  resultEmbedFooterIcon?: string
  resultEmbedUseTimestamp?: boolean
  resultEmbedFieldsJson?: string
  createdAt?: string
  updatedAt?: string
  /** panel | slash */
  createdVia?: string | null
  options: PollOptionDto[]
  rolePermissions: PollRolePermissionDto[]
}

export interface PollOptionDto {
  id: number
  pollId: number
  optionText: string
  emoji?: string
  orderIndex: number
  voteCount: number
  createdAt?: string
}

export interface PollRolePermissionDto {
  id: number
  pollId: number
  roleId: string
  isAllowed: boolean
  createdAt?: string
}

export interface CreatePollDto {
  guildId: string
  channelId: string
  question: string
  endAfterMinutes?: number
  endAfterVotes?: number
  allowMultipleVotes?: boolean
  pollEmbedTitle?: string
  pollEmbedDescription?: string
  pollEmbedColor?: string
  pollEmbedThumbnail?: string
  pollEmbedImage?: string
  pollEmbedFooter?: string
  pollEmbedTitleUrl?: string
  pollEmbedAuthorName?: string
  pollEmbedAuthorIcon?: string
  pollEmbedAuthorUrl?: string
  pollEmbedFooterIcon?: string
  pollEmbedUseTimestamp?: boolean
  pollEmbedFieldsJson?: string
  resultEmbedTitle?: string
  resultEmbedDescription?: string
  resultEmbedColor?: string
  resultEmbedThumbnail?: string
  resultEmbedImage?: string
  resultEmbedFooter?: string
  resultEmbedTitleUrl?: string
  resultEmbedAuthorName?: string
  resultEmbedAuthorIcon?: string
  resultEmbedAuthorUrl?: string
  resultEmbedFooterIcon?: string
  resultEmbedUseTimestamp?: boolean
  resultEmbedFieldsJson?: string
  options: CreatePollOptionDto[]
  rolePermissions?: CreatePollRolePermissionDto[]
  createdVia?: 'panel' | 'slash'
}

export interface CreatePollOptionDto {
  optionText: string
  emoji?: string
  orderIndex?: number
}

export interface CreatePollRolePermissionDto {
  roleId: string
  isAllowed?: boolean
}

export interface UpdatePollDto {
  channelId?: string
  question?: string
  endAfterMinutes?: number
  endAfterVotes?: number
  allowMultipleVotes?: boolean
  pollEmbedTitle?: string
  pollEmbedDescription?: string
  pollEmbedColor?: string
  pollEmbedThumbnail?: string
  pollEmbedImage?: string
  pollEmbedFooter?: string
  pollEmbedTitleUrl?: string
  pollEmbedAuthorName?: string
  pollEmbedAuthorIcon?: string
  pollEmbedAuthorUrl?: string
  pollEmbedFooterIcon?: string
  pollEmbedUseTimestamp?: boolean
  pollEmbedFieldsJson?: string
  resultEmbedTitle?: string
  resultEmbedDescription?: string
  resultEmbedColor?: string
  resultEmbedThumbnail?: string
  resultEmbedImage?: string
  resultEmbedFooter?: string
  resultEmbedTitleUrl?: string
  resultEmbedAuthorName?: string
  resultEmbedAuthorIcon?: string
  resultEmbedAuthorUrl?: string
  resultEmbedFooterIcon?: string
  resultEmbedUseTimestamp?: boolean
  resultEmbedFieldsJson?: string
}

export interface PollResultDto {
  pollId: number
  question: string
  totalVotes: number
  optionResults: PollOptionResultDto[]
  endedAt?: string
  allowMultipleVotes: boolean
}

export interface PollOptionResultDto {
  optionId: number
  optionText: string
  emoji?: string
  voteCount: number
  percentage: number
}

// Temporary Voice Channel Types
export interface TemporaryVoiceChannelLobbyDto {
  id: number
  guildId: string
  channelId: string
  channelName: string
  userLimit?: number
  bitrate?: number
  deleteAfterMinutes?: number
  ownershipTimeoutMinutes?: number
  syncCategoryPermissions: boolean
  syncChannelPermissions: boolean
  createTextChannel: boolean
  restrictCommandsToTextChannel: boolean
  pinCommandUsage: boolean
  restrictTextChannel: boolean
  ownerCanManageChannel: boolean
  ownerCanManagePermissions: boolean
  ownerIsPrioritySpeaker: boolean
  ownerCanMoveMembers: boolean
  enabled: boolean
  roles: TemporaryVoiceChannelRoleDto[]
}

export interface TemporaryVoiceChannelRoleDto {
  id: number
  roleId: string
  roleType: number // 0: Ignore, 1: Access, 2: Moderator
  canManageAccess: boolean
}

export interface CreateTemporaryVoiceChannelLobbyDto {
  guildId: string
  channelId: string
  channelName?: string
  userLimit?: number
  bitrate?: number
  deleteAfterMinutes?: number
  ownershipTimeoutMinutes?: number
  syncCategoryPermissions?: boolean
  syncChannelPermissions?: boolean
  createTextChannel?: boolean
  restrictCommandsToTextChannel?: boolean
  pinCommandUsage?: boolean
  restrictTextChannel?: boolean
  ownerCanManageChannel?: boolean
  ownerCanManagePermissions?: boolean
  ownerIsPrioritySpeaker?: boolean
  ownerCanMoveMembers?: boolean
  enabled?: boolean
  roles?: CreateTemporaryVoiceChannelRoleDto[]
}

export interface CreateTemporaryVoiceChannelRoleDto {
  roleId: string
  roleType: number // 0: Ignore, 1: Access, 2: Moderator
  canManageAccess?: boolean
}

// Statistics Channel Types
export interface StatisticsChannelDto {
  id: number
  guildId: string
  counterType: string
  channelId: string
  channelName?: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
  roles?: StatisticsChannelRoleDto[]
}

export interface StatisticsChannelRoleDto {
  id: number
  statisticsChannelId: number
  roleId: string
  roleName?: string
  orderIndex: number
  createdAt?: string
}

export interface CreateStatisticsChannelDto {
  guildId: string
  counterType: string
  channelId: string
  channelName?: string
  enabled?: boolean
  roleIds?: string[] // Rol sayacı için
}

export interface UpdateStatisticsChannelDto {
  channelId?: string
  channelName?: string
  enabled?: boolean
  roleIds?: string[] // Rol sayacı için
}

// Help Command Types
export interface HelpCommandDto {
  id: number
  guildId: string
  commandName: string
  description?: string
  enabled: boolean
  cooldownType: number // 0: Hiçbiri, 1: Sunucu, 2: Kullanıcı
  cooldownSeconds?: number
  sendAsDM: boolean
  deleteAfterUse: boolean
  disableReply: boolean
  rolePermissionType: number // 0: Bu roller dışındaki tüm rolleri yok say, 1: Bu roller dışındaki tüm rollere izin ver
  channelPermissionType: number // 0: Bu kanallar hariç diğer tüm kanallarda izin verme, 1: Bu kanallar hariç tüm kanallara izin ver
  isEmbed: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  roleIds: string[]
  channelIds: string[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateHelpCommandDto {
  commandName: string
  description?: string
  enabled?: boolean
  cooldownType?: number
  cooldownSeconds?: number
  sendAsDM?: boolean
  deleteAfterUse?: boolean
  disableReply?: boolean
  rolePermissionType?: number
  channelPermissionType?: number
  isEmbed?: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  roleIds?: string[]
  channelIds?: string[]
}

export interface UpdateHelpCommandDto {
  description?: string
  enabled?: boolean
  cooldownType?: number
  cooldownSeconds?: number
  sendAsDM?: boolean
  deleteAfterUse?: boolean
  disableReply?: boolean
  rolePermissionType?: number
  channelPermissionType?: number
  isEmbed?: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  roleIds?: string[]
  channelIds?: string[]
}


// Birthday Types
export interface BirthdaySettingsDto {
  id: number
  guildId: string
  channelId?: string
  roleId?: string
  isEmbed: boolean
  message?: string
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  enabled: boolean
  checkHour?: number
  createdAt?: string
  updatedAt?: string
}

export interface BirthdayUserDto {
  id: number
  guildId: string
  userId: string
  birthDate: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateBirthdaySettingsDto {
  guildId: string
  channelId?: string
  roleId?: string
  isEmbed?: boolean
  message?: string
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  enabled?: boolean
  checkHour?: number
}

export interface UpdateBirthdaySettingsDto {
  channelId?: string
  roleId?: string
  isEmbed?: boolean
  message?: string
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  checkHour?: number
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  enabled?: boolean
}

export interface CreateBirthdayUserDto {
  guildId: string
  userId: string
  birthDate: string
}

export interface UpdateBirthdayUserDto {
  birthDate: string
}

// Reminder Types
export interface ReminderDto {
  id: number
  guildId: string
  channelId: string
  userId: string
  remindDate: string
  isEmbed: boolean
  message?: string
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  isSent: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateReminderDto {
  guildId: string
  channelId: string
  userId: string
  remindDate: string
  isEmbed?: boolean
  message?: string
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
}

export interface UpdateReminderDto {
  channelId?: string
  remindDate?: string
  isEmbed?: boolean
  message?: string
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
}

// ReminderSettings Types
export interface ReminderSettingsDto {
  id: number
  guildId: string
  createMessageIsEmbed: boolean
  createMessage?: string
  createEmbedTitle?: string
  createEmbedDescription?: string
  createEmbedColor?: string
  createEmbedThumbnail?: string
  createEmbedImage?: string
  createEmbedFooter?: string
  createEmbedTitleUrl?: string
  createEmbedAuthorName?: string
  createEmbedAuthorIcon?: string
  createEmbedAuthorUrl?: string
  createEmbedFooterIcon?: string
  createEmbedUseTimestamp?: boolean
  createEmbedFieldsJson?: string
  defaultIsEmbed: boolean
  sendMessageIsEmbed: boolean
  sendMessage?: string
  sendEmbedTitle?: string
  sendEmbedDescription?: string
  sendEmbedColor?: string
  sendEmbedThumbnail?: string
  sendEmbedImage?: string
  sendEmbedFooter?: string
  sendEmbedTitleUrl?: string
  sendEmbedAuthorName?: string
  sendEmbedAuthorIcon?: string
  sendEmbedAuthorUrl?: string
  sendEmbedFooterIcon?: string
  sendEmbedUseTimestamp?: boolean
  sendEmbedFieldsJson?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateOrUpdateReminderSettingsDto {
  createMessageIsEmbed?: boolean
  createMessage?: string
  createEmbedTitle?: string
  createEmbedDescription?: string
  createEmbedColor?: string
  createEmbedThumbnail?: string
  createEmbedImage?: string
  createEmbedFooter?: string
  createEmbedTitleUrl?: string
  createEmbedAuthorName?: string
  createEmbedAuthorIcon?: string
  createEmbedAuthorUrl?: string
  createEmbedFooterIcon?: string
  createEmbedUseTimestamp?: boolean
  createEmbedFieldsJson?: string
  defaultIsEmbed?: boolean
  sendMessageIsEmbed?: boolean
  sendMessage?: string
  sendEmbedTitle?: string
  sendEmbedDescription?: string
  sendEmbedColor?: string
  sendEmbedThumbnail?: string
  sendEmbedImage?: string
  sendEmbedFooter?: string
  sendEmbedTitleUrl?: string
  sendEmbedAuthorName?: string
  sendEmbedAuthorIcon?: string
  sendEmbedAuthorUrl?: string
  sendEmbedFooterIcon?: string
  sendEmbedUseTimestamp?: boolean
  sendEmbedFieldsJson?: string
}

// Giveaway Types
export interface GiveawayDto {
  id: number
  guildId: string
  channelId: string
  messageId?: string
  name: string
  prize: string
  winnerCount: number
  endDate: string
  timeZone?: string
  isActive: boolean
  isEnded: boolean
  rolePermissionType: number // 0: Bu roller dışındaki tüm rolleri yok say, 1: Bu roller dışındaki tüm rollere izin ver
  isEmbed: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  createdAt?: string
  updatedAt?: string
  roles: GiveawayRoleDto[]
  allowedRoles: GiveawayAllowedRoleDto[]
  participantCount: number
  winners: GiveawayWinnerDto[]
}

export interface GiveawayRoleDto {
  id: number
  giveawayId: number
  roleId: string
  winChanceMultiplier: number
  createdAt?: string
  updatedAt?: string
}

export interface GiveawayAllowedRoleDto {
  id: number
  giveawayId: number
  roleId: string
  createdAt?: string
}

export interface GiveawayParticipantDto {
  id: number
  giveawayId: number
  userId: string
  joinedAt?: string
}

export interface GiveawayWinnerDto {
  id: number
  giveawayId: number
  userId: string
  wonAt?: string
}

export interface CreateGiveawayDto {
  guildId: string
  channelId: string
  name: string
  prize: string
  winnerCount?: number
  endDate: string
  timeZone?: string
  rolePermissionType?: number // 0: Bu roller dışındaki tüm rolleri yok say, 1: Bu roller dışındaki tüm rollere izin ver
  isEmbed?: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
  roles?: CreateGiveawayRoleDto[]
  allowedRoleIds?: string[]
}

export interface CreateGiveawayRoleDto {
  roleId: string
  winChanceMultiplier?: number
}

export interface UpdateGiveawayDto {
  channelId?: string
  messageId?: string
  name?: string
  prize?: string
  winnerCount?: number
  endDate?: string
  timeZone?: string
  isActive?: boolean
  isEnded?: boolean
  rolePermissionType?: number
  isEmbed?: boolean
  embedTitle?: string
  embedDescription?: string
  embedColor?: string
  embedThumbnail?: string
  embedImage?: string
  embedFooter?: string
  embedTitleUrl?: string
  embedAuthorName?: string
  embedAuthorIcon?: string
  embedAuthorUrl?: string
  embedFooterIcon?: string
  embedUseTimestamp?: boolean
  embedFieldsJson?: string
}

// CustomBot Types
export interface CustomBotDto {
  id: number
  botToken: string
  clientId: string
  ownerId: string
  botName?: string
  status: string // Active, Inactive, Error
  errorMessage?: string
  avatarUrl?: string
  bannerUrl?: string
  presenceStatus: string
  activityType: string
  activityText?: string
  personalizationEnabled: boolean
  createdAt: string
  updatedAt: string
  lastSeen?: string
}

export interface CreateCustomBotDto {
  botToken: string
  clientId: string
  ownerId: string
  botName?: string
}

export interface UpdateCustomBotDto {
  botToken?: string
  botName?: string
  status?: string
  errorMessage?: string
  lastSeen?: string
}

export interface UpdateCustomBotPersonalizationDto {
  botName?: string
  avatarUrl?: string | null
  bannerUrl?: string | null
  presenceStatus?: string
  activityType?: string
  activityText?: string | null
  personalizationEnabled?: boolean
}

export interface ApplyPersonalizationResult {
  success: boolean
  warnings?: string[]
  error?: string
}

// Level Types
export interface LevelDto {
  id: number
  guildId: string
  enabled: boolean
  xpPerMessage: number
  xpPerMessageMin: number
  xpPerMessageMax: number
  useRandomXp: boolean
  cooldownSeconds: number
  baseXpRequired: number
  xpMultiplier: number
  notifyOnLevelUp: boolean
  notificationChannelId?: string
  useEmbedForNotification: boolean
  notificationMessage?: string
  notificationEmbedTitle?: string
  notificationEmbedDescription?: string
  notificationEmbedColor?: string
  notificationEmbedThumbnail?: string
  notificationEmbedImage?: string
  notificationEmbedFooter?: string
  notificationEmbedTitleUrl?: string
  notificationEmbedAuthorName?: string
  notificationEmbedAuthorIcon?: string
  notificationEmbedAuthorUrl?: string
  notificationEmbedFooterIcon?: string
  notificationEmbedUseTimestamp?: boolean
  notificationEmbedFieldsJson?: string
  useEmbedForXpGain?: boolean
  xpGainMessage?: string
  xpGainEmbedColor?: string
  ignoredChannelIds?: string
  ignoredRoleIds?: string
  enableRoleRewards: boolean
  roleRewardsJson?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserLevelDto {
  id: number
  guildId: string
  userId: string
  level: number
  totalXp: number
  currentXp: number
  xpForNextLevel: number
  lastMessageAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateLevelDto {
  enabled?: boolean
  xpPerMessage?: number
  xpPerMessageMin?: number
  xpPerMessageMax?: number
  useRandomXp?: boolean
  cooldownSeconds?: number
  baseXpRequired?: number
  xpMultiplier?: number
  notifyOnLevelUp?: boolean
  notificationChannelId?: string
  useEmbedForNotification?: boolean
  notificationMessage?: string
  notificationEmbedTitle?: string
  notificationEmbedDescription?: string
  notificationEmbedColor?: string
  notificationEmbedThumbnail?: string
  notificationEmbedImage?: string
  notificationEmbedFooter?: string
  notificationEmbedTitleUrl?: string
  notificationEmbedAuthorName?: string
  notificationEmbedAuthorIcon?: string
  notificationEmbedAuthorUrl?: string
  notificationEmbedFooterIcon?: string
  notificationEmbedUseTimestamp?: boolean
  notificationEmbedFieldsJson?: string
  useEmbedForXpGain?: boolean
  xpGainMessage?: string
  xpGainEmbedColor?: string
  ignoredChannelIds?: string
  ignoredRoleIds?: string
  enableRoleRewards?: boolean
  roleRewardsJson?: string
}

export interface UpdateLevelDto {
  enabled?: boolean
  xpPerMessage?: number
  xpPerMessageMin?: number
  xpPerMessageMax?: number
  useRandomXp?: boolean
  cooldownSeconds?: number
  baseXpRequired?: number
  xpMultiplier?: number
  notifyOnLevelUp?: boolean
  notificationChannelId?: string
  useEmbedForNotification?: boolean
  notificationMessage?: string
  notificationEmbedTitle?: string
  notificationEmbedDescription?: string
  notificationEmbedColor?: string
  notificationEmbedThumbnail?: string
  notificationEmbedImage?: string
  notificationEmbedFooter?: string
  notificationEmbedTitleUrl?: string
  notificationEmbedAuthorName?: string
  notificationEmbedAuthorIcon?: string
  notificationEmbedAuthorUrl?: string
  notificationEmbedFooterIcon?: string
  notificationEmbedUseTimestamp?: boolean
  notificationEmbedFieldsJson?: string
  useEmbedForXpGain?: boolean
  xpGainMessage?: string
  xpGainEmbedColor?: string
  ignoredChannelIds?: string
  ignoredRoleIds?: string
  enableRoleRewards?: boolean
  roleRewardsJson?: string
}

export interface RoleRewardDto {
  level: number
  roleId: string
  removePreviousRole?: boolean
}

/** Vitrin — Redis (bot) + GET /api/public/showcase-guilds */
export interface ShowcaseGuild {
  id: string
  name: string
  /** Eski önbellek: CDN — yeni bot `iconDataUrl` yazar. */
  iconUrl?: string | null
  bannerUrl?: string | null
  iconDataUrl?: string | null
  bannerDataUrl?: string | null
  memberCount: number
}

export interface ShowcaseGuildsPayload {
  updatedAt: string | null
  totalGuilds: number
  totalMembersApprox: number
  guilds: ShowcaseGuild[]
}