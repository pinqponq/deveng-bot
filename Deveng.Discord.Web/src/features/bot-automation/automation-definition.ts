/** Bot ve panel ile paylaşılan sözleşme (JSON kökü) */
export type AutomationTriggerType =
  | 'message_send'
  | 'message_delete'
  | 'button_click'
  | 'message_edit'
  | 'reaction_add'
  | 'role_gain'
  | 'role_lose'
  | 'voice_join'
  | 'voice_leave'
  | 'thread_create'
  | 'member_join'

export type AutomationConditionType =
  | 'channel_in'
  | 'user_has_all_roles'
  | 'user_has_one_role'
  | 'user_missing_all_roles'
  | 'user_missing_one_role'
  | 'message_equals_any'
  | 'message_contains_any'
  | 'message_not_contains_any'
  | 'user_in_list'
  | 'attachment_image'
  | 'attachment_audio'
  | 'attachment_video'
  | 'attachment_text'
  | 'message_is_reply'
  | 'message_is_not_reply'

export type AutomationActionType =
  | 'create_thread'
  | 'send_message'
  | 'reply'
  | 'repost'
  | 'pin'
  | 'delete_message'
  | 'react'
  | 'add_roles'
  | 'remove_roles'
  | 'give_coins'
  | 'take_coins'
  | 'give_xp'
  | 'take_xp'

export interface AutomationTrigger {
  type: AutomationTriggerType
  params?: Record<string, unknown>
}

export interface AutomationCondition {
  id: string
  type: AutomationConditionType
  params?: Record<string, unknown>
}

export interface AutomationAction {
  id: string
  type: AutomationActionType
  params?: Record<string, unknown>
}

export interface AutomationDefinition {
  version: number
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  conditionLogic: 'and'
  actions: AutomationAction[]
}

export function createEmptyDefinition(): AutomationDefinition {
  return {
    version: 1,
    trigger: { type: 'message_send', params: {} },
    conditions: [],
    conditionLogic: 'and',
    actions: [],
  }
}

export function parseDefinitionJson(json: string): AutomationDefinition {
  try {
    const o = JSON.parse(json) as AutomationDefinition
    if (!o || typeof o !== 'object') return createEmptyDefinition()
    if (!o.trigger?.type) return createEmptyDefinition()
    return {
      version: typeof o.version === 'number' ? o.version : 1,
      trigger: { type: o.trigger.type, params: o.trigger.params },
      conditions: Array.isArray(o.conditions) ? o.conditions : [],
      conditionLogic: 'and',
      actions: Array.isArray(o.actions) ? o.actions : [],
    }
  } catch {
    return createEmptyDefinition()
  }
}

export function stringifyDefinition(def: AutomationDefinition): string {
  return JSON.stringify(def)
}
