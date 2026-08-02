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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ColorPicker } from '@/components/ui/color-picker'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { welcomeApi, discordApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Save, Pencil, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelectContent } from '@/components/searchable-select-content'
import { MessageLanguageFlag } from '@/components/message-language-flag'
import { MESSAGE_LANGUAGES } from '@/lib/message-languages'
import type { DiscordRole, DiscordChannel } from '@/lib/api/discord'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import {
  createEmbedSchema,
  createEmbedFieldNames,
  createEmptyEmbedValues,
  defaultEmbedFieldNames,
  EmbedFormSection,
  toEmbedApiPayload,
  fromEmbedApiDto,
  EMBED_DESCRIPTION_INSERT_TAGS,
} from '@/components/embed-editor'

const WELCOME_DEFAULT_LANGUAGE = 'tr'
const embedFields = defaultEmbedFieldNames
const dmEmbedFields = createEmbedFieldNames('dmEmbed', { isEmbed: 'isDMEmbed', message: 'dmMessage' })

const welcomeFormSchema = z
  .object({
    guildId: z.string().min(1, 'Guild ID gerekli'),
    channelId: z.string().min(1, 'Channel ID gerekli'),
    message: z.string().min(1, 'Mesaj gerekli'),
    language: z.string(),
    enabled: z.boolean().default(true),
    giveRole: z.boolean().default(false),
    roleId: z.string().optional(),
    sendWelcomeCard: z.boolean().default(false),
    cardTitle: z.string().optional(),
    cardUsernameText: z.string().optional(),
    cardMemberText: z.string().optional(),
    cardBackgroundColor1: z.string().optional(),
    cardBackgroundColor2: z.string().optional(),
    cardTextColor: z.string().optional(),
    cardBorderColor: z.string().optional(),
    sendDM: z.boolean().default(false),
    sendDMCard: z.boolean().default(false),
    dmCardTitle: z.string().optional(),
    dmCardUsernameText: z.string().optional(),
    dmCardMemberText: z.string().optional(),
    dmCardBackgroundColor1: z.string().optional(),
    dmCardBackgroundColor2: z.string().optional(),
    dmCardTextColor: z.string().optional(),
    dmCardBorderColor: z.string().optional(),
  })
  .merge(createEmbedSchema(embedFields))
  .merge(createEmbedSchema(dmEmbedFields))


