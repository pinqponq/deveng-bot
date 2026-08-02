import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { localeApi, type UpsertGuildLocaleDto } from '@/lib/api'
import { MESSAGE_LANGUAGES } from '@/lib/message-languages'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save } from 'lucide-react'

const DEFAULT_LOCALE = 'tr'

export function BotLocale() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const queryClient = useQueryClient()
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'locale', featureDisplayName: t('locale:featureDisplayName') })
  const [form, setForm] = React.useState<UpsertGuildLocaleDto>({ defaultLocale: DEFAULT_LOCALE, fallbackLocale: DEFAULT_LOCALE })

  const localeQuery = useQuery({
    queryKey: ['guild-locale', guildId],
    queryFn: () => localeApi.get(guildId),
    enabled: !!guildId,
  })

  React.useEffect(() => {
    if (localeQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        defaultLocale: localeQuery.data.defaultLocale || DEFAULT_LOCALE,
        fallbackLocale: localeQuery.data.fallbackLocale || DEFAULT_LOCALE,
      })
    } else if (localeQuery.isSuccess) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({ defaultLocale: DEFAULT_LOCALE, fallbackLocale: DEFAULT_LOCALE })
    }
  }, [localeQuery.data, localeQuery.isSuccess])

  const saveMutation = useMutation({
    mutationFn: (payload: UpsertGuildLocaleDto) => localeApi.upsert(guildId, payload),
    onSuccess: async () => {
      toast.success(t('locale:saved'))
      await queryClient.invalidateQueries({ queryKey: ['guild-locale', guildId] })
    },
    onError: () => toast.error(t('locale:saveFailed')),
  })

  if (localeQuery.isLoading) {
    return <><Main><div className='flex min-h-[60vh] items-center justify-center'><Loader2 className='size-8 animate-spin' /></div></Main></>
  }

  const defaultLanguage = MESSAGE_LANGUAGES.find((language) => language.code === form.defaultLocale)
  const fallbackLanguage = MESSAGE_LANGUAGES.find((language) => language.code === form.fallbackLocale)

  return renderFeatureGate(
    <>
      
      <Main>
        <div className='mb-6 flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('locale:pageTitle')}</h1>
          </div>
          <FeatureDisableButton guildId={guildId} featureName='locale' featureDisplayName={t('locale:featureDisplayName')} confirmDescription={t('locale:confirmDescription')} />
        </div>

        <div className='grid gap-4 lg:grid-cols-[1fr_360px]'>
          <Card>
            <CardHeader>
              <CardTitle>{t('locale:settingsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label>{t('locale:defaultLanguageLabel')}</Label>
                  <Select value={form.defaultLocale} onValueChange={(value) => setForm((current) => ({ ...current, defaultLocale: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESSAGE_LANGUAGES.map((language) => <SelectItem key={language.code} value={language.code}>{language.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className='grid gap-2'>
                  <Label>{t('locale:fallbackLanguageLabel')}</Label>
                  <Select value={form.fallbackLocale} onValueChange={(value) => setForm((current) => ({ ...current, fallbackLocale: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESSAGE_LANGUAGES.map((language) => <SelectItem key={language.code} value={language.code}>{language.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate(form)} disabled={!guildId || saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />}
                {t('locale:save')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('locale:summaryTitle')}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 text-sm'>
              <div className='flex items-center justify-between'><span>{t('locale:summaryDefault')}</span><Badge>{defaultLanguage?.label ?? form.defaultLocale}</Badge></div>
              <div className='flex items-center justify-between'><span>{t('locale:summaryFallback')}</span><Badge variant='secondary'>{fallbackLanguage?.label ?? form.fallbackLocale}</Badge></div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
