import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageSection } from '@/components/layout/page-section'
import { SectionNav } from '@/components/layout/section-nav'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { moderatorApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { FeatureDisableButton } from '@/components/feature-disable-button'
import { Loader2, Plus, Trash2 } from 'lucide-react'

const RULE_TYPE_VALUES = [
  'ForbiddenWords',
  'RepeatedText',
  'ServerInvites',
  'ExternalLinks',
  'ExcessiveCaps',
  'ExcessiveEmoji',
  'ExcessiveSpoiler',
  'ExcessiveMention',
  'Zalgo',
  'SpamProtection',
] as const

export function BotModerator() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const RULE_TYPES = React.useMemo(
    () => [
      {
        value: 'ForbiddenWords',
        label: t('moderator:ruleForbiddenWordsLabel'),
        description: t('moderator:ruleForbiddenWordsDescription'),
      },
      {
        value: 'RepeatedText',
        label: t('moderator:ruleRepeatedTextLabel'),
        description: t('moderator:ruleRepeatedTextDescription'),
      },
      {
        value: 'ServerInvites',
        label: t('moderator:ruleServerInvitesLabel'),
        description: t('moderator:ruleServerInvitesDescription'),
      },
      {
        value: 'ExternalLinks',
        label: t('moderator:ruleExternalLinksLabel'),
        description: t('moderator:ruleExternalLinksDescription'),
      },
      {
        value: 'ExcessiveCaps',
        label: t('moderator:ruleExcessiveCapsLabel'),
        description: t('moderator:ruleExcessiveCapsDescription'),
      },
      {
        value: 'ExcessiveEmoji',
        label: t('moderator:ruleExcessiveEmojiLabel'),
        description: t('moderator:ruleExcessiveEmojiDescription'),
      },
      {
        value: 'ExcessiveSpoiler',
        label: t('moderator:ruleExcessiveSpoilerLabel'),
        description: t('moderator:ruleExcessiveSpoilerDescription'),
      },
      {
        value: 'ExcessiveMention',
        label: t('moderator:ruleExcessiveMentionLabel'),
        description: t('moderator:ruleExcessiveMentionDescription'),
      },
      {
        value: 'Zalgo',
        label: t('moderator:ruleZalgoLabel'),
        description: t('moderator:ruleZalgoDescription'),
      },
      {
        value: 'SpamProtection',
        label: t('moderator:ruleSpamProtectionLabel'),
        description: t('moderator:ruleSpamProtectionDescription'),
      },
    ],
    [t]
  )

  const ACTION_OPTIONS = React.useMemo(
    () => [
      { value: 0, label: t('moderator:actionDisabled') },
      { value: 1, label: t('moderator:actionDeleteMessage') },
      { value: 2, label: t('moderator:actionWarnUser') },
      { value: 3, label: t('moderator:actionDeleteMessageAndWarnUser') },
    ],
    [t]
  )

  const { auth } = useAuthStore()
  const guildId = auth.selectedGuild?.id || ''
  const [newWord, setNewWord] = React.useState<string>('')

  const { renderFeatureGate, isFeatureEnabled, isFeatureLoading } = useFeatureGate({
    guildId,
    featureName: 'moderator',
    featureDisplayName: t('moderator:featureDisplayName'),
  })

  // Mevcut moderator ayarlarını getir (yalnızca sunucuda özellik açıkken; kapalıyken dışarıdaki etkinleştir diyaloğu yeterli)
  const { data: moderatorData, isLoading } = useQuery({
    queryKey: ['moderator', guildId],
    queryFn: () => moderatorApi.getByGuildId(guildId),
    enabled: !!guildId && isFeatureEnabled && !isFeatureLoading,
  })

  // Kural güncelleme
  const updateRuleMutation = useMutation({
    mutationFn: ({ ruleType, action }: { ruleType: string; action: number }) =>
      moderatorApi.updateRule(guildId, ruleType, { action }),
    onSuccess: () => {
      toast.success(t('moderator:ruleUpdated'))
      queryClient.invalidateQueries({ queryKey: ['moderator', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('moderator:genericError'))
    },
  })

  // Yasaklı kelime ekleme
  const addWordMutation = useMutation({
    mutationFn: async (words: string[]) => {
      // Tüm kelimeleri sırayla ekle
      const results = []
      for (const word of words) {
        try {
          const result = await moderatorApi.addForbiddenWord(guildId, { word: word.trim() })
          results.push(result)
        } catch (error: any) {
          // Bir kelime eklenemezse diğerlerini eklemeye devam et
          console.error(`Kelime eklenemedi: ${word}`, error)
        }
      }
      return results
    },
    onSuccess: (results, words) => {
      const successCount = results.length
      const totalCount = words.length
      if (successCount === totalCount) {
        toast.success(t('moderator:bannedWordsAdded', { count: successCount }))
      } else {
        toast.warning(t('moderator:bannedWordsPartialAdded', { success: successCount, total: totalCount }))
      }
      setNewWord('')
      queryClient.invalidateQueries({ queryKey: ['moderator', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('moderator:genericError'))
    },
  })

  // Yasaklı kelime silme
  const deleteWordMutation = useMutation({
    mutationFn: (wordId: number) => moderatorApi.deleteForbiddenWord(guildId, wordId),
    onSuccess: () => {
      toast.success(t('moderator:bannedWordDeleted'))
      queryClient.invalidateQueries({ queryKey: ['moderator', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('moderator:genericError'))
    },
  })

  // İlk oluşturma
  const createModeratorMutation = useMutation({
    mutationFn: () =>
      moderatorApi.createOrUpdate(guildId, {
        guildId,
        enabled: true,
        rules: RULE_TYPE_VALUES.map((value) => ({
          ruleType: value,
          action: 0,
          enabled: true,
        })),
      }),
    onSuccess: () => {
      toast.success(t('moderator:moderatorCreated'))
      queryClient.invalidateQueries({ queryKey: ['moderator', guildId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('moderator:genericError'))
    },
  })

  const handleRuleChange = (ruleType: string, action: number) => {
    updateRuleMutation.mutate({ ruleType, action })
  }

  const handleAddWord = () => {
    const trimmedWord = newWord.trim()
    if (!trimmedWord) {
      return
    }

    // Virgül, noktalı virgül veya yeni satır ile ayrılmış kelimeleri parse et
    const words = trimmedWord
      .split(/[,;\n]/)
      .map(word => word.trim())
      .filter(word => word.length > 0)

    if (words.length === 0) {
      toast.error(t('moderator:invalidWord'))
      return
    }

    // Tekrar eden kelimeleri kaldır
    const uniqueWords = Array.from(new Set(words))

    if (uniqueWords.length > 0) {
      addWordMutation.mutate(uniqueWords)
    }
  }

  const handleDeleteWord = (wordId: number) => {
    deleteWordMutation.mutate(wordId)
  }

  const getRuleAction = (ruleType: string): number => {
    const rule = moderatorData?.rules.find((r) => r.ruleType === ruleType)
    return rule?.action ?? 0
  }

  if (isFeatureLoading || isLoading) {
    return renderFeatureGate(
      <>
        <Main>
          <div className='flex items-center justify-center min-h-[60vh]'>
            <Loader2 className='size-8 animate-spin' />
          </div>
        </Main>
      </>
    )
  }

  if (!moderatorData) {
    return renderFeatureGate(
      <>
        <Main>
          <div className='space-y-6'>
            {/* Başlık Bölümü - MEE6 Tarzı */}
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>{t('moderator:pageTitle')}</h1>
              <p className='text-lg text-muted-foreground'>
                {t('moderator:pageDescription')}
              </p>
            </div>
            <Card className='border'>
              <CardHeader className='pb-4'>
                <CardTitle className='text-2xl'>{t('moderator:initCardTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => createModeratorMutation.mutate()}
                  disabled={createModeratorMutation.isPending}
                >
                  {createModeratorMutation.isPending ? (
                    <>
                      <Loader2 className='mr-2 size-4 animate-spin' />
                      {t('moderator:creating')}
                    </>
                  ) : (
                    t('moderator:createSetting')
                  )}
                </Button>
              </CardContent>
            </Card>
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
              <h1 className='text-2xl font-semibold tracking-tight'>{t('moderator:pageTitle')}</h1>
              <p className='text-lg text-muted-foreground'>
                {t('moderator:pageDescription')}
              </p>
            </div>
            <FeatureDisableButton
              guildId={guildId}
              featureName='moderator'
              featureDisplayName={t('moderator:featureDisplayName')}
              confirmDescription={t('moderator:disableConfirmDescription')}
            />
          </div>

          {/* Tab Yapısı */}
          <SectionNav
            items={[
              { id: 'rules', label: t('moderator:navRules') },
              { id: 'forbidden-words', label: t('moderator:navForbiddenWords') },
            ]}
          />

          <div className='space-y-8'>
            <PageSection id='rules'>
              <Card className='border'>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-2xl'>{t('moderator:rulesCardTitle')}</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {RULE_TYPES.map((ruleType) => (
                    <div
                      key={ruleType.value}
                      className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg'
                    >
                      <div className='space-y-1 flex-1 pr-4'>
                        <Label className='text-base font-semibold'>{ruleType.label}</Label>
                        <p className='text-sm text-muted-foreground'>{ruleType.description}</p>
                      </div>
                      <Select
                        value={getRuleAction(ruleType.value).toString()}
                        onValueChange={(value) =>
                          handleRuleChange(ruleType.value, parseInt(value))
                        }
                        disabled={updateRuleMutation.isPending}
                      >
                        <SelectTrigger className='w-full sm:w-[250px]'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </PageSection>

            <PageSection id='forbidden-words'>
              <Card className='border'>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-2xl'>{t('moderator:forbiddenWordsCardTitle')}</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='flex gap-2'>
                    <Input
                      placeholder={t('moderator:forbiddenWordInputPlaceholder')}
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddWord()
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddWord}
                      disabled={addWordMutation.isPending || !newWord.trim()}
                    >
                      {addWordMutation.isPending ? (
                        <Loader2 className='size-4 animate-spin' />
                      ) : (
                        <Plus className='size-4' />
                      )}
                    </Button>
                  </div>

                  <div className='space-y-2'>
                    {moderatorData.forbiddenWords.length === 0 ? (
                      <p className='text-sm text-muted-foreground'>
                        {t('moderator:noForbiddenWords')}
                      </p>
                    ) : (
                      moderatorData.forbiddenWords.map((word) => (
                        <div
                          key={word.id}
                          className='flex items-center justify-between p-3 border rounded-lg'
                        >
                          <span>{word.word}</span>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleDeleteWord(word.id)}
                            disabled={deleteWordMutation.isPending}
                          >
                            <Trash2 className='size-4 text-destructive' />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </PageSection>
          </div>
        </div>
      </Main>
    </>
  )
}

