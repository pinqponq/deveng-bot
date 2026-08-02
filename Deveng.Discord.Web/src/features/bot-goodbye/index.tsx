import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { goodbyeApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save, Pencil, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageLanguageFlag } from '@/components/message-language-flag'
import { MESSAGE_LANGUAGES } from '@/lib/message-languages'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import type { DiscordChannel } from '@/lib/api/discord'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import {
  createEmbedSchema,
  createEmptyEmbedValues,
  defaultEmbedFieldNames,
  EmbedFormSection,
  toEmbedApiPayload,
  fromEmbedApiDto,
  EMBED_DESCRIPTION_INSERT_TAGS,
} from '@/components/embed-editor'

const GOODBYE_DEFAULT_LANGUAGE = 'tr'
const embedFields = defaultEmbedFieldNames

const goodbyeFormSchema = z
  .object({
    guildId: z.string().min(1, 'Guild ID gerekli'),
    channelId: z.string().min(1, 'Channel ID gerekli'),
    message: z.string().optional(),
    language: z.string(),
    enabled: z.boolean(),
  })
  .merge(createEmbedSchema(embedFields))
  .superRefine((data, ctx) => {
    if (!data.isEmbed && !String(data.message ?? '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['message'],
        message: 'Mesaj gerekli',
      })
    }
  })


