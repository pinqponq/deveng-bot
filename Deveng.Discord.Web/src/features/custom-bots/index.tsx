import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { customBotApi, type CreateCustomBotDto } from '@/lib/api'
import { DEFAULT_BOT_INVITE_PERMISSIONS } from '@/lib/discord-bot-invite-permissions'
import {
  Loader2,
  Play,
  Square,
  AlertCircle,
  ExternalLink,
  Bot,
  Shield,
  KeyRound,
  Hash,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CustomBotPersonalizerForm } from './components/personalizer-form'

export function CustomBots() {
  const { t } = useTranslation(['nav', 'dashboard', 'common', 'customBots'])
  const { auth } = useAuthStore()
  const userId = auth.user?.discord?.id || auth.user?.accountNo || ''
  const queryClient = useQueryClient()
  const [botToken, setBotToken] = useState('')
  const [clientId, setClientId] = useState('')
  const [botName, setBotName] = useState('')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')

  const { data: bots, isLoading } = useQuery({
    queryKey: ['customBots', userId],
    queryFn: () => customBotApi.getByOwnerId(userId),
  })

  const bot = bots?.[0]
  const hasBot = Boolean(bot)

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomBotDto) => customBotApi.create(data),
    onSuccess: async (newBot) => {
      queryClient.invalidateQueries({ queryKey: ['customBots'] })

      const inviteLink = generateInviteUrl(newBot.clientId)
      setInviteUrl(inviteLink)
      setInviteDialogOpen(true)

      setBotToken('')
      setClientId('')
      setBotName('')

      toast.success(t('customBots:createSuccess'))
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(
        t('customBots:createFailed') +
          ': ' +
          (error.response?.data?.message || error.message || t('common:anErrorOccurred'))
      )
    },
  })

  const startMutation = useMutation({
    mutationFn: (botData: {
      id: number
      botToken: string
      clientId: string
      ownerId: string
      botName?: string
    }) =>
      customBotApi.start(
        botData.id,
        botData.botToken,
        botData.clientId,
        botData.ownerId,
        botData.botName
      ),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customBots'] })

      try {
        localStorage.setItem('selectedBotClientId', variables.clientId)
      } catch {
        // ignore
      }

      setTimeout(async () => {
        try {
          const status = await customBotApi.getStatus(variables.id)
          if (status.status === 'Error' && status.errorMessage?.includes('sunucuda bulunmuyor')) {
            setInviteUrl(generateInviteUrl(variables.clientId))
            setInviteDialogOpen(true)
          } else if (status.status === 'Active') {
            toast.success(t('customBots:startSuccess'))
          }
        } catch {
          setInviteUrl(generateInviteUrl(variables.clientId))
          setInviteDialogOpen(true)
        }
      }, 2000)
    },
    onError: (error: { message?: string }) => {
      toast.error(t('customBots:startFailed') + ': ' + (error.message || t('common:anErrorOccurred')))
    },
  })

  const generateInviteUrl = (targetClientId: string): string => {
    return `https://discord.com/api/oauth2/authorize?client_id=${targetClientId}&permissions=${DEFAULT_BOT_INVITE_PERMISSIONS}&scope=bot%20applications.commands`
  }

  const stopMutation = useMutation({
    mutationFn: (id: number) => customBotApi.stop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customBots'] })

      try {
        localStorage.removeItem('selectedBotClientId')
      } catch {
        // ignore
      }

      toast.success(t('customBots:stopSuccess'))
    },
    onError: (error: { message?: string }) => {
      toast.error(t('customBots:stopFailed') + ': ' + (error.message || t('common:anErrorOccurred')))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customBotApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customBots'] })
      toast.success(t('customBots:deleteSuccess'))
    },
    onError: (error: { message?: string }) => {
      toast.error(t('customBots:deleteFailed') + ': ' + (error.message || t('common:anErrorOccurred')))
    },
  })

  const handleCreate = () => {
    if (!botToken || !clientId) {
      toast.error(t('customBots:tokenAndClientRequired'))
      return
    }

    createMutation.mutate({
      botToken,
      clientId,
      ownerId: userId,
      botName: botName || undefined,
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className='bg-green-500'>{t('common:active')}</Badge>
      case 'Inactive':
        return <Badge variant='secondary'>{t('common:inactive')}</Badge>
      case 'Error':
        return <Badge className='bg-red-500'>{t('common:error')}</Badge>
      default:
        return <Badge variant='secondary'>{status}</Badge>
    }
  }

  const openInviteDialog = (targetClientId: string) => {
    setInviteUrl(generateInviteUrl(targetClientId))
    setInviteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <Main>
        <div className='flex min-h-[60vh] items-center justify-center'>
          <Loader2 className='size-8 animate-spin' />
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <div className='space-y-6'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>{t('nav:customBots')}</h1>
          <p className='text-muted-foreground'>{t('dashboard:cardDescCustomBots')}</p>
        </div>

        {!hasBot ? (
          <div className='grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]'>
            <Card className='h-fit border-border/80'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-base'>{t('customBots:setupStepsTitle')}</CardTitle>
                <CardDescription>{t('customBots:setupStepsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className='flex gap-3'>
                    <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'>
                      {step}
                    </span>
                    <div className='space-y-0.5'>
                      <p className='text-sm font-medium leading-tight'>
                        {t(`customBots:setupStep${step}Title`)}
                      </p>
                      <p className='text-muted-foreground text-xs leading-relaxed'>
                        {t(`customBots:setupStep${step}Desc`)}
                      </p>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className='flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 dark:border-amber-900/50 dark:bg-amber-950/30'>
                  <Shield className='mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400' />
                  <p className='text-xs leading-relaxed text-amber-900 dark:text-amber-200'>
                    {t('customBots:tokenSecurityNote')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className='border'>
              <CardHeader className='pb-4'>
                <CardTitle className='flex items-center gap-2 text-xl'>
                  <span className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                    <Bot className='size-5' />
                  </span>
                  {t('customBots:createTitle')}
                </CardTitle>
                <CardDescription>{t('customBots:createDesc')}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-5'>
                <div className='space-y-2'>
                  <Label htmlFor='botToken' className='text-sm font-semibold'>
                    {t('customBots:botToken')} <span className='text-destructive'>*</span>
                  </Label>
                  <PasswordInput
                    id='botToken'
                    placeholder={t('customBots:botTokenPlaceholder')}
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className='h-11'
                    autoComplete='off'
                  />
                  <p className='text-muted-foreground text-xs'>{t('customBots:botTokenHint')}</p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='clientId' className='text-sm font-semibold'>
                    {t('customBots:clientId')} <span className='text-destructive'>*</span>
                  </Label>
                  <div className='relative'>
                    <Hash className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                    <Input
                      id='clientId'
                      placeholder={t('customBots:clientIdPlaceholder')}
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className='h-11 pl-9 font-mono text-sm'
                      inputMode='numeric'
                    />
                  </div>
                  <p className='text-muted-foreground text-xs'>{t('customBots:clientIdHint')}</p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='botName' className='text-sm font-semibold'>
                    {t('customBots:botName')}{' '}
                    <span className='text-muted-foreground font-normal'>({t('common:optional')})</span>
                  </Label>
                  <Input
                    id='botName'
                    placeholder={t('customBots:botNamePlaceholderCreate')}
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    className='h-11'
                  />
                </div>

                <Separator />

                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                    <KeyRound className='size-3.5 shrink-0' />
                    <span>{t('customBots:createFooterNote')}</span>
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending || !botToken.trim() || !clientId.trim()}
                    className='w-full sm:w-auto sm:min-w-40'
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className='mr-2 size-4 animate-spin' />
                        {t('customBots:creating')}
                      </>
                    ) : (
                      t('customBots:createButton')
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Bot className='size-5 text-primary' />
                  {t('customBots:yourBotTitle')}
                </CardTitle>
                <CardDescription>{t('customBots:yourBotDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {bot ? (
                  <div className='space-y-5'>
                    <div className='grid gap-3 sm:grid-cols-2'>
                      <div className='rounded-md border bg-muted/30 px-3 py-2.5'>
                        <p className='text-muted-foreground text-xs'>{t('customBots:botName')}</p>
                        <p className='mt-0.5 font-medium'>{bot.botName || `Bot #${bot.id}`}</p>
                      </div>
                      <div className='rounded-md border bg-muted/30 px-3 py-2.5'>
                        <p className='text-muted-foreground text-xs'>{t('customBots:clientId')}</p>
                        <p className='mt-0.5 font-mono text-sm'>{bot.clientId}</p>
                      </div>
                      <div className='rounded-md border bg-muted/30 px-3 py-2.5'>
                        <p className='text-muted-foreground text-xs'>{t('customBots:runtimeStatus')}</p>
                        <div className='mt-1 flex items-center gap-2'>
                          {getStatusBadge(bot.status)}
                          {bot.errorMessage && (
                            <span title={bot.errorMessage}>
                              <AlertCircle className='size-4 text-red-500' />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='rounded-md border bg-muted/30 px-3 py-2.5'>
                        <p className='text-muted-foreground text-xs'>{t('customBots:createdAt')}</p>
                        <p className='mt-0.5 font-medium'>
                          {new Date(bot.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {bot.errorMessage && (
                      <div className='rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive'>
                        {bot.errorMessage}
                      </div>
                    )}

                    {bot.errorMessage?.includes('sunucuda bulunmuyor') && (
                      <Button variant='outline' size='sm' onClick={() => openInviteDialog(bot.clientId)}>
                        <ExternalLink className='mr-1 size-3' />
                        {t('customBots:inviteToServer')}
                      </Button>
                    )}

                    <div className='flex flex-wrap items-center gap-2'>
                      {bot.status === 'Active' ? (
                        <>
                          <Button
                            variant='destructive'
                            size='sm'
                            onClick={() => stopMutation.mutate(bot.id)}
                            disabled={stopMutation.isPending}
                          >
                            <Square className='mr-1 size-3' />
                            {t('customBots:stop')}
                          </Button>
                          <Button
                            variant='destructive'
                            size='sm'
                            onClick={() => {
                              if (confirm(t('customBots:deleteConfirm'))) {
                                deleteMutation.mutate(bot.id)
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            {t('customBots:delete')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant='default'
                            size='sm'
                            onClick={() =>
                              startMutation.mutate({
                                id: bot.id,
                                botToken: bot.botToken,
                                clientId: bot.clientId,
                                ownerId: bot.ownerId,
                                botName: bot.botName,
                              })
                            }
                            disabled={startMutation.isPending}
                          >
                            <Play className='mr-1 size-3' />
                            {t('customBots:start')}
                          </Button>
                          {(bot.status === 'Inactive' || bot.status === 'Error') && (
                            <Button
                              variant='destructive'
                              size='sm'
                              onClick={() => {
                                if (confirm(t('customBots:deleteConfirm'))) {
                                  deleteMutation.mutate(bot.id)
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              {t('customBots:delete')}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {bot ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('customBots:personalizerTitle')}</CardTitle>
                  <CardDescription>{t('customBots:personalizerDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomBotPersonalizerForm bot={bot} />
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent className='sm:max-w-lg'>
            <DialogHeader>
              <DialogTitle>{t('customBots:inviteDialogTitle')}</DialogTitle>
              <DialogDescription>{t('customBots:inviteDialogDesc')}</DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div className='rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20'>
                <div className='flex items-start gap-2'>
                  <AlertCircle className='mt-0.5 size-5 shrink-0 text-yellow-600 dark:text-yellow-400' />
                  <div>
                    <p className='font-semibold text-yellow-800 dark:text-yellow-200'>
                      {t('customBots:inviteImportant')}
                    </p>
                    <p className='text-sm text-yellow-700 dark:text-yellow-300'>
                      {t('customBots:inviteImportantDesc')}
                    </p>
                  </div>
                </div>
              </div>
              <div className='space-y-2'>
                <Label>{t('customBots:inviteLink')}</Label>
                <Input value={inviteUrl} readOnly className='font-mono text-xs' />
                <div className='flex flex-col gap-2 sm:flex-row'>
                  <Button
                    variant='outline'
                    className='flex-1'
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl)
                      toast.success(t('customBots:inviteCopied'))
                    }}
                  >
                    {t('customBots:copy')}
                  </Button>
                  <Button variant='default' className='flex-1' onClick={() => window.open(inviteUrl, '_blank')}>
                    <ExternalLink className='mr-1 size-3' />
                    {t('customBots:openInDiscord')}
                  </Button>
                </div>
              </div>
              <p className='text-muted-foreground text-sm'>{t('customBots:inviteHelp')}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Main>
  )
}
