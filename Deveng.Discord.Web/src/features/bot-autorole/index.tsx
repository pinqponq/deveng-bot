import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SimpleDataTable, DataTableColumnHeader } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select'
import { autoRoleApi, discordApi, type AutoRoleRoleDto, type DiscordRole, type UpsertAutoRoleDto } from '@/lib/api'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'

const defaultDraft: UpsertAutoRoleDto = {
  enabled: false,
  delaySeconds: 0,
  minAccountAgeDays: null,
  roles: [],
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('tr-TR')
}

export function BotAutoRole() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'auto-role', featureDisplayName: t('autorole:featureName') })
  const [draft, setDraft] = React.useState<UpsertAutoRoleDto>(defaultDraft)
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [selectedRoleId, setSelectedRoleId] = React.useState('')

  const configQuery = useQuery({
    queryKey: ['autorole', guildId],
    queryFn: () => autoRoleApi.get(guildId),
    enabled: !!guildId,
  })
  const auditQuery = useQuery({
    queryKey: ['autorole-audit', guildId],
    queryFn: () => autoRoleApi.getAudit(guildId),
    enabled: !!guildId,
  })

  React.useEffect(() => {
    if (configQuery.data) {
      setDraft({
        enabled: configQuery.data.enabled,
        delaySeconds: configQuery.data.delaySeconds,
        minAccountAgeDays: configQuery.data.minAccountAgeDays,
        roles: configQuery.data.roles,
      })
    } else if (configQuery.data === null) {
      setDraft(defaultDraft)
    }
  }, [configQuery.data])

  React.useEffect(() => {
    if (!guildId) return
    discordApi.getRoles(guildId)
      .then((data) => setRoles([...data.roles].sort((a, b) => b.position - a.position)))
      .catch(() => toast.error(t('common:rolesLoadError')))
  }, [guildId])

  const saveMutation = useMutation({
    mutationFn: () => autoRoleApi.upsert(guildId, draft),
    onSuccess: () => {
      toast.success(t('autorole:saved'))
      queryClient.invalidateQueries({ queryKey: ['autorole', guildId] })
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('autorole:saveError')),
  })

  const addRole = () => {
    if (!selectedRoleId) return
    if (draft.roles.some((role) => role.roleId === selectedRoleId)) return toast.error(t('autorole:roleAlreadyListed'))
    setDraft((s) => ({
      ...s,
      roles: [...s.roles, { roleId: selectedRoleId, sortOrder: s.roles.length, enabled: true }],
    }))
    setSelectedRoleId('')
  }

  const removeRole = (roleId: string) => {
    setDraft((s) => ({
      ...s,
      roles: s.roles.filter((role) => role.roleId !== roleId).map((role, index) => ({ ...role, sortOrder: index })),
    }))
  }

  const toggleRole = (roleId: string, enabled: boolean) => {
    setDraft((s) => ({
      ...s,
      roles: s.roles.map((role) => role.roleId === roleId ? { ...role, enabled } : role),
    }))
  }

  const roleName = (roleId: string) => roles.find((role) => role.id === roleId)?.name ?? roleId

  const auditColumns = React.useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('autorole:colTime')} />,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'role',
        accessorFn: (i: any) => `@${roles.find((r) => r.id === i.roleId)?.name ?? i.roleId}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('autorole:colRole')} />,
        cell: ({ getValue }) => getValue() as string,
      },
      {
        accessorKey: 'result',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('autorole:colResult')} />,
        cell: ({ row }) => (
          <Badge variant={row.original.result === 'success' ? 'default' : 'secondary'}>
            {row.original.result}
          </Badge>
        ),
      },
      {
        accessorKey: 'errorCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('autorole:colError')} />,
        cell: ({ row }) => row.original.errorCode ?? '-',
      },
    ],
    [roles, t]
  )
  const highestSelectedRole = draft.roles
    .map((entry) => roles.find((role) => role.id === entry.roleId))
    .filter(Boolean)
    .sort((a, b) => (b?.position ?? 0) - (a?.position ?? 0))[0]

  if (configQuery.isLoading) {
    return (
      <>
        <Main><div className='flex min-h-[60vh] items-center justify-center'><Loader2 className='size-8 animate-spin' /></div></Main>
      </>
    )
  }

  return renderFeatureGate(
    <>
      <Main>
        <div className='mb-6 flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('autorole:featureName')}</h1>
            <p className='text-muted-foreground'>{t('autorole:pageDescription')}</p>
          </div>
          <FeatureDisableButton guildId={guildId} featureName='auto-role' featureDisplayName={t('autorole:featureName')} confirmDescription={t('autorole:disableConfirm')} />
        </div>

        <div className='grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]'>
          <Card>
            <CardHeader><CardTitle>{t('autorole:settingsTitle')}</CardTitle><CardDescription>{t('autorole:settingsDesc')}</CardDescription></CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between rounded-md border p-3'><Label>{t('autorole:enabled')}</Label><Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft((s) => ({ ...s, enabled }))} /></div>
              <div className='grid gap-2'><Label>{t('autorole:delayLabel')}</Label><Input type='number' min={0} max={86400} value={draft.delaySeconds} onChange={(e) => setDraft((s) => ({ ...s, delaySeconds: Number(e.target.value) }))} /></div>
              <div className='grid gap-2'><Label>{t('autorole:minAgeLabel')}</Label><Input type='number' value={draft.minAccountAgeDays ?? ''} onChange={(e) => setDraft((s) => ({ ...s, minAccountAgeDays: e.target.value ? Number(e.target.value) : null }))} /></div>
              <div className='grid gap-2'>
                <Label>{t('autorole:addRole')}</Label>
                <div className='flex gap-2'>
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                    <SelectTrigger className='w-full'><SelectValue placeholder={t('autorole:selectRolePlaceholder')} /></SelectTrigger>
                    <SearchableSelectContent items={roles.map((role) => ({ value: role.id, label: `@${role.name}` }))} />
                  </Select>
                  <Button type='button' variant='outline' onClick={addRole}><Plus className='size-4' /></Button>
                </div>
              </div>
              {highestSelectedRole && <div className='rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm'>{t('autorole:highestRoleWarn', { role: highestSelectedRole.name })}</div>}
              {draft.roles.length > 0 && (
                <div className='rounded-md border border-muted p-3 text-xs text-muted-foreground'>
                  {t('autorole:broadRolesWarn')}
                </div>
              )}
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />} {t('autorole:save')}</Button>
            </CardContent>
          </Card>

          <div className='space-y-4'>
            <Card>
              <CardHeader><CardTitle>{t('autorole:rolesTitle')}</CardTitle><CardDescription>{t('autorole:rolesDesc')}</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>{t('autorole:colRole')}</TableHead><TableHead>{t('autorole:colStatus')}</TableHead><TableHead className='text-right'>{t('autorole:colAction')}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {draft.roles.map((role: AutoRoleRoleDto) => (
                      <TableRow key={role.roleId}>
                        <TableCell>@{roleName(role.roleId)}</TableCell>
                        <TableCell><Switch checked={role.enabled} onCheckedChange={(enabled) => toggleRole(role.roleId, enabled)} /></TableCell>
                        <TableCell className='text-right'><Button variant='ghost' size='sm' onClick={() => removeRole(role.roleId)}><Trash2 className='size-4' /></Button></TableCell>
                      </TableRow>
                    ))}
                    {draft.roles.length === 0 && <TableRow><TableCell colSpan={3} className='py-8 text-center text-muted-foreground'>{t('autorole:noRolesSelected')}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t('autorole:auditTitle')}</CardTitle><CardDescription>{t('autorole:auditDesc')}</CardDescription></CardHeader>
              <CardContent>
                <SimpleDataTable
                  columns={auditColumns}
                  data={auditQuery.data ?? []}
                  searchPlaceholder={t('autorole:auditSearchPlaceholder')}
                  emptyMessage={t('autorole:auditEmpty')}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}
