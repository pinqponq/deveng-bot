export const PUBLIC_DOC_GUIDES = [
  {
    slug: 'add-bot',
    title: 'Deveng Bot sunucuya nasıl eklenir?',
    summary: 'Discord davet bağlantısı ile botu sunucuya ekleyip gerekli izinleri onaylayın.',
    steps: [
      'Ana sayfadaki Discord’a ekle bağlantısını açın.',
      'Deveng Bot’un ekleneceği Discord sunucusunu seçin.',
      'İstenen izinleri inceleyin ve yetkilendirmeyi tamamlayın.',
      'Panelde Discord ile giriş yaparak sunucu ayarlarını açın.',
    ],
  },
  {
    slug: 'protect-server',
    title: 'Deveng Bot ile sunucu nasıl korunur?',
    summary: 'Moderasyon, log kanalı ve rol izinlerini birlikte yapılandırarak temel güvenlik katmanı kurun.',
    steps: [
      'Panelden sunucunuzu seçin ve Moderatör bölümünü açın.',
      'Yetkili ekip rollerini ve kullanılacak moderasyon ayarlarını belirleyin.',
      'Log Kanalı bölümünde olayların yazılacağı kanalı seçin.',
      'Rol ve kanal izinlerini Discord tarafında Deveng Bot’un erişebileceği şekilde doğrulayın.',
    ],
  },
  {
    slug: 'create-ticket-panel',
    title: 'Ticket paneli nasıl kurulur?',
    summary: 'Destek talepleri için kategori, ekip rolü ve panel mesajını tanımlayın.',
    steps: [
      'Ticket Panel bölümünü açın.',
      'Ticket kanallarının açılacağı kategoriyi ve destek ekibi rolünü seçin.',
      'Panel mesajı ve buton metinlerini yapılandırın.',
      'Ayarları kaydedip Discord kanalında panelin doğru göründüğünü kontrol edin.',
    ],
  },
  {
    slug: 'configure-reaction-roles',
    title: 'Tepki rolü nasıl yapılandırılır?',
    summary: 'Emoji, rol ve mesaj eşleştirmesi ile üyelerin kendi rollerini seçmesini sağlayın.',
    steps: [
      'Reaction Role bölümünü açın.',
      'Rol verilecek mesajı veya yeni panel mesajını belirleyin.',
      'Emoji ve rol eşleştirmelerini ekleyin.',
      'Kaydedip Discord üzerinde test kullanıcısıyla rol atamasını doğrulayın.',
    ],
  },
  {
    slug: 'automate-announcements',
    title: 'Feed ve zamanlanmış duyurular nasıl kurulur?',
    summary: 'RSS/Atom kaynakları ve planlı mesajlar için kanal, tekrar ve teslim geçmişini yapılandırın.',
    steps: [
      'Panelden Feed Duyuruları veya Zamanlanmış Duyurular bölümünü açın.',
      'Mesajın gönderileceği Discord kanalını seçin.',
      'Feed için kaynak URL ve kontrol aralığını, duyuru için tarih/saat ve tekrar bilgisini girin.',
      'Preview veya run history alanından bot teslim durumunu doğrulayın.',
    ],
  },
  {
    slug: 'audit-logs',
    title: 'Denetim kayıtları nasıl kullanılır?',
    summary: 'Panel değişikliklerini actor, aksiyon ve kaynak filtreleriyle izleyin.',
    steps: [
      'Denetim Kayıtları ekranında actor, aksiyon ve kaynak filtreleriyle değişiklikleri inceleyin.',
      'Before/after diff alanından hangi ayarın değiştiğini doğrulayın.',
      'Başarısız işlemleri result filtresiyle ayırıp gerekirse tekrar deneyin.',
    ],
  },
  {
    slug: 'ai-moderation',
    title: 'AI moderasyon nasıl yönetilir?',
    summary: 'Politika eşikleri ve inceleme kuyruğunu panelden yönetin.',
    steps: [
      'AI Moderasyon ekranında sample rate, hariç kanallar ve politika eşiklerini belirleyin.',
      'Review queue üzerinden mesaj kararlarını onaylayın veya reddedin.',
      'Gerekirse Ollama profili ile yerel model bağlantısını yapılandırın.',
    ],
  },
] as const
