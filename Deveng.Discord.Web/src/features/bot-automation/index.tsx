import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus, Workflow } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { automationApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import type { DiscordChannel, DiscordRole } from '@/lib/api/discord'
import { AutomationBuilder } from './automation-builder'
import { createEmptyDefinition, stringifyDefinition } from './automation-definition'

export function BotAutomation() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const featureName = 'automation'
  const featureDisplayName = t('nav:automation')
  const { renderFeatureGate, isFeatureEnabled } = useFeatureGate({
    guildId,
    featureName,
    featureDisplayName,
  })

  const [mode, setMode] = React.useState<'list' | 'builder'>('list')
  const [editingId, setEditingId] = React.useState<number | null>(null)

  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [channelsLoading, setChannelsLoading] = React.useState(false)

  React.useEffect(() => {
    setMode('list')
    setEditingId(null)
  }, [guildId])

  React.useEffect(() => {
    const run = async () => {
      if (!guildId) return
      setRolesLoading(true)
      try {
        const data = await discordApi.getRoles(guildId)
        setRoles([...data.roles].sort((a, b) => b.position - a.position))
      } catch {
        toast.error(t('common:rolesLoading'))
      } finally {
        setRolesLoading(false)
      }
    }
    void run()
  }, [guildId, t])

  React.useEffect(() => {
    const run = async () => {
      if (!guildId) return
      setChannelsLoading(true)
      try {
        const data = await discordApi.getChannels(guildId)
        setChannels([...data.channels].sort((a, b) => a.position - b.position))
      } catch {
        toast.error(t('common:channelsLoading'))
      } finally {
        setChannelsLoading(false)
      }
    }
    void run()
  }, [guildId, t])

  const { data: rules, isLoading, error } = useQuery({
    queryKey: ['automations', guildId],
    queryFn: () => automationApi.getByGuildId(guildId),
    enabled: !!guildId && isFeatureEnabled,
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; definitionJson: string; retryOnFailure: boolean }) => {
      if (editingId != null) {
        const prev = rules?.find((r) => r.id === editingId)
        return automationApi.update(guildId, editingId, {
          name: payload.name,
          enabled: prev?.enabled ?? true,
          definitionJson: payload.definitionJson,
          retryOnFailure: payload.retryOnFailure,
        })
      }
      return automationApi.create(guildId, {
        name: payload.name,
        enabled: true,
        definitionJson: payload.definitionJson,
        retryOnFailure: payload.retryOnFailure,
      })
    },
    onSuccess: () => {
      toast.success(t('automation:saved'))
      queryClient.invalidateQueries({ queryKey: ['automations', guildId] })
      setMode('list')
      setEditingId(null)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('common:anErrorOccurred')
      toast.error(String(msg))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => automationApi.delete(guildId, id),
    onSuccess: () => {
      toast.success(t('automation:deleted'))
      queryClient.invalidateQueries({ queryKey: ['automations', guildId] })
    },
    onError: () => toast.error(t('common:anErrorOccurred')),
  })

  const toggleMutation = useMutation({
    mutationFn: async (row: { id: number; name: string; definitionJson: string; retryOnFailure: boolean; enabled: boolean }) =>
      automationApi.update(guildId, row.id, {
        name: row.name,
        enabled: !row.enabled,
        definitionJson: row.definitionJson,
        retryOnFailure: row.retryOnFailure,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations', guildId] }),
    onError: () => toast.error(t('common:anErrorOccurred')),
  })

  const editingRule = rules?.find((r) => r.id === editingId)

  const builderInitial = React.useMemo(() => {
    if (editingId != null && editingRule) {
      return {
        name: editingRule.name,
        definitionJson: editingRule.definitionJson,
        retryOnFailure: editingRule.retryOnFailure,
      }
    }
    return {
      name: t('automation:defaultNewName'),
      definitionJson: stringifyDefinition(createEmptyDefinition()),
      retryOnFailure: false,
    }
  }, [editingId, editingRule, t])

  if (isLoading) {
    return renderFeatureGate(
      <>
        <Main>
          <div className='flex min-h-[60vh] items-center justify-center'>
            <Loader2 className='size-8 animate-spin' />
          </div>
        </Main>
      </>
    )
  }

  if (error) {
    return renderFeatureGate(
      <>
        <Main>
          <p className='text-destructive'>{t('common:listLoadError')}</p>
        </Main>
      </>
    )
  }

  return renderFeatureGate(
    <>
      <Main>
        <div className='space-y-6'>
          <Card className='overflow-hidden border-border/80 shadow-sm'>
            <CardHeader className='relative space-y-3 border-b border-border/60 bg-gradient-to-br from-muted/50 via-background to-background pb-6'>
              <div className='pointer-events-none absolute -end-12 -top-12 size-40 rounded-full bg-primary/10 blur-2xl' aria-hidden />
              <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                <div className='flex gap-4'>
                  <div
                    className='flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-sm'
                    aria-hidden
                  >
                    <Workflow className='size-6' />
                  </div>
                  <div className='min-w-0 space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <CardTitle className='text-2xl tracking-tight sm:text-3xl'>{featureDisplayName}</CardTitle>
                      {mode === 'list' && rules != null && rules.length > 0 ? (
                        <Badge variant='secondary' className='font-normal'>
                          {t('automation:rulesCount', { count: rules.length })}
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription className='max-w-2xl text-pretty sm:text-base'>
                      {t('automation:pageSubtitle')}
                    </CardDescription>
                  </div>
                </div>
                <FeatureDisableButton
                  className='shrink-0 md:ms-auto'
                  guildId={guildId}
                  featureName={featureName}
                  featureDisplayName={featureDisplayName}
                  confirmDescription={t('automation:disableConfirm')}
                />
              </div>
            </CardHeader>
          </Card>

          {mode === 'builder' ? (
            <AutomationBuilder
              key={editingId ?? 'new'}
              initialName={builderInitial.name}
              initialDefinitionJson={builderInitial.definitionJson}
              initialRetryOnFailure={builderInitial.retryOnFailure}
              channels={channels}
              roles={roles}
              channelsLoading={channelsLoading}
              rolesLoading={rolesLoading}
              saving={saveMutation.isPending}
              onSave={(p) => saveMutation.mutate(p)}
              onDiscard={() => {
                setMode('list')
                setEditingId(null)
              }}
            />
          ) : (
            <>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  onClick={() => {
                    setEditingId(null)
                    setMode('builder')
                  }}
                >
                  <Plus className='me-2 size-4' />
                  {t('automation:newAutomation')}
                </Button>
              </div>
              {!rules?.length ? (
                <Card className='border-dashed border-border/80 bg-muted/20'>
                  <CardContent className='flex flex-col items-center px-6 py-14 text-center'>
                    <div
                      className='mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm'
                      aria-hidden
                    >
                      <Workflow className='size-7' />
                    </div>
                    <h3 className='text-lg font-semibold text-foreground'>{t('automation:emptyRulesTitle')}</h3>
                    <p className='mt-2 max-w-md text-pretty text-sm text-muted-foreground'>
                      {t('automation:emptyRulesHint')}
                    </p>
                    <Button
                      type='button'
                      className='mt-6'
                      onClick={() => {
                        setEditingId(null)
                        setMode('builder')
                      }}
                    >
                      <Plus className='me-2 size-4' />
                      {t('automation:newAutomation')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <ul className='space-y-3' role='list'>
                  {rules.map((r) => (
                    <li key={r.id}>
                      <Card
                        className={cn(
                          'overflow-hidden shadow-sm transition-shadow hover:shadow-md',
                          r.enabled ? 'border-s-4 border-s-primary' : 'border-s-4 border-s-muted-foreground/25 opacity-95'
                        )}
                      >
                        <CardContent className='flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
                          <div className='min-w-0 flex-1 space-y-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <p className='truncate font-semibold text-foreground'>{r.name}</p>
                              <Badge variant='outline' className='font-mono text-xs font-normal text-muted-foreground'>
                                #{r.id}
                              </Badge>
                              {r.enabled ? (
                                <Badge variant='default' className='text-xs'>
                                  {t('common:active')}
                                </Badge>
                              ) : (
                                <Badge variant='secondary' className='text-xs'>
                                  {t('common:inactive')}
                                </Badge>
                              )}
                            </div>
                            <p className='text-xs text-muted-foreground'>{t('automation:ruleListHint')}</p>
                          </div>
                          <div className='flex flex-wrap items-center gap-3 sm:justify-end'>
                            <div className='flex items-center gap-2'>
                              <span className='text-sm text-muted-foreground'>{t('automation:toggleRule')}</span>
                              <Switch
                                checked={r.enabled}
                                onCheckedChange={() =>
                                  toggleMutation.mutate({
                                    id: r.id,
                                    name: r.name,
                                    definitionJson: r.definitionJson,
                                    retryOnFailure: r.retryOnFailure,
                                    enabled: r.enabled,
                                  })
                                }
                                disabled={toggleMutation.isPending}
                              />
                            </div>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                setEditingId(r.id)
                                setMode('builder')
                              }}
                            >
                              {t('common:edit')}
                            </Button>
                            <Button
                              type='button'
                              variant='destructive'
                              size='sm'
                              onClick={() => deleteMutation.mutate(r.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {t('common:delete')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Main>
    </>
  )
}
