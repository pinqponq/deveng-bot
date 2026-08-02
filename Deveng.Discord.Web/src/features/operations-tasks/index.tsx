import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { guildReportApi, panelAuditLogApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2 } from 'lucide-react'

export function OperationsTasks() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''

  const reportsQuery = useQuery({ queryKey: ['tasks-reports', guildId], queryFn: () => guildReportApi.getByGuildId(guildId), enabled: !!guildId })
  const auditsQuery = useQuery({ queryKey: ['tasks-audits', guildId], queryFn: () => panelAuditLogApi.query(guildId, { limit: 25 }), enabled: !!guildId })

  const isLoading = reportsQuery.isLoading || auditsQuery.isLoading
  const reportTasks = (reportsQuery.data ?? []).filter((job) => job.status !== 'completed')
  const failedAudits = (auditsQuery.data ?? []).filter((log) => log.result !== 'success')

  return (
    <>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{t('operationsTasks:pageTitle')}</h1>
          <p className='text-muted-foreground'>{t('operationsTasks:pageDescription')}</p>
        </div>

        {isLoading ? <div className='flex min-h-[40vh] items-center justify-center'><Loader2 className='size-8 animate-spin' /></div> : (
          <div className='grid gap-4 lg:grid-cols-2'>
            <TaskCard title={t('operationsTasks:reportJobsTitle')} description={t('operationsTasks:reportJobsDescription')} items={reportTasks.map((job) => ({ id: job.id, title: job.reportRange, status: job.status, date: job.createdAt }))} />
            <TaskCard title={t('operationsTasks:auditWarningsTitle')} description={t('operationsTasks:auditWarningsDescription')} items={failedAudits.map((log) => ({ id: log.id, title: log.action, status: log.result, date: log.createdAtUtc }))} />
          </div>
        )}
      </Main>
    </>
  )
}

function TaskCard({ title, description, items }: { title: string; description: string; items: Array<{ id: number; title: string; status: string; date: string }> }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent className='space-y-2'>
        {items.map((item) => (
          <div key={item.id} className='rounded-md border p-3 text-sm'>
            <div className='flex items-center justify-between gap-2'><span className='font-medium'>{item.title}</span><Badge variant={item.status === 'failed' ? 'destructive' : 'secondary'}>{item.status}</Badge></div>
            <div className='mt-1 text-muted-foreground'>{new Date(item.date).toLocaleString('tr-TR')}</div>
          </div>
        ))}
        {items.length === 0 && <p className='text-sm text-muted-foreground'>{t('operationsTasks:emptyState')}</p>}
      </CardContent>
    </Card>
  )
}
