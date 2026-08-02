import type { LucideIcon } from 'lucide-react'
import {
  Filter,
  Image,
  MessageSquare,
  Mic,
  MousePointerClick,
  Pencil,
  Pin,
  Plane,
  Reply,
  Send,
  SmilePlus,
  Text,
  ThumbsUp,
  Trash2,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  Video,
  Volume2,
  VolumeX,
  Coins,
} from 'lucide-react'
import type {
  AutomationActionType,
  AutomationConditionType,
  AutomationTriggerType,
} from './automation-definition'

export type CatalogVariant = 'trigger' | 'condition' | 'action'

export interface TriggerCatalogItem {
  type: AutomationTriggerType
  icon: LucideIcon
  /** false = UI only (bot Faz 2) */
  implemented: boolean
}

export interface ConditionCatalogItem {
  type: AutomationConditionType
  icon: LucideIcon
  implemented: boolean
}

export interface ActionCatalogItem {
  type: AutomationActionType
  icon: LucideIcon
  implemented: boolean
  /** ekonomi API yok */
  hidden?: boolean
}

export const TRIGGER_CATALOG: TriggerCatalogItem[] = [
  { type: 'message_send', icon: Send, implemented: true },
  { type: 'message_delete', icon: Trash2, implemented: true },
  { type: 'button_click', icon: MousePointerClick, implemented: true },
  { type: 'message_edit', icon: Pencil, implemented: true },
  { type: 'reaction_add', icon: SmilePlus, implemented: true },
  { type: 'role_gain', icon: UserPlus, implemented: true },
  { type: 'role_lose', icon: UserMinus, implemented: true },
  { type: 'voice_join', icon: Volume2, implemented: true },
  { type: 'voice_leave', icon: VolumeX, implemented: true },
  { type: 'thread_create', icon: MessageSquare, implemented: true },
  { type: 'member_join', icon: Users, implemented: true },
]

export const CONDITION_CATALOG: ConditionCatalogItem[] = [
  { type: 'channel_in', icon: Filter, implemented: true },
  { type: 'user_has_all_roles', icon: Filter, implemented: true },
  { type: 'user_missing_all_roles', icon: Filter, implemented: true },
  { type: 'message_equals_any', icon: Filter, implemented: true },
  { type: 'user_in_list', icon: Filter, implemented: true },
  { type: 'attachment_image', icon: Image, implemented: true },
  { type: 'attachment_video', icon: Video, implemented: true },
  { type: 'message_is_not_reply', icon: Reply, implemented: true },
  { type: 'user_has_one_role', icon: Filter, implemented: true },
  { type: 'user_missing_one_role', icon: Filter, implemented: true },
  { type: 'message_contains_any', icon: Filter, implemented: true },
  { type: 'message_not_contains_any', icon: Filter, implemented: true },
  { type: 'attachment_audio', icon: Mic, implemented: true },
  { type: 'attachment_text', icon: Text, implemented: true },
  { type: 'message_is_reply', icon: Reply, implemented: true },
]

export const ACTION_CATALOG: ActionCatalogItem[] = [
  { type: 'create_thread', icon: MessageSquare, implemented: true },
  { type: 'send_message', icon: Send, implemented: true },
  { type: 'reply', icon: Reply, implemented: true },
  { type: 'repost', icon: Plane, implemented: true },
  { type: 'pin', icon: Pin, implemented: true },
  { type: 'delete_message', icon: Trash2, implemented: true },
  { type: 'react', icon: ThumbsUp, implemented: true },
  { type: 'add_roles', icon: UserPlus, implemented: true },
  { type: 'remove_roles', icon: UserMinus, implemented: true },
  { type: 'give_coins', icon: Coins, implemented: false, hidden: true },
  { type: 'take_coins', icon: Coins, implemented: false, hidden: true },
  { type: 'give_xp', icon: Trophy, implemented: true },
  { type: 'take_xp', icon: Trophy, implemented: false },
]
