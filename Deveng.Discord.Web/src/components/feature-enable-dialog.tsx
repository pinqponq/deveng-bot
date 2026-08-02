import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useFeatureStatus } from '@/hooks/use-feature-status'
import { Loader2 } from 'lucide-react'

interface FeatureEnableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guildId: string
  featureName: string
  featureDisplayName: string
  onEnabled?: () => void
}

const featureDescriptions: Record<string, string> = {
  'birthday': 'Doğum günü özelliği ile sunucu üyelerinin doğum günlerini takip edebilir ve otomatik mesajlar gönderebilirsiniz.',
  'reminder': 'Hatırlatıcı özelliği ile kullanıcılar kendilerine hatırlatıcılar oluşturabilir.',
  'reaction-role': 'Tepki rol sistemi ile kullanıcılar emoji, buton veya menü ile roller alabilir.',
  'poll': 'Anket özelliği ile sunucunuzda anketler oluşturabilir ve sonuçları takip edebilirsiniz.',
  'embed-message': 'Gömülü mesaj özelliği ile özel embed mesajlar oluşturabilirsiniz.',
  'voice': 'Ses kanalı yönetimi özelliği ile geçici ses kanalları oluşturabilir ve yönetebilirsiniz.',
  'help': 'Yardım komutu özelliği ile özel yardım komutları oluşturabilirsiniz.',
  'ticket': 'Bilet paneli özelliği ile destek biletleri oluşturabilirsiniz.',
  'custom-command': 'Özel komutlar özelliği ile sunucunuz için kendi komutlarınızı oluşturabilir ve bot otomatik işlem yapabilir.',
  'level': 'Level sistemi ile üyeler mesajlaşarak XP kazanır ve seviye atlar.',
  'moderator': 'Moderatör özelliği ile otomatik moderasyon kuralları tanımlayabilirsiniz.',
  'log': 'Log kanalı ile sunucu olaylarını belirli bir kanala kaydedebilirsiniz.',
  'statistics': 'İstatistik kanalları ile üye sayısı vb. bilgileri otomatik güncelleyen kanallar oluşturabilirsiniz.',
  'giveaway': 'Çekiliş modülü ile ödül, süre ve kazanan sayısını belirleyerek otomatik çekilişler yönetebilirsiniz.',
  'music': 'Müzik modülü ile oynatma kuyruğu, geçmiş, beğeniler ve oynatıcı kontrollerini açabilirsiniz.',
  'auto-role': 'Otomatik rol modülü ile yeni üyelere gecikme, hesap yaşı ve rol hiyerarşisi kontrolleriyle rol verebilirsiniz.',
  'invite-leaderboard': 'Davet liderliği modülü ile invite snapshot, katkı geçmişi ve dönemsel leaderboard takip edebilirsiniz.',
  'scheduled-announcement': 'Zamanlanmış duyurular ile tekrarlı veya tek seferlik mesajları bot worker üzerinden gönderebilirsiniz.',
  'feed-announcement': 'Feed duyuruları ile RSS/Atom kaynaklarını takip edip yeni içerikleri Discord kanalına iletebilirsiniz.',
  'ai-moderation': 'AI moderasyon ile mesajları politika bazlı inceleme kuyruğuna alabilir ve karar akışını panelden yönetebilirsiniz.',
  'guild-report': 'Yönetim raporları ile sunucu özetlerini job olarak oluşturup rapor geçmişini takip edebilirsiniz.',
  'locale': 'Sunucu dili ile bot mesajlarının varsayılan ve fallback dilini guild bazında belirleyebilirsiniz.',
  'automation': 'Otomasyonlar ile tetikleyici, koşul ve aksiyonlardan oluşan kuralları oluşturup botun otomatik tepki vermesini sağlayabilirsiniz.',
  'moderation-logs': 'Moderasyon kayıtları ile aksiyon geçmişini, AI snapshotlarını ve teslim durumlarını filtreleyebilirsiniz.',
  'audit-logs': 'Denetim kayıtları ile panel değişikliklerinin actor, kaynak ve before/after diff bilgilerini görüntüleyebilirsiniz.',
}

export function FeatureEnableDialog({
  open,
  onOpenChange,
  guildId,
  featureName,
  featureDisplayName,
  onEnabled,
}: FeatureEnableDialogProps) {
  const { enable, isEnabling } = useFeatureStatus(guildId, featureName)

  const handleEnable = () => {
    enable(undefined, {
      onSuccess: () => {
        onEnabled?.()
        onOpenChange(false)
      },
    })
  }

  const description = featureDescriptions[featureName] || `${featureDisplayName} özelliğini etkinleştirmek istiyor musunuz?`

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Özelliği Etkinleştir</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            <br />
            <br />
            <strong>Not:</strong> Bu özellik etkinleştirildiğinde, ilgili komutlar Discord sunucunuzda görünür hale gelecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isEnabling}>İptal</AlertDialogCancel>
          <Button onClick={handleEnable} disabled={isEnabling}>
            {isEnabling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Etkinleştiriliyor...
              </>
            ) : (
              'Etkinleştir'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
