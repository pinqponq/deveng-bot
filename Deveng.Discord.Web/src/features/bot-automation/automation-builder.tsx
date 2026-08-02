import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DiscordChannel, DiscordRole } from '@/lib/api/discord'
import { AutomationCatalogCard } from './automation-catalog-card'
import { AutomationSectionBadge } from './automation-section-badge'
import { ACTION_CATALOG, CONDITION_CATALOG, TRIGGER_CATALOG } from './automation-catalog'
import type {
  AutomationAction,
  AutomationCondition,
  AutomationDefinition,
  AutomationTriggerType,
} from './automation-definition'
import { parseDefinitionJson, stringifyDefinition } from './automation-definition'
import { FlowConnector } from './flow-connector'

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function defaultConditionParams(type: AutomationCondition['type']): Record<string, unknown> {
  switch (type) {
    case 'channel_in':
      return { channelIds: [] as string[] }
    case 'user_has_all_roles':
    case 'user_has_one_role':
      return { roleIds: [] as string[] }
    case 'user_missing_all_roles':
    case 'user_missing_one_role':
      return { roleIds: [] as string[] }
    case 'message_equals_any':
    case 'message_contains_any':
    case 'message_not_contains_any':
      return { phrases: [] as string[], caseInsensitive: true }
    case 'user_in_list':
      return { userIds: [] as string[] }
    case 'attachment_image':
    case 'attachment_audio':
    case 'attachment_video':
    case 'attachment_text':
    case 'message_is_reply':
    case 'message_is_not_reply':
      return {}
    default:
      return {}
  }
}

function defaultActionParams(type: AutomationAction['type']): Record<string, unknown> {
  switch (type) {
    case 'send_message':
      return { channelId: '', content: '' }
    case 'reply':
      return { content: '' }
    case 'repost':
      return { channelId: '', content: '' }
    case 'react':
      return { emojis: ['👍'] }
    case 'add_roles':
    case 'remove_roles':
      return { roleIds: [] as string[] }
    case 'create_thread':
      return { name: '', autoArchiveDuration: 60 }
    case 'pin':
    case 'delete_message':
      return {}
    case 'give_xp':
    case 'take_xp':
      return { amount: 10 }
    default:
      return {}
  }
}

