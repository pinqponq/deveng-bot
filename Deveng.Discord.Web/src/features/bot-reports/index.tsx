import * as React from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { guildReportApi } from '@/lib/api'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Mail, Plus, RefreshCw, Save, Send } from 'lucide-react'

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('tr-TR') : '-'
}

function splitSummaryJson(summaryJson?: string | null): { text: string; pdfBase64: string | null } {
  if (!summaryJson) return { text: '-', pdfBase64: null }
  try {
    const o = JSON.parse(summaryJson) as Record<string, unknown>
    const pdf = o.reportPdfBase64
    if (typeof pdf === 'string' && pdf.length > 0) {
      const { reportPdfBase64: _drop, ...rest } = o
      return { text: JSON.stringify(rest, null, 2), pdfBase64: pdf }
    }
    return { text: JSON.stringify(o, null, 2), pdfBase64: null }
  } catch {
    return { text: summaryJson, pdfBase64: null }
  }
}

function downloadPdfBase64(base64: string, filename: string) {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function emailOutcomeMessage(t: TFunction, outcome: string, detail?: string | null): string {
  const labels: Record<string, string> = {
    sent: t('reports:outcomeSent'),
    failed: t('reports:outcomeFailed'),
    failed_bad_pdf: t('reports:outcomeFailedBadPdf'),
    skipped_no_recipient: t('reports:outcomeSkippedNoRecipient'),
    skipped_invalid_email: t('reports:outcomeSkippedInvalidEmail'),
    skipped_auto_disabled: t('reports:outcomeSkippedAutoDisabled'),
    skipped_smtp_not_configured: t('reports:outcomeSkippedSmtpNotConfigured'),
    skipped_no_pdf: t('reports:outcomeSkippedNoPdf'),
    skipped_not_completed: t('reports:outcomeSkippedNotCompleted'),
    not_found: t('reports:outcomeNotFound'),
  }
  const head = labels[outcome] ?? outcome
  return detail ? `${head}: ${detail}` : head
}

function emailStatusBadgeLabel(t: TFunction, status?: string | null): string {
  if (!status) return t('reports:emailStatusNotAttempted')
  const m: Record<string, string> = {
    sent: t('reports:emailStatusSent'),
    failed: t('reports:emailStatusFailed'),
    failed_bad_pdf: t('reports:emailStatusFailedBadPdf'),
    skipped_no_recipient: t('reports:emailStatusNoRecipient'),
    skipped_invalid_email: t('reports:emailStatusInvalidEmail'),
    skipped_auto_disabled: t('reports:emailStatusAutoDisabled'),
    skipped_smtp_not_configured: t('reports:emailStatusSmtpNotConfigured'),
    skipped_no_pdf: t('reports:emailStatusNoPdf'),
    skipped_not_completed: t('reports:emailStatusNotCompleted'),
  }
  return m[status] ?? t('reports:emailStatusGeneric', { status })
}

export function BotReports() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [reportRange, setReportRange] = React.useState('weekly')
  const [notifyEmailDraft, setNotifyEmailDraft] = React.useState('')
  const [sendOnCompleteDraft, setSendOnCompleteDraft] = React.useState(false)
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'guild-report', featureDisplayName: t('reports:featureDisplayName') })

  const reportsQuery = useQuery({
    queryKey: ['guild-reports', guildId],
    queryFn: () => guildReportApi.getByGuildId(guildId),
    enabled: !!guildId,
  })

  const notifyQuery = useQuery({
    queryKey: ['guild-report-notify', guildId],
    queryFn: () => guildReportApi.getNotify(guildId),
    enabled: !!guildId,
  })

  React.useEffect(() => {
    const n = notifyQuery.data
    if (n) {
      setNotifyEmailDraft(n.notifyEmail ?? '')
      setSendOnCompleteDraft(n.sendOnComplete)
    } else if (notifyQuery.isSuccess) {
      setNotifyEmailDraft('')
      setSendOnCompleteDraft(false)
    }
  }, [notifyQuery.data, notifyQuery.isSuccess])

  const saveNotifyMutation = useMutation({
    mutationFn: () =>
      guildReportApi.upsertNotify(guildId, {
        notifyEmail: notifyEmailDraft.trim() || null,
        sendOnComplete: sendOnCompleteDraft,
      }),
    onSuccess: () => {
      toast.success(t('reports:notificationSaved'))
      void queryClient.invalidateQueries({ queryKey: ['guild-report-notify', guildId] })
    },
    onError: () => toast.error(t('reports:saveFailed')),
  })

  const createMutation = useMutation({
    mutationFn: () => guildReportApi.create(guildId, reportRange),
    onSuccess: () => {
      toast.success(t('reports:jobCreated'))
      void queryClient.invalidateQueries({ queryKey: ['guild-reports', guildId] })
    },
  })

  const resendEmailMutation = useMutation({
    mutationFn: (jobId: number) => guildReportApi.resendEmail(guildId, jobId),
    onSuccess: (data) => {
      toast.message(emailOutcomeMessage(t, data.outcome, data.detail))
      void queryClient.invalidateQueries({ queryKey: ['guild-reports', guildId] })
    },
    onError: () => toast.error(t('reports:emailRequestFailed')),
  })

  if (reportsQuery.isLoading || notifyQuery.isLoading) {
    return (
      <>
        <Main>
          <div className='flex min-h-[60vh] items-center justify-center'>
            <Loader2 className='size-8 animate-spin' />
          </div>
        </Main>
      </>
    )
  }

  return renderFeatureGate(
    <>
      <Main>
        <div className='mb-6 flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('reports:pageTitle')}</h1>
            <p className='text-muted-foreground'>{t('reports:pageDescription')}</p>
          </div>
          <FeatureDisableButton
            guildId={guildId}
            featureName='guild-report'
            featureDisplayName={t('reports:featureDisplayName')}
            confirmDescription={t('reports:confirmDescription')}
          />
        </div>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Mail className='size-5' />
              {t('reports:notifyCardTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-2 sm:max-w-md'>
              <Label htmlFor='report-notify-email'>{t('reports:notifyAddressLabel')}</Label>
              <Input
                id='report-notify-email'
                type='email'
                autoComplete='email'
                placeholder={t('reports:notifyAddressPlaceholder')}
                value={notifyEmailDraft}
                onChange={(e) => setNotifyEmailDraft(e.target.value)}
              />
            </div>
            <div className='flex items-center justify-between gap-4 rounded-lg border p-3 sm:max-w-md'>
              <Label htmlFor='report-send-on-complete'>{t('reports:sendOnCompleteLabel')}</Label>
              <Switch
                id='report-send-on-complete'
                checked={sendOnCompleteDraft}
                onCheckedChange={setSendOnCompleteDraft}
              />
            </div>
            {notifyQuery.data?.updatedAt ? (
              <p className='text-xs text-muted-foreground'>{t('reports:settingLastUpdated', { date: formatDate(notifyQuery.data.updatedAt) })}</p>
            ) : null}
            <Button type='button' onClick={() => saveNotifyMutation.mutate()} disabled={saveNotifyMutation.isPending}>
              {saveNotifyMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />}
              {t('reports:saveButton')}
            </Button>
          </CardContent>
        </Card>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle>{t('reports:newReportCardTitle')}</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-2'>
            <Select value={reportRange} onValueChange={setReportRange}>
              <SelectTrigger className='w-full sm:w-[180px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='weekly'>{t('reports:rangeWeekly')}</SelectItem>
                <SelectItem value='monthly'>{t('reports:rangeMonthly')}</SelectItem>
                <SelectItem value='custom'>{t('reports:rangeCustom')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Plus className='mr-2 size-4' />}
              {t('reports:createJobButton')}
            </Button>
            <Button
              variant='outline'
              onClick={() => {
                void reportsQuery.refetch()
                void notifyQuery.refetch()
              }}
            >
              <RefreshCw className='mr-2 size-4' /> {t('reports:refreshButton')}
            </Button>
          </CardContent>
        </Card>

        <div className='grid gap-4 lg:grid-cols-2'>
          {(reportsQuery.data ?? []).map((report) => {
            const { text, pdfBase64 } = splitSummaryJson(report.summaryJson)
            const canResendMail = report.status === 'completed' && !!pdfBase64
            return (
              <Card key={report.id}>
                <CardHeader>
                  <CardTitle>#{report.id} · {report.reportRange}</CardTitle>
                  <CardDescription>
                    {t('reports:cardCreatedCompleted', { created: formatDate(report.createdAt), completed: formatDate(report.completedAt) })}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant={report.status === 'completed' ? 'default' : report.status === 'failed' ? 'destructive' : 'secondary'}>
                      {report.status}
                    </Badge>
                    {report.emailStatus ? (
                      <Badge variant={report.emailStatus === 'sent' ? 'default' : report.emailStatus === 'failed' || report.emailStatus === 'failed_bad_pdf' ? 'destructive' : 'outline'}>
                        {emailStatusBadgeLabel(t, report.emailStatus)}
                      </Badge>
                    ) : (
                      <Badge variant='outline'>{emailStatusBadgeLabel(t, null)}</Badge>
                    )}
                  </div>
                  {(report.emailTo || report.emailSentAt || report.emailError) && (
                    <div className='rounded-md border bg-muted/40 p-3 text-sm'>
                      {report.emailTo ? (
                        <p>
                          <span className='text-muted-foreground'>{t('reports:lastTargetLabel')} </span>
                          {report.emailTo}
                        </p>
                      ) : null}
                      {report.emailSentAt ? (
                        <p>
                          <span className='text-muted-foreground'>{t('reports:lastAttemptLabel')} </span>
                          {formatDate(report.emailSentAt)}
                        </p>
                      ) : null}
                      {report.emailError ? (
                        <p className='mt-1 text-destructive'>
                          <span className='font-medium'>{t('reports:errorLabel')} </span>
                          {report.emailError}
                        </p>
                      ) : null}
                    </div>
                  )}
                  {report.error ? (
                    <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm'>{report.error}</div>
                  ) : null}
                  <div className='flex flex-wrap gap-2'>
                    {pdfBase64 && report.status === 'completed' ? (
                      <Button
                        type='button'
                        variant='secondary'
                        size='sm'
                        onClick={() => downloadPdfBase64(pdfBase64, `guild-report-${report.id}.pdf`)}
                      >
                        {t('reports:downloadPdfButton')}
                      </Button>
                    ) : null}
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={!canResendMail || resendEmailMutation.isPending}
                      onClick={() => resendEmailMutation.mutate(report.id)}
                    >
                      {resendEmailMutation.isPending ? (
                        <Loader2 className='mr-2 size-4 animate-spin' />
                      ) : (
                        <Send className='mr-2 size-4' />
                      )}
                      {t('reports:resendEmailButton')}
                    </Button>
                  </div>
                  <pre className='max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs'>{text}</pre>
                </CardContent>
              </Card>
            )
          })}
          {(reportsQuery.data ?? []).length === 0 && (
            <Card>
              <CardContent className='py-8 text-center text-muted-foreground'>{t('reports:emptyState')}</CardContent>
            </Card>
          )}
        </div>
      </Main>
    </>
  )
}
