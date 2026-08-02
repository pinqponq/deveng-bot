import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { guildFeatureApi } from '@/lib/api'
import { toast } from 'sonner'
import { SIDEBAR_TO_API_FEATURE_NAME } from './use-guild-features'

/** Sidebar featureName (örn. custom-command) -> API/DB'de kullanılan FeatureName (örn. CustomCommand) */
function toApiFeatureName(sidebarName: string): string {
  return SIDEBAR_TO_API_FEATURE_NAME[sidebarName] ?? sidebarName
}

export function useFeatureStatus(guildId: string, featureName: string) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const apiFeatureName = toApiFeatureName(featureName)
  const invalidatedForDisabledRef = useRef(false)

  // Özellik durumunu GuildFeatures tablosundan kontrol et (kayıt yoksa kapalı)
  const { data: isEnabled, isLoading } = useQuery({
    queryKey: ['feature-status', guildId, featureName],
    queryFn: () => guildFeatureApi.isEnabled(guildId, apiFeatureName),
    enabled: !!guildId && !!featureName,
    staleTime: 60000, // 1 dakika; gereksiz tekrar istekleri azaltır
    refetchOnWindowFocus: false,
  })

  // Status "kapalı" döndüğünde sidebar'ın guild-features listesini güncelle (yeşil nokta aynı kaynaktan güncellensin)
  useEffect(() => {
    if (!guildId || isLoading) return
    if (isEnabled === true) {
      invalidatedForDisabledRef.current = false
      return
    }
    if (isEnabled === false && !invalidatedForDisabledRef.current) {
      invalidatedForDisabledRef.current = true
      queryClient.invalidateQueries({ queryKey: ['guild-features', guildId] })
    }
  }, [guildId, isLoading, isEnabled, queryClient])

  // Özelliği etkinleştir -> GuildFeatures tablosuna kayıt eklenir/güncellenir
  const enableMutation = useMutation({
    mutationFn: async () => {
      await guildFeatureApi.enable(guildId, apiFeatureName)
      await guildFeatureApi.reloadCommands(guildId)
    },
    onSuccess: () => {
      // Cache'i optimistik güncelle; ekstra refetch isteği atma
      queryClient.setQueryData(['feature-status', guildId, featureName], true)
      queryClient.setQueryData(['guild-features', guildId], (old: { featureName: string; isEnabled: boolean }[] | undefined) => {
        const list = old ?? []
        const exists = list.some((f) => f.featureName === apiFeatureName)
        if (exists) return list.map((f) => (f.featureName === apiFeatureName ? { ...f, isEnabled: true } : f))
        return [...list, { featureName: apiFeatureName, isEnabled: true }]
      })
      toast.success(t('featureStatus:enabled'))
    },
    onError: (error: any) => {
      toast.error(t('featureStatus:enableFailed', { error: error.message || t('common:unknownError') }))
    },
  })

  // Özelliği devre dışı bırak
  const disableMutation = useMutation({
    mutationFn: async () => {
      await guildFeatureApi.disable(guildId, apiFeatureName)
      await guildFeatureApi.reloadCommands(guildId)
    },
    onSuccess: () => {
      queryClient.setQueryData(['feature-status', guildId, featureName], false)
      queryClient.setQueryData(['guild-features', guildId], (old: { featureName: string; isEnabled: boolean }[] | undefined) => {
        const list = old ?? []
        return list.map((f) => (f.featureName === apiFeatureName ? { ...f, isEnabled: false } : f))
      })
      toast.success(t('featureStatus:disabled'))
    },
    onError: (error: any) => {
      toast.error(t('featureStatus:disableFailed', { error: error.message || t('common:unknownError') }))
    },
  })

  return {
    isEnabled: isEnabled ?? false,
    isLoading,
    enable: enableMutation.mutate,
    disable: disableMutation.mutate,
    isEnabling: enableMutation.isPending,
    isDisabling: disableMutation.isPending,
  }
}