export function BotWelcome() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [roles, setRoles] = React.useState<DiscordRole[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [channels, setChannels] = React.useState<DiscordChannel[]>([])
  const [channelsLoading, setChannelsLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>('list')
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = React.useState(WELCOME_DEFAULT_LANGUAGE)

  const { t } = useTranslation()
  const { renderFeatureGate } = useFeatureGate({ guildId, featureName: 'welcome', featureDisplayName: t('nav:welcome') })

  const form = useForm<any>({
    resolver: zodResolver(welcomeFormSchema) as any,
    defaultValues: {
      guildId: guildId,
      channelId: '',
      message: '',
      language: WELCOME_DEFAULT_LANGUAGE,
      enabled: true,
      giveRole: false,
      roleId: '',
      ...createEmptyEmbedValues('embed'),
      isEmbed: false,
      sendWelcomeCard: false,
      cardTitle: '',
      cardUsernameText: '',
      cardMemberText: '',
      cardBackgroundColor1: '',
      cardBackgroundColor2: '',
      cardTextColor: '',
      cardBorderColor: '',
      sendDM: false,
      ...createEmptyEmbedValues('dmEmbed', { isEmbed: 'isDMEmbed', message: 'dmMessage' }),
      isDMEmbed: false,
      sendDMCard: false,
      dmCardTitle: '',
      dmCardUsernameText: '',
      dmCardMemberText: '',
      dmCardBackgroundColor1: '',
      dmCardBackgroundColor2: '',
      dmCardTextColor: '',
      dmCardBorderColor: '',
    },
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

  const getErrorMessage = (error: any) => {
    const responseData = error?.response?.data
    if (typeof responseData === 'string' && responseData.trim().length > 0) {
      return responseData
    }
    if (typeof responseData?.message === 'string' && responseData.message.trim().length > 0) {
      return responseData.message
    }
    if (typeof error?.message === 'string' && error.message.trim().length > 0) {
      return error.message
    }
    return t('welcome:genericError')
  }

  // Mevcut welcome ayarlarını getir
  const { data: welcomeData, isLoading } = useQuery({
    queryKey: ['welcome', guildId, selectedLanguage],
    queryFn: () => welcomeApi.getByGuildId(guildId, selectedLanguage),
    enabled: !!guildId,
  })

  // Rolleri getir
  React.useEffect(() => {
    const fetchRoles = async () => {
      if (!guildId) return
      setRolesLoading(true)
      try {
        const data = await discordApi.getRoles(guildId)
        // Rolleri pozisyona göre sırala (yüksek pozisyon önce)
        const sortedRoles = [...data.roles].sort((a, b) => b.position - a.position)
        setRoles(sortedRoles)
      } catch (error) {
        console.error('Rol listesi alınamadı:', error)
        toast.error(t('common:rolesLoadError'))
      } finally {
        setRolesLoading(false)
      }
    }

    fetchRoles()
  }, [guildId])

  // Kanalları getir
  React.useEffect(() => {
    const fetchChannels = async () => {
      if (!guildId) return
      setChannelsLoading(true)
      try {
        const data = await discordApi.getChannels(guildId)
        // Kanalları pozisyona göre sırala
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

  // Discord renk kodunu hex'e çevir
  const getRoleColor = (color: number): string => {
    if (color === 0) return '#99AAB5' // Varsayılan Discord rengi
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`
  }

  // Form'u mevcut verilerle doldur
  React.useEffect(() => {
    if (welcomeData) {
      form.reset({
        guildId: welcomeData.guildId,
        channelId: welcomeData.channelId,
        message: welcomeData.message,
        language: welcomeData.language,
        enabled: welcomeData.enabled,
        giveRole: welcomeData.giveRole,
        roleId: welcomeData.roleId || '',
        ...fromEmbedApiDto(welcomeData as unknown as Record<string, unknown>, 'embed'),
        sendWelcomeCard: welcomeData.sendWelcomeCard,
        cardTitle: welcomeData.cardTitle || '',
        cardUsernameText: welcomeData.cardUsernameText || '',
        cardMemberText: welcomeData.cardMemberText || '',
        cardBackgroundColor1: welcomeData.cardBackgroundColor1 || '',
        cardBackgroundColor2: welcomeData.cardBackgroundColor2 || '',
        cardTextColor: welcomeData.cardTextColor || '',
        cardBorderColor: welcomeData.cardBorderColor || '',
        sendDM: welcomeData.sendDM,
        ...fromEmbedApiDto(welcomeData as unknown as Record<string, unknown>, 'dmEmbed', { isEmbed: 'isDMEmbed', message: 'dmMessage' }),
        sendDMCard: welcomeData.sendDMCard,
        dmCardTitle: welcomeData.dmCardTitle || '',
        dmCardUsernameText: welcomeData.dmCardUsernameText || '',
        dmCardMemberText: welcomeData.dmCardMemberText || '',
        dmCardBackgroundColor1: welcomeData.dmCardBackgroundColor1 || '',
        dmCardBackgroundColor2: welcomeData.dmCardBackgroundColor2 || '',
        dmCardTextColor: welcomeData.dmCardTextColor || '',
        dmCardBorderColor: welcomeData.dmCardBorderColor || '',
      })
    } else {
      form.reset({
        guildId,
        channelId: '',
        message: '',
        language: selectedLanguage,
        enabled: true,
        giveRole: false,
        roleId: '',
        ...createEmptyEmbedValues('embed'),
      isEmbed: false,
        sendWelcomeCard: false,
        cardTitle: '',
        cardUsernameText: '',
        cardMemberText: '',
        cardBackgroundColor1: '',
        cardBackgroundColor2: '',
        cardTextColor: '',
        cardBorderColor: '',
        sendDM: false,
        ...createEmptyEmbedValues('dmEmbed', { isEmbed: 'isDMEmbed', message: 'dmMessage' }),
        isDMEmbed: false,
        sendDMCard: false,
        dmCardTitle: '',
        dmCardUsernameText: '',
        dmCardMemberText: '',
        dmCardBackgroundColor1: '',
        dmCardBackgroundColor2: '',
        dmCardTextColor: '',
        dmCardBorderColor: '',
      })
    }
  }, [welcomeData, form, guildId, selectedLanguage])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      welcomeApi.update(guildId, {
        channelId: data.channelId,
        message: data.message,
        language: data.language,
        enabled: data.enabled,
        giveRole: data.giveRole,
        roleId: data.roleId || undefined,
        embedSettings: toEmbedApiPayload(data, embedFields),
        cardSettings: {
          sendWelcomeCard: data.sendWelcomeCard,
          cardTitle: data.cardTitle || undefined,
          cardUsernameText: data.cardUsernameText || undefined,
          cardMemberText: data.cardMemberText || undefined,
          cardBackgroundColor1: data.cardBackgroundColor1 || undefined,
          cardBackgroundColor2: data.cardBackgroundColor2 || undefined,
          cardTextColor: data.cardTextColor || undefined,
          cardBorderColor: data.cardBorderColor || undefined,
        },
        dmSettings: {
          sendDM: data.sendDM,
          dmMessage: data.sendDM && !data.isDMEmbed ? data.dmMessage || undefined : undefined,
        },
        dmEmbedSettings: {
          ...toEmbedApiPayload(data, dmEmbedFields),
          isDMEmbed: data.sendDM ? Boolean(data.isDMEmbed) : false,
        },
        dmCardSettings: {
          sendDMCard: data.sendDMCard,
          dmCardTitle: data.dmCardTitle || undefined,
          dmCardUsernameText: data.dmCardUsernameText || undefined,
          dmCardMemberText: data.dmCardMemberText || undefined,
          dmCardBackgroundColor1: data.dmCardBackgroundColor1 || undefined,
          dmCardBackgroundColor2: data.dmCardBackgroundColor2 || undefined,
          dmCardTextColor: data.dmCardTextColor || undefined,
          dmCardBorderColor: data.dmCardBorderColor || undefined,
        },
      }),
    onSuccess: (_updatedWelcome, variables) => {
      setSaveError(null)
      setSelectedLanguage(variables.language)
      toast.success(t('welcome:updated'))
      queryClient.invalidateQueries({ queryKey: ['welcome', guildId] })
      setMode('list')
    },
    onError: (error: any) => {
      const message = getErrorMessage(error)
      setSaveError(message)
      console.error('Welcome update error:', error)
      toast.error(message)
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) =>
      welcomeApi.create({
        guildId: data.guildId,
        channelId: data.channelId,
        message: data.message,
        language: data.language,
        enabled: data.enabled,
        giveRole: data.giveRole,
        roleId: data.roleId || undefined,
        embedSettings: toEmbedApiPayload(data, embedFields),
        cardSettings: {
          sendWelcomeCard: data.sendWelcomeCard,
          cardTitle: data.cardTitle || undefined,
          cardUsernameText: data.cardUsernameText || undefined,
          cardMemberText: data.cardMemberText || undefined,
          cardBackgroundColor1: data.cardBackgroundColor1 || undefined,
          cardBackgroundColor2: data.cardBackgroundColor2 || undefined,
          cardTextColor: data.cardTextColor || undefined,
          cardBorderColor: data.cardBorderColor || undefined,
        },
        dmSettings: {
          sendDM: data.sendDM,
          dmMessage: data.sendDM && !data.isDMEmbed ? data.dmMessage || undefined : undefined,
        },
        dmEmbedSettings: {
          ...toEmbedApiPayload(data, dmEmbedFields),
          isDMEmbed: data.sendDM ? Boolean(data.isDMEmbed) : false,
        },
        dmCardSettings: {
          sendDMCard: data.sendDMCard,
          dmCardTitle: data.dmCardTitle || undefined,
          dmCardUsernameText: data.dmCardUsernameText || undefined,
          dmCardMemberText: data.dmCardMemberText || undefined,
          dmCardBackgroundColor1: data.dmCardBackgroundColor1 || undefined,
          dmCardBackgroundColor2: data.dmCardBackgroundColor2 || undefined,
          dmCardTextColor: data.dmCardTextColor || undefined,
          dmCardBorderColor: data.dmCardBorderColor || undefined,
        },
      }),
    onSuccess: (_createdWelcome, variables) => {
      setSaveError(null)
      setSelectedLanguage(variables.language)
      toast.success(t('welcome:created'))
      queryClient.invalidateQueries({ queryKey: ['welcome', guildId] })
      setMode('list')
    },
    onError: (error: any) => {
      const message = getErrorMessage(error)
      setSaveError(message)
      console.error('Welcome create error:', error)
      toast.error(message)
    },
  })

  const onSubmit = (data: any) => {
    setSaveError(null)
    if (welcomeData) {
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
                {t('welcome:pageTitle')}
              </h1>
              <p className='text-lg text-muted-foreground'>
                {t('welcome:pageDescription')}
              </p>
            </div>
            <FeatureDisableButton
              guildId={guildId}
              featureName='welcome'
              featureDisplayName={t('welcome:pageTitle')}
              confirmDescription={t('welcome:disableConfirmDescription')}
            />
          </div>

          {mode === 'list' && (
          <Card className='border shadow-sm'>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <CardTitle className='text-base'>{t('welcome:currentConfig')}</CardTitle>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Select
                    value={selectedLanguage}
                    onValueChange={(value) => {
                      setSelectedLanguage(value)
                      form.setValue('language', value)
                      setSaveError(null)
                    }}
                  >
                    <SelectTrigger className='h-10 w-full sm:w-[190px]'>
                      <SelectValue placeholder={t('welcome:selectLanguagePlaceholder')} />
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
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setSaveError(null)
                      setMode(welcomeData ? 'edit' : 'create')
                    }}
                  >
                    {welcomeData ? <Pencil className='mr-2 size-4' /> : null}
                    {welcomeData ? t('welcome:edit') : t('welcome:create')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {welcomeData ? (
                <p className='text-sm text-muted-foreground'>
                  {t('welcome:channelLabel')} <span className='font-medium'>{channels.find((c) => c.id === welcomeData.channelId)?.name || welcomeData.channelId}</span>
                </p>
              ) : (
                <p className='text-sm text-muted-foreground'>{t('welcome:emptyState')}</p>
              )}
            </CardContent>
          </Card>
          )}

          {mode !== 'list' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='ghost'
                  className='h-8 px-2'
                  onClick={() => {
                    setSaveError(null)
                    setMode('list')
                  }}
                >
                  <X className='mr-1 size-4' />
                  {t('welcome:close')}
                </Button>
              </div>
              {saveError && (
                <Card className='border-destructive/30 bg-destructive/5'>
                  <CardContent className='pt-4 text-sm text-destructive'>
                    {t('welcome:saveErrorPrefix')} {saveError}
                  </CardContent>
                </Card>
              )}
              <div className='space-y-6'>

                {/* Genel Ayarlar */}
                <div className='space-y-6'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('welcome:generalSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <FormField
                        control={form.control}
                        name='channelId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('welcome:selectChannel')}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                disabled={channelsLoading}
                              >
                                <SelectTrigger className='h-11 w-full'>
                                  <SelectValue placeholder={channelsLoading ? t('welcome:channelsLoading') : t('welcome:selectChannelPlaceholder')}>
                                    {field.value && channels.find((c) => c.id === field.value) && (
                                      <div className='flex items-center gap-2'>
                                        <span className='text-lg'>#</span>
                                        <span>{channels.find((c) => c.id === field.value)?.name}</span>
                                      </div>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SearchableSelectContent
                                  className='max-h-[300px]'
                                  items={channels.map((c) => ({
                                    value: c.id,
                                    label: c.nsfw ? t('welcome:channelNsfwLabel', { name: c.name }) : `# ${c.name}`,
                                  }))}
                                  searchPlaceholder={t('welcome:searchChannelPlaceholder')}
                                  loading={channelsLoading}
                                />
                              </Select>
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('welcome:selectChannelDescription')}
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
                            <FormLabel className='text-base font-semibold'>{t('welcome:language')}</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value)
                                setSelectedLanguage(value)
                                setSaveError(null)
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className='h-11'>
                                  <SelectValue placeholder={t('welcome:selectLanguagePlaceholder')} />
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
                              {t('welcome:languageDescription')}
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
                            <FormLabel className='text-base font-semibold'>{t('welcome:welcomeMessage')}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={t('welcome:welcomeMessagePlaceholder')}
                                rows={5}
                                className='resize-none text-base'
                              />
                            </FormControl>
                            <FormDescription className='text-sm'>
                              {t('welcome:welcomeMessageDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className='space-y-4 pt-2'>
                        <FormField
                          control={form.control}
                          name='giveRole'
                          render={({ field }) => (
                            <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                              <div className='space-y-1 flex-1'>
                                <FormLabel className='text-base font-semibold'>{t('welcome:autoRole')}</FormLabel>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className='scale-110'
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch('giveRole') && (
                        <FormField
                          control={form.control}
                          name='roleId'
                          render={({ field }) => (
                            <FormItem className='pt-2'>
                              <FormLabel className='text-base font-semibold'>{t('welcome:selectRole')}</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value || ''}
                                  onValueChange={field.onChange}
                                  disabled={rolesLoading}
                                >
                                  <SelectTrigger className='h-11 w-full'>
                                    <SelectValue placeholder={rolesLoading ? t('welcome:rolesLoading') : t('welcome:selectRolePlaceholder')}>
                                      {field.value && roles.find((r) => r.id === field.value) && (
                                        <div className='flex items-center gap-2'>
                                          <div
                                            className='size-4 rounded-full border-2 border-background'
                                            style={{
                                              backgroundColor: getRoleColor(
                                                roles.find((r) => r.id === field.value)?.color || 0
                                              ),
                                            }}
                                          />
                                          <span>{roles.find((r) => r.id === field.value)?.name}</span>
                                        </div>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SearchableSelectContent
                                    className='max-h-[300px]'
                                    items={roles.map((r) => ({
                                      value: r.id,
                                      label: r.managed ? t('welcome:roleBotLabel', { name: r.name }) : r.name,
                                    }))}
                                    searchPlaceholder={t('welcome:searchRolePlaceholder')}
                                    loading={rolesLoading}
                                  />
                                </Select>
                              </FormControl>
                              <FormDescription className='text-sm'>
                                {t('welcome:selectRoleDescription')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Embed Ayarları */}
                <div className='space-y-6'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('welcome:embedSettings')}</CardTitle>
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

                {/* Kart Ayarları */}
                <div className='space-y-6'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('welcome:cardSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <FormField
                        control={form.control}
                        name='sendWelcomeCard'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                            <div className='space-y-1 flex-1'>
                              <FormLabel className='text-base font-semibold'>{t('welcome:sendWelcomeCard')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className='scale-110'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch('sendWelcomeCard') && (
                        <div className='space-y-5 pt-2'>
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                            <FormField
                              control={form.control}
                              name='cardTitle'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:cardTitle')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} className='h-11' placeholder={t('welcome:cardTitlePlaceholder')} />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:cardTitleDescription')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name='cardUsernameText'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:cardUsernameText')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} className='h-11' placeholder={t('welcome:cardUsernameTextPlaceholder')} />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:cardUsernameTextDescription')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name='cardMemberText'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-base font-semibold'>{t('welcome:cardMemberText')}</FormLabel>
                                <FormControl>
                                  <Input {...field} className='h-11' placeholder={t('welcome:cardMemberTextPlaceholder')} />
                                </FormControl>
                                <FormDescription className='text-sm'>
                                  {t('welcome:cardMemberTextDescription')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                            <FormField
                              control={form.control}
                              name='cardBackgroundColor1'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:cardBackgroundColor1')}</FormLabel>
                                  <FormControl>
                                    <ColorPicker
                                      value={field.value || '#5865F2'}
                                      onChange={field.onChange}
                                      placeholder='#5865F2'
                                    />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:gradientFirstColor')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name='cardBackgroundColor2'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:cardBackgroundColor2')}</FormLabel>
                                  <FormControl>
                                    <ColorPicker
                                      value={field.value || '#5865F2'}
                                      onChange={field.onChange}
                                      placeholder='#5865F2'
                                    />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:gradientSecondColor')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                            <FormField
                              control={form.control}
                              name='cardTextColor'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:cardTextColor')}</FormLabel>
                                  <FormControl>
                                    <ColorPicker
                                      value={field.value || '#FFFFFF'}
                                      onChange={field.onChange}
                                      placeholder='#FFFFFF'
                                    />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:cardTextColorDescription')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name='cardBorderColor'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:cardBorderColor')}</FormLabel>
                                  <FormControl>
                                    <ColorPicker
                                      value={field.value || '#5865F2'}
                                      onChange={field.onChange}
                                      placeholder='#5865F2'
                                    />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:cardBorderColorDescription')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* DM Ayarları */}
                <div className='space-y-6'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('welcome:dmSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <FormField
                        control={form.control}
                        name='sendDM'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                            <div className='space-y-1 flex-1'>
                              <FormLabel className='text-base font-semibold'>{t('welcome:sendDM')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className='scale-110'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch('sendDM') && (
                        <div className='space-y-4 pt-2'>
                          <FormItem>
                            <FormLabel className='text-base font-semibold'>{t('welcome:dmMessageType')}</FormLabel>
                            <Select
                              value={form.watch('isDMEmbed') ? 'embed' : 'message'}
                              onValueChange={(value) => {
                                const useEmbed = value === 'embed'
                                form.setValue('isDMEmbed', useEmbed)
                                if (useEmbed) {
                                  form.setValue('dmMessage', '')
                                } else {
                                  form.setValue('dmEmbedTitle', '')
                                  form.setValue('dmEmbedDescription', '')
                                  form.setValue('dmEmbedColor', '')
                                  form.setValue('dmEmbedThumbnail', '')
                                  form.setValue('dmEmbedImage', '')
                                  form.setValue('dmEmbedFooter', '')
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className='h-11'>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value='message'>{t('welcome:dmTypeMessage')}</SelectItem>
                                <SelectItem value='embed'>{t('welcome:dmTypeEmbed')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>

                          {!form.watch('isDMEmbed') && (
                            <FormField
                              control={form.control}
                              name='dmMessage'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:dmMessageContent')}</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      placeholder={t('welcome:dmMessageContentPlaceholder')}
                                      rows={5}
                                      className='resize-none text-base'
                                    />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:dmMessageContentDescription')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* DM Embed Ayarları */}
                {form.watch('sendDM') && form.watch('isDMEmbed') && (
                <div className='space-y-6'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('welcome:dmEmbedSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <EmbedFormSection
                        control={form.control}
                        watch={form.watch}
                        fieldNames={dmEmbedFields}
                        showMessage={false}
                        showIsEmbed={false}
                        descriptionTags={EMBED_DESCRIPTION_INSERT_TAGS}
                      />
                    </CardContent>
                  </Card>
                </div>
                )}

                {/* DM Kart Ayarları */}
                <div className='space-y-6'>
                  <Card className='border'>
                    <CardHeader className='pb-4'>
                      <CardTitle className='text-2xl'>{t('welcome:dmCardSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4 pt-2'>
                      <FormField
                        control={form.control}
                        name='sendDMCard'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-xl border-2 p-5 bg-muted/30 hover:bg-muted/50 transition-colors'>
                            <div className='space-y-1 flex-1'>
                              <FormLabel className='text-base font-semibold'>{t('welcome:sendDMCard')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className='scale-110'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch('sendDMCard') && (
                        <div className='space-y-5 pt-2'>
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                            <FormField
                              control={form.control}
                              name='dmCardTitle'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:dmCardTitle')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} className='h-11' placeholder={t('welcome:cardTitlePlaceholder')} />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:dmCardTitleDescription')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name='dmCardUsernameText'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:dmCardUsernameText')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} className='h-11' placeholder={t('welcome:cardUsernameTextPlaceholder')} />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:cardUsernameTextDescription')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name='dmCardMemberText'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-base font-semibold'>{t('welcome:dmCardMemberText')}</FormLabel>
                                <FormControl>
                                  <Input {...field} className='h-11' placeholder={t('welcome:cardMemberTextPlaceholder')} />
                                </FormControl>
                                <FormDescription className='text-sm'>
                                  {t('welcome:cardMemberTextDescription')}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                            <FormField
                              control={form.control}
                              name='dmCardBackgroundColor1'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:dmCardBackgroundColor1')}</FormLabel>
                                  <FormControl>
                                    <ColorPicker
                                      value={field.value || '#5865F2'}
                                      onChange={field.onChange}
                                      placeholder='#5865F2'
                                    />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:gradientFirstColor')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name='dmCardBackgroundColor2'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:dmCardBackgroundColor2')}</FormLabel>
                                  <FormControl>
                                    <ColorPicker
                                      value={field.value || '#5865F2'}
                                      onChange={field.onChange}
                                      placeholder='#5865F2'
                                    />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:gradientSecondColor')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                            <FormField
                              control={form.control}
                              name='dmCardTextColor'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:dmCardTextColor')}</FormLabel>
                                  <FormControl>
                                    <ColorPicker
                                      value={field.value || '#FFFFFF'}
                                      onChange={field.onChange}
                                      placeholder='#FFFFFF'
                                    />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:dmCardTextColorDescription')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name='dmCardBorderColor'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className='text-base font-semibold'>{t('welcome:dmCardBorderColor')}</FormLabel>
                                  <FormControl>
                                    <ColorPicker
                                      value={field.value || '#5865F2'}
                                      onChange={field.onChange}
                                      placeholder='#5865F2'
                                    />
                                  </FormControl>
                                  <FormDescription className='text-sm'>
                                    {t('welcome:dmCardBorderColorDescription')}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className='flex justify-end gap-4 pt-4 border-t'>
                <Button
                  type='submit'
                  size='lg'
                  className='min-w-[140px] h-11 text-base font-semibold'
                  disabled={updateMutation.isPending || createMutation.isPending}
                >
                  {(updateMutation.isPending || createMutation.isPending) && (
                    <Loader2 className='mr-2 size-5 animate-spin' />
                  )}
                  <Save className='mr-2 size-5' />
                  {welcomeData ? t('welcome:saveSettings') : t('welcome:create')}
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