export function AutomationBuilder({
  initialName,
  initialDefinitionJson,
  initialRetryOnFailure,
  channels,
  roles,
  channelsLoading,
  rolesLoading,
  saving,
  onSave,
  onDiscard,
}: {
  initialName: string
  initialDefinitionJson: string
  initialRetryOnFailure: boolean
  channels: DiscordChannel[]
  roles: DiscordRole[]
  channelsLoading: boolean
  rolesLoading: boolean
  saving: boolean
  onSave: (payload: {
    name: string
    definitionJson: string
    retryOnFailure: boolean
  }) => void
  onDiscard: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = React.useState(initialName)
  const [definition, setDefinition] = React.useState<AutomationDefinition>(() =>
    parseDefinitionJson(initialDefinitionJson)
  )
  const [retryOnFailure, setRetryOnFailure] = React.useState(initialRetryOnFailure)

  React.useEffect(() => {
    setName(initialName)
    setDefinition(parseDefinitionJson(initialDefinitionJson))
    setRetryOnFailure(initialRetryOnFailure)
  }, [initialName, initialDefinitionJson, initialRetryOnFailure])

  const textChannels = React.useMemo(
    () =>
      channels.filter(
        (c) => c.type == null || c.type === 0 || c.type === 5 || c.type === 15 || c.type === 11
      ),
    [channels]
  )

  const setTrigger = (type: AutomationTriggerType) => {
    setDefinition((d) => ({ ...d, trigger: { type, params: {} } }))
  }

  const addCondition = (type: AutomationCondition['type']) => {
    setDefinition((d) => ({
      ...d,
      conditions: [
        ...d.conditions,
        { id: newId(), type, params: defaultConditionParams(type) },
      ],
    }))
  }

  const removeCondition = (id: string) => {
    setDefinition((d) => ({
      ...d,
      conditions: d.conditions.filter((c) => c.id !== id),
    }))
  }

  const patchCondition = (id: string, params: Record<string, unknown>) => {
    setDefinition((d) => ({
      ...d,
      conditions: d.conditions.map((c) => (c.id === id ? { ...c, params: { ...c.params, ...params } } : c)),
    }))
  }

  const addAction = (type: AutomationAction['type']) => {
    setDefinition((d) => ({
      ...d,
      actions: [...d.actions, { id: newId(), type, params: defaultActionParams(type) }],
    }))
  }

  const removeAction = (id: string) => {
    setDefinition((d) => ({
      ...d,
      actions: d.actions.filter((a) => a.id !== id),
    }))
  }

  const patchAction = (id: string, params: Record<string, unknown>) => {
    setDefinition((d) => ({
      ...d,
      actions: d.actions.map((a) => (a.id === id ? { ...a, params: { ...a.params, ...params } } : a)),
    }))
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(t('automation:nameRequired'))
      return
    }
    if (definition.actions.length === 0) {
      toast.error(t('automation:actionsRequired'))
      return
    }
    onSave({
      name: trimmed,
      definitionJson: stringifyDefinition(definition),
      retryOnFailure,
    })
  }

  const triggerLabel = (type: AutomationTriggerType) =>
    t(`automation:triggers.${type}`, { defaultValue: type })

  const conditionLabel = (type: AutomationCondition['type']) =>
    t(`automation:conditions.${type}`, { defaultValue: type })

  const actionLabel = (type: AutomationAction['type']) =>
    t(`automation:actions.${type}`, { defaultValue: type })

  return (
    <div className='min-h-[70vh] rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6'>
      <div className='mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex min-w-0 flex-1 items-start gap-2'>
          <Button type='button' variant='ghost' size='icon' onClick={onDiscard} aria-label={t('common:back')}>
            <ArrowLeft className='size-5' />
          </Button>
          <div className='min-w-0 flex-1 space-y-2'>
            <div className='flex min-w-0 items-center gap-2'>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='max-w-md border-input bg-background text-lg font-semibold'
                placeholder={t('automation:newAutomationName')}
              />
              <Pencil className='size-4 shrink-0 text-muted-foreground' aria-hidden />
            </div>
            <p className='max-w-2xl text-sm text-muted-foreground'>{t('automation:flowIntro')}</p>
          </div>
        </div>
        <Button type='button' variant='ghost' className='shrink-0 text-destructive hover:text-destructive' onClick={onDiscard}>
          {t('automation:discard')}
        </Button>
      </div>

      <div className='space-y-6'>
        <section>
          <div className='mb-3 flex items-center justify-between'>
            <AutomationSectionBadge variant='trigger'>{t('automation:whenSomeone')}</AutomationSectionBadge>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            {TRIGGER_CATALOG.map((item) => (
              <AutomationCatalogCard
                key={item.type}
                variant='trigger'
                icon={item.icon}
                label={triggerLabel(item.type)}
                disabled={!item.implemented}
                onSelect={() => item.implemented && setTrigger(item.type)}
              />
            ))}
          </div>
          <div className='mt-4 rounded-xl border border-border bg-muted/40 p-4'>
            <div className='flex items-start gap-3'>
              <div className='flex size-11 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary'>
                <Send className='size-5' />
              </div>
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-primary'>{t('automation:trigger')}</p>
                <p className='text-base font-semibold text-foreground'>{triggerLabel(definition.trigger.type)}</p>
              </div>
            </div>
          </div>
        </section>

        <FlowConnector className='my-1' />

        <section>
          <div className='mb-3 flex items-center justify-between'>
            <AutomationSectionBadge variant='condition'>{t('automation:ifBadge')}</AutomationSectionBadge>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='text-destructive'
              onClick={() => setDefinition((d) => ({ ...d, conditions: [] }))}
              aria-label={t('automation:clearConditions')}
            >
              <Trash2 className='size-4' />
            </Button>
          </div>
          <p className='mb-3 text-xs text-muted-foreground'>{t('automation:conditionAndHint')}</p>
          <div className='grid gap-3 sm:grid-cols-2'>
            {CONDITION_CATALOG.map((item) => (
              <AutomationCatalogCard
                key={item.type}
                variant='condition'
                icon={item.icon}
                label={conditionLabel(item.type)}
                disabled={!item.implemented}
                onSelect={() => item.implemented && addCondition(item.type)}
              />
            ))}
          </div>
          {definition.conditions.length > 0 && (
            <div className='mt-4 space-y-3'>
              {definition.conditions.map((c) => (
                <ConditionEditor
                  key={c.id}
                  condition={c}
                  textChannels={textChannels}
                  roles={roles}
                  channelsLoading={channelsLoading}
                  rolesLoading={rolesLoading}
                  label={conditionLabel(c.type)}
                  onRemove={() => removeCondition(c.id)}
                  onPatch={(p) => patchCondition(c.id, p)}
                />
              ))}
            </div>
          )}
        </section>

        <FlowConnector className='my-1' />

        <section>
          <div className='mb-3 flex items-center justify-between'>
            <AutomationSectionBadge variant='action'>{t('automation:doThis')}</AutomationSectionBadge>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='text-destructive'
              onClick={() => setDefinition((d) => ({ ...d, actions: [] }))}
              aria-label={t('automation:clearActions')}
            >
              <Trash2 className='size-4' />
            </Button>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            {ACTION_CATALOG.filter((a) => !a.hidden).map((item) => (
              <AutomationCatalogCard
                key={item.type}
                variant='action'
                icon={item.icon}
                label={actionLabel(item.type)}
                disabled={!item.implemented}
                onSelect={() => item.implemented && addAction(item.type)}
              />
            ))}
          </div>
          {definition.actions.length > 0 && (
            <div className='mt-4 space-y-3'>
              {definition.actions.map((a) => (
                <ActionEditor
                  key={a.id}
                  action={a}
                  textChannels={textChannels}
                  roles={roles}
                  channelsLoading={channelsLoading}
                  rolesLoading={rolesLoading}
                  label={actionLabel(a.type)}
                  onRemove={() => removeAction(a.id)}
                  onPatch={(p) => patchAction(a.id, p)}
                />
              ))}
            </div>
          )}

          <div className='mt-8 flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='space-y-1'>
              <div className='flex items-center gap-2'>
                <Switch
                  id='retry-on-failure'
                  checked={retryOnFailure}
                  onCheckedChange={setRetryOnFailure}
                />
                <Label htmlFor='retry-on-failure' className='cursor-pointer font-medium'>
                  {t('automation:retryOnFailure')}
                </Label>
              </div>
              <p className='text-xs text-muted-foreground'>{t('automation:retryOnFailureDesc')}</p>
            </div>
          </div>
        </section>

        <div className='flex justify-end gap-2 pt-4'>
          <Button type='button' variant='outline' onClick={onDiscard}>
            {t('common:cancel')}
          </Button>
          <Button type='button' onClick={handleSave} disabled={saving || !name.trim() || definition.actions.length === 0}>
            {saving ? <Loader2 className='size-4 animate-spin' /> : t('common:save')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ConditionEditor({
  condition,
  textChannels,
  roles,
  channelsLoading,
  rolesLoading,
  label,
  onRemove,
  onPatch,
}: {
  condition: AutomationCondition
  textChannels: DiscordChannel[]
  roles: DiscordRole[]
  channelsLoading: boolean
  rolesLoading: boolean
  label: string
  onRemove: () => void
  onPatch: (p: Record<string, unknown>) => void
}) {
  const { t } = useTranslation()
  const channelIds = (condition.params?.channelIds as string[] | undefined) ?? []
  const roleIds = (condition.params?.roleIds as string[] | undefined) ?? []
  const phrases = (condition.params?.phrases as string[] | undefined) ?? []
  const phraseText = phrases.join('\n')
  const userIds = (condition.params?.userIds as string[] | undefined) ?? []
  const userIdsText = userIds.join('\n')

  return (
    <div className='rounded-xl border border-border border-s-4 border-s-chart-2 bg-card p-4 shadow-sm'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <span className='text-sm font-semibold text-chart-2'>{label}</span>
        <Button type='button' variant='ghost' size='sm' className='text-destructive' onClick={onRemove}>
          {t('common:delete')}
        </Button>
      </div>
      {condition.type === 'channel_in' && (
        <div className='space-y-2'>
          <Label>{t('automation:selectChannels')}</Label>
          <ScrollArea className='h-40 rounded-md border border-border p-2'>
            {channelsLoading ? (
              <Loader2 className='size-6 animate-spin' />
            ) : (
              textChannels.map((ch) => (
                <label key={ch.id} className='flex cursor-pointer items-center gap-2 py-1 text-sm'>
                  <input
                    type='checkbox'
                    checked={channelIds.includes(ch.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...channelIds, ch.id]
                        : channelIds.filter((id) => id !== ch.id)
                      onPatch({ channelIds: next })
                    }}
                  />
                  <span className='truncate'>#{ch.name}</span>
                </label>
              ))
            )}
          </ScrollArea>
        </div>
      )}
      {(condition.type === 'user_has_all_roles' ||
        condition.type === 'user_has_one_role' ||
        condition.type === 'user_missing_all_roles' ||
        condition.type === 'user_missing_one_role') && (
        <div className='space-y-2'>
          <Label>{t('automation:selectRoles')}</Label>
          <ScrollArea className='h-40 rounded-md border border-border p-2'>
            {rolesLoading ? (
              <Loader2 className='size-6 animate-spin' />
            ) : (
              roles.map((r) => (
                <label key={r.id} className='flex cursor-pointer items-center gap-2 py-1 text-sm'>
                  <input
                    type='checkbox'
                    checked={roleIds.includes(r.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...roleIds, r.id]
                        : roleIds.filter((id) => id !== r.id)
                      onPatch({ roleIds: next })
                    }}
                  />
                  <span className='truncate'>{r.name}</span>
                </label>
              ))
            )}
          </ScrollArea>
        </div>
      )}
      {(condition.type === 'message_equals_any' ||
        condition.type === 'message_contains_any' ||
        condition.type === 'message_not_contains_any') && (
        <div className='space-y-2'>
          <Label>{t('automation:phrasesOnePerLine')}</Label>
          <Textarea
            value={phraseText}
            onChange={(e) =>
              onPatch({
                phrases: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={4}
            className='bg-background'
          />
        </div>
      )}
      {condition.type === 'user_in_list' && (
        <div className='space-y-2'>
          <Label>{t('automation:userIdsOnePerLine')}</Label>
          <Textarea
            value={userIdsText}
            onChange={(e) =>
              onPatch({
                userIds: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={3}
            className='bg-background'
          />
        </div>
      )}
      {(condition.type === 'attachment_image' ||
        condition.type === 'attachment_audio' ||
        condition.type === 'attachment_video' ||
        condition.type === 'attachment_text' ||
        condition.type === 'message_is_reply' ||
        condition.type === 'message_is_not_reply') && (
        <p className='text-xs text-muted-foreground'>{t('automation:noExtraParams')}</p>
      )}
    </div>
  )
}

function ActionEditor({
  action,
  textChannels,
  roles,
  channelsLoading,
  rolesLoading,
  label,
  onRemove,
  onPatch,
}: {
  action: AutomationAction
  textChannels: DiscordChannel[]
  roles: DiscordRole[]
  channelsLoading: boolean
  rolesLoading: boolean
  label: string
  onRemove: () => void
  onPatch: (p: Record<string, unknown>) => void
}) {
  const { t } = useTranslation()
  const channelId = (action.params?.channelId as string | undefined) ?? ''
  const content = (action.params?.content as string | undefined) ?? ''
  const emojis = ((action.params?.emojis as string[] | undefined) ?? ['👍']).join(', ')
  const roleIds = (action.params?.roleIds as string[] | undefined) ?? []
  const amount = Number(action.params?.amount ?? 10)
  const threadName = (action.params?.name as string | undefined) ?? ''

  return (
    <div className='rounded-xl border border-border border-s-4 border-s-chart-3 bg-card p-4 shadow-sm'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <span className='text-sm font-semibold text-chart-3'>{label}</span>
        <Button type='button' variant='ghost' size='sm' className='text-destructive' onClick={onRemove}>
          {t('common:delete')}
        </Button>
      </div>
      {(action.type === 'send_message' || action.type === 'repost') && (
        <div className='space-y-3'>
          <div>
            <Label>{t('automation:targetChannel')}</Label>
            <Select
              value={channelId || '__none__'}
              onValueChange={(v) => onPatch({ channelId: v === '__none__' ? '' : v })}
              disabled={channelsLoading}
            >
              <SelectTrigger className='mt-1'>
                <SelectValue placeholder={t('common:selectChannel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__none__'>{t('common:select')}</SelectItem>
                {textChannels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    #{ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('automation:messageContent')}</Label>
            <Textarea
              className='mt-1 bg-background'
              rows={3}
              value={content}
              onChange={(e) => onPatch({ content: e.target.value })}
            />
          </div>
        </div>
      )}
      {action.type === 'reply' && (
        <div>
          <Label>{t('automation:messageContent')}</Label>
          <Textarea
            className='mt-1 bg-background'
            rows={3}
            value={content}
            onChange={(e) => onPatch({ content: e.target.value })}
          />
        </div>
      )}
      {action.type === 'react' && (
        <div>
          <Label>{t('automation:emojisComma')}</Label>
          <Input
            className='mt-1'
            value={emojis}
            onChange={(e) =>
              onPatch({
                emojis: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}
      {(action.type === 'add_roles' || action.type === 'remove_roles') && (
        <div className='space-y-2'>
          <Label>{t('automation:selectRoles')}</Label>
          <ScrollArea className='h-36 rounded-md border border-border p-2'>
            {rolesLoading ? (
              <Loader2 className='size-6 animate-spin' />
            ) : (
              roles.map((r) => (
                <label key={r.id} className='flex cursor-pointer items-center gap-2 py-1 text-sm'>
                  <input
                    type='checkbox'
                    checked={roleIds.includes(r.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...roleIds, r.id]
                        : roleIds.filter((id) => id !== r.id)
                      onPatch({ roleIds: next })
                    }}
                  />
                  <span className='truncate'>{r.name}</span>
                </label>
              ))
            )}
          </ScrollArea>
        </div>
      )}
      {action.type === 'create_thread' && (
        <div className='space-y-2'>
          <Label>{t('automation:threadName')}</Label>
          <Input value={threadName} onChange={(e) => onPatch({ name: e.target.value })} />
        </div>
      )}
      {(action.type === 'pin' || action.type === 'delete_message') && (
        <p className='text-xs text-muted-foreground'>{t('automation:usesTriggerMessage')}</p>
      )}
      {(action.type === 'give_xp' || action.type === 'take_xp') && (
        <div className='flex items-center gap-2'>
          <Label>{t('automation:xpAmount')}</Label>
          <Input
            type='number'
            min={1}
            max={10000}
            className='w-28'
            value={Number.isFinite(amount) ? amount : 10}
            onChange={(e) => onPatch({ amount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          />
        </div>
      )}
    </div>
  )
}
