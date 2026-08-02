import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { ticketsApi, type TicketRow } from '@/lib/api'
import { Loader2, ArrowLeft } from 'lucide-react'
import {
  createEmbedSchema,
  createEmbedFieldNames,
  createEmptyEmbedValues,
  EmbedFormSection,
  toEmbedApiPayload,
} from '@/components/embed-editor'

const staffEmbedFields = createEmbedFieldNames('embed', { message: 'content' })

const staffMessageFormSchema = createEmbedSchema(staffEmbedFields)

type StaffMessageFormValues = z.infer<typeof staffMessageFormSchema>

function getEmptyStaffMessageValues(): StaffMessageFormValues {
  return createEmptyEmbedValues('embed', { message: 'content' }) as StaffMessageFormValues
}

function statusLabel(t: (k: string) => string, status: number) {
  if (status === 0) return t('dashboard:ticketStatusOpen')
  if (status === 1) return t('dashboard:ticketStatusClaimed')
  if (status === 2) return t('dashboard:ticketStatusClosed')
  return String(status)
}

export function GuildTicketsPage() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { guildId } = useParams({ from: '/_authenticated/dashboard/$guildId/tickets' })
  const qc = useQueryClient()
  const [filter, setFilter] = React.useState<'open' | 'all'>('open')
  const [selected, setSelected] = React.useState<TicketRow | null>(null)
  const [messageDialogOpen, setMessageDialogOpen] = React.useState(false)

  const staffForm = useForm<StaffMessageFormValues>({
    resolver: zodResolver(staffMessageFormSchema),
    defaultValues: getEmptyStaffMessageValues(),
  })

  const listQuery = useQuery({
    queryKey: ['guild-tickets', guildId],
    queryFn: () => ticketsApi.list(guildId),
    enabled: !!guildId,
  })

  const rows = React.useMemo(() => {
    const all = listQuery.data ?? []
    if (filter === 'open') return all.filter((r) => r.status !== 2)
    return all
  }, [listQuery.data, filter])

  const loading = listQuery.isLoading

  const markReadMutation = useMutation({
    mutationFn: (ticketId: number) => ticketsApi.markRead(guildId, ticketId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['guild-tickets'] })
      void qc.invalidateQueries({ queryKey: ['guild-tickets-open'] })
    },
  })

  const sendMutation = useMutation({
    mutationFn: (data: StaffMessageFormValues) => {
      if (!selected) throw new Error('no ticket')
      const payload = toEmbedApiPayload(data, staffEmbedFields)
      return ticketsApi.sendStaffMessage(guildId, selected.id, {
        content: String(payload.content ?? ''),
        embedTitle: payload.embedTitle as string | undefined,
        embedDescription: payload.embedDescription as string | undefined,
        embedColor: payload.embedColor as string | undefined,
      })
    },
    onSuccess: () => {
      staffForm.reset(getEmptyStaffMessageValues())
      setMessageDialogOpen(false)
      void qc.invalidateQueries({ queryKey: ['guild-tickets'] })
      void qc.invalidateQueries({ queryKey: ['guild-tickets-open'] })
    },
  })

  const contentValue = staffForm.watch('content')
  const embedDescriptionValue = staffForm.watch('embedDescription')
  const canSend =
    Boolean(String(contentValue ?? '').trim()) || Boolean(String(embedDescriptionValue ?? '').trim())

  return (
    <Main>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' asChild>
            <Link to='/dashboard/$guildId' params={{ guildId }}>
              <ArrowLeft className='size-4' />
            </Link>
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('dashboard:ticketsPageTitle')}</h1>
            <p className='text-muted-foreground text-sm'>{t('dashboard:ticketsPageSubtitle')}</p>
          </div>
        </div>
        <div className='flex gap-2'>
          <Button variant={filter === 'open' ? 'default' : 'outline'} size='sm' onClick={() => setFilter('open')}>
            {t('dashboard:ticketsFilterOpen')}
          </Button>
          <Button variant={filter === 'all' ? 'default' : 'outline'} size='sm' onClick={() => setFilter('all')}>
            {t('dashboard:ticketsFilterAll')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className='flex justify-center py-16'>
          <Loader2 className='size-8 animate-spin' />
        </div>
      ) : (
        <div className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard:ticketsListTitle')}</CardTitle>
              <CardDescription>{t('dashboard:ticketsListHint')}</CardDescription>
            </CardHeader>
            <CardContent className='max-h-[480px] space-y-2 overflow-y-auto'>
              {rows.length === 0 ? (
                <p className='text-muted-foreground text-sm'>{t('dashboard:ticketsEmpty')}</p>
              ) : (
                rows.map((row) => (
                  <button
                    key={row.id}
                    type='button'
                    onClick={() => setSelected(row)}
                    className={`flex w-full flex-col items-start rounded-lg border p-3 text-left text-sm transition hover:bg-muted/50 ${
                      selected?.id === row.id ? 'border-primary bg-muted/30' : 'border-border'
                    }`}
                  >
                    <div className='flex w-full items-center justify-between gap-2'>
                      <span className='font-medium'>#{row.id}</span>
                      <div className='flex gap-1'>
                        {row.isUnreadForStaff ? (
                          <Badge variant='destructive'>{t('dashboard:ticketUnread')}</Badge>
                        ) : null}
                        <Badge variant='secondary'>{statusLabel(t, row.status)}</Badge>
                      </div>
                    </div>
                    <span className='text-muted-foreground mt-1 text-xs'>
                      {t('dashboard:ticketChannel')}: {row.channelId}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard:ticketDetailTitle')}</CardTitle>
              <CardDescription>
                {selected ? `${t('dashboard:ticketUser')}: ${selected.userId}` : t('dashboard:ticketSelectHint')}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {selected ? (
                <>
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate(selected.id)}
                    >
                      {t('dashboard:ticketMarkRead')}
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      onClick={() => {
                        staffForm.reset(getEmptyStaffMessageValues())
                        setMessageDialogOpen(true)
                      }}
                    >
                      {t('dashboard:ticketSendDiscord')}
                    </Button>
                  </div>
                  {sendMutation.isError ? (
                    <p className='text-destructive text-sm'>{t('common:anErrorOccurred')}</p>
                  ) : null}
                </>
              ) : (
                <p className='text-muted-foreground text-sm'>{t('dashboard:ticketSelectHint')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{t('dashboard:ticketSendDiscord')}</DialogTitle>
            <DialogDescription>{t('dashboard:ticketMessageContent')}</DialogDescription>
          </DialogHeader>
          <Form {...staffForm}>
            <form
              onSubmit={staffForm.handleSubmit((data) => sendMutation.mutate(data))}
              className='space-y-4'
            >
              <EmbedFormSection
                control={staffForm.control}
                watch={staffForm.watch}
                fieldNames={staffEmbedFields}
                showIsEmbed={false}
              />
              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setMessageDialogOpen(false)}>
                  {t('common:cancel')}
                </Button>
                <Button type='submit' disabled={sendMutation.isPending || !canSend}>
                  {sendMutation.isPending ? t('common:loading') : t('dashboard:ticketSendDiscord')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Main>
  )
}