export function BotGoodbye() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>('list')
  const [selectedLanguage, setSelectedLanguage] = React.useState(GOODBYE_DEFAULT_LANGUAGE)

  const { t } = useTranslation()
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'goodbye', featureDisplayName: t('nav:goodbye') })

  const form = useForm<any>({
    resolver: zodResolver(goodbyeFormSchema),
    defaultValues: {
      guildId: guildId,
      channelId: '',
      message: '',
      language: GOODBYE_DEFAULT_LANGUAGE,
      enabled: true,
      ...createEmptyEmbedValues('embed'),
      isEmbed: false,
    } ,
  })

  // Form'u guildId değiştiğinde güncelle
  React.useEffect(() => {
    if (guildId) {
      form.setValue('guildId', guildId)
    }
  }, [guildId, form])

  React.useEffect(() => {
    setMode('list')
  }, [guildId])

  const { data: goodbyeData, isLoading } = useQuery({
    queryKey: ['goodbye', guildId, selectedLanguage],
    queryFn: () => goodbyeApi.getByGuildId(guildId, selectedLanguage),
    enabled: !!guildId,
  })

  // Kanalları getir
  React.useEffect(() => {
    const fetchChannels = async () => {
      if (!guildId) return
      setChannelsLoading(true)
      try {
        const data = await discordApi.getChannels(guildId)
        const sortedChannels = [...data.channels].sort((a, b) => a.position - b.position)
        setChannels(sortedChannels)
      } catch (error) {
        console.error('Kanal listesi alınamadı:', error)
        toast.error(t('common:channelsLoadError'))
      } finally {
        setChannelsLoading(false)
      }
    }
    fetchChannels()
  }, [guildId])

  React.useEffect(() => {
    if (goodbyeData) {
      form.reset({
        guildId: goodbyeData.guildId,
        channelId: goodbyeData.channelId,
        message: goodbyeData.message,
        language: goodbyeData.language,
        enabled: goodbyeData.enabled,
        ...fromEmbedApiDto(goodbyeData as unknown as Record<string, unknown>, 'embed'),
      })
    } else {
      form.reset({
        guildId,
        channelId: '',
        message: '',
        language: selectedLanguage,
        enabled: true,
        ...createEmptyEmbedValues('embed'),
      isEmbed: false,
      })
    }
  }, [goodbyeData, form, guildId, selectedLanguage])

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      goodbyeApi.update(guildId, {
        channelId: data.channelId,
        message: data.isEmbed ? '' : (data.message || ''),
        language: data.language,
        enabled: data.enabled,
        embedSettings: toEmbedApiPayload(data, embedFields),
      }),
    onSuccess: (_updatedGoodbye, variables) => {
      setSelectedLanguage(variables.language)
      toast.success(t('goodbye:updated'))
      queryClient.invalidateQueries({ queryKey: ['goodbye', guildId] })
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      goodbyeApi.create({
        guildId: data.guildId,
        channelId: data.channelId,
        message: data.isEmbed ? '' : (data.message || ''),
        language: data.language,
        enabled: data.enabled,
        embedSettings: toEmbedApiPayload(data, embedFields),
      }),
    onSuccess: (_createdGoodbye, variables) => {
      setSelectedLanguage(variables.language)
      toast.success(t('goodbye:created'))
      queryClient.invalidateQueries({ queryKey: ['goodbye', guildId] })
      setMode('list')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:anErrorOccurred'))
    },
  })

  const onSubmit = (data: any) => {
    if (goodbyeData) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  if (isLoading) {
    return (
      <>
        <Main>
          <div className='flex items-center justify-center min-h-[60vh]'>
            <Loader2 className='size-8 animate-spin' />
          </div>
        </Main>
      </>
    )
  }

  return renderFeatureGate(
    <>
      <Main>
        <div className='space-y-6'>
          {/* Başlık Bölümü - MEE6 Tarzı */}
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>
                {t('goodbye:pageTitle')}
              </h1>
              <p className='text-lg text-muted-foreground'>
                {t('goodbye:pageDescription')}
              </p>
            </div>
            <FeatureDisableButton
              guildId={guildId}
              featureName='goodbye'
              featureDisplayName={t('goodbye:pageTitle')}
              confirmDescription={t('goodbye:disableConfirmDescription')}
            />
          </div>

          {mode === 'list' && (
          <Card className='border shadow-sm'>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <CardTitle className='text-base'>{t('goodbye:currentConfigTitle')}</CardTitle>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Select
                    value={selectedLanguage}
                    onValueChange={(value) => {
                      setSelectedLanguage(value)
                      form.setValue('language', value)
                    }}
                  >
                    <SelectTrigger className='h-10 w-full sm:w-[190px]'>
                      <SelectValue placeholder={t('goodbye:languagePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {MESSAGE_LANGUAGES.map(({ code, label }) => (
                        <SelectItem key={code} value={code}>
                          <span className='flex items-center gap-2'>
                            <MessageLanguageFlag languageCode={code} />
                            <span>{label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type='button' variant='outline' onClick={() => setMode(goodbyeData ? 'edit' : 'create')}>
                    {goodbyeData ? <Pencil className='mr-2 size-4' /> : null}
                    {goodbyeData ? t('goodbye:editButton') : t('goodbye:createButton')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {goodbyeData ? (
                <p className='text-sm text-muted-foreground'>
                  {t('goodbye:channelLabel')} <span className='font-medium'>{channels.find((c) => c.id === goodbyeData.channelId)?.name || goodbyeData.channelId}</span>
                </p>
              ) : (
                <p className='text-sm text-muted-foreground'>{t('goodbye:emptyState')}</p>
              )}
            </CardContent>
          </Card>
          )}

          {mode !== 'list' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <div className='flex justify-end'>
                <Button type='button' variant='ghost' className='h-8 px-2' onClick={() => setMode('list')}>
                  <X className='mr-1 size-4' />
                  {t('goodbye:closeButton')}
                </Button>
              </div>
              <div className='space-y-6'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('goodbye:generalSettingsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <FormField
                        control={form.control}
                        name='channelId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('goodbye:channelSelectLabel')}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                disabled={channelsLoading}
                              >
                                <SelectTrigger className='h-11 w-full'>
                                  <SelectValue placeholder={channelsLoading ? t('goodbye:channelsLoading') : t('goodbye:channelSelectPlaceholder')}>
                                    {field.value && channels.find((c) => c.id === field.value) && (
                                      <div className='flex items-center gap-2'>
                                        <span className='text-lg'>#</span>
                                        <span>{channels.find((c) => c.id === field.value)?.name}</span>
                                        {channels.find((c) => c.id === field.value)?.nsfw && (
                                          <span className='text-xs text-muted-foreground'>(NSFW)</span>
                                        )}
                                      </div>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SearchableSelectContent
                                  items={channels.map((c) => ({
                                    value: c.id,
                                    label: c.nsfw ? `# ${c.name} (NSFW)` : `# ${c.name}`,
                                  }))}
                                  searchPlaceholder={t('goodbye:channelSearchPlaceholder')}
                                  loading={channelsLoading}
                                />
                              </Select>
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('goodbye:channelSelectDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='message'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('goodbye:messageLabel')}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                className='min-h-[100px]'
                                placeholder={t('goodbye:messagePlaceholder')}
                                rows={4}
                                disabled={form.watch('isEmbed')}
                              />
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {form.watch('isEmbed')
                                ? t('goodbye:messageDescriptionEmbed')
                                : t('goodbye:messageDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='language'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('goodbye:languageLabel')}</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value)
                                setSelectedLanguage(value)
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className='h-11'>
                                  <SelectValue placeholder={t('goodbye:languagePlaceholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {MESSAGE_LANGUAGES.map(({ code, label }) => (
                                  <SelectItem key={code} value={code}>
                                    <span className='flex items-center gap-2'>
                                      <MessageLanguageFlag languageCode={code} />
                                      <span>{label}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription className='text-sm'>
                              {t('goodbye:languageDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </CardContent>
                  </Card>

                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('goodbye:embedSettingsTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <EmbedFormSection
                        control={form.control}
                        watch={form.watch}
                        fieldNames={embedFields}
                        showMessage={false}
                        descriptionTags={EMBED_DESCRIPTION_INSERT_TAGS}
                      />
                    </CardContent>
                  </Card>
              </div>

              <div className='flex justify-end gap-4 pt-4 border-t'>
                <Button
                  type='submit'
                  size='lg'
                  className='min-w-[140px] h-11 text-base font-semibold'
                  disabled={updateMutation.isPending || createMutation.isPending}
                >
                  {(updateMutation.isPending || createMutation.isPending) && (
                    <Loader2 className='mr-2 size-4 animate-spin' />
                  )}
                  <Save className='mr-2 size-4' />
                  {goodbyeData ? t('goodbye:updateButton') : t('goodbye:createButton')}
                </Button>
              </div>
            </form>
          </Form>
          )}
        </div>
      </Main>
    </>
  )
}

