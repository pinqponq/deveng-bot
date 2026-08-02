/**
 * Bot tarafında kayıtlı slash komutlarla uyumlu özet liste (Deveng.Discord.Bot registerCommands).
 * Panel-only özellikler slash olarak listelenmez.
 */
export const PUBLIC_COMMAND_GROUPS = [
  {
    title: 'Başlangıç',
    description: 'Yardım ve panel kurulumu.',
    commands: [
      {
        name: '/help',
        description: 'Deveng Bot komutlarını ve yardım bağlantılarını listeler.',
        permissions: 'Herkes',
        parameters: 'Yok',
      },
      {
        name: 'Web paneli',
        description:
          'Sunucu ve modül ayarları (moderasyon, log, ticket, hoş geldin vb.) slash yerine kontrol panelinden yapılır.',
        permissions: 'Sunucu yönetimi',
        parameters: '—',
      },
    ],
  },
  {
    title: 'Anket ve hatırlatıcı',
    description: 'Oylama ve zamanlı hatırlatma.',
    commands: [
      {
        name: '/poll',
        description: 'Seçenekli anket oluşturur ve üyelerden oy toplar.',
        permissions: 'Mesaj yönetimi',
        parameters: 'Soru, seçenekler ve süre',
      },
      {
        name: '/poll-end',
        description: 'Açık anketi sonlandırır ve sonuç özeti üretir.',
        permissions: 'Mesaj yönetimi',
        parameters: 'Anket / kanal',
      },
      {
        name: '/hatirlatici',
        description: 'Hatırlatıcı oluşturur veya yönetir.',
        permissions: 'Komuta göre değişir',
        parameters: 'Tarih ve mesaj',
      },
    ],
  },
  {
    title: 'Tepki rolü ve gömülü mesaj',
    description: 'Emoji/buton tepkileri ve gömülü mesaj gönderimi.',
    commands: [
      {
        name: '/tepki-rol-ayarla',
        description: 'Tepki rolü yapılandırması için bot tarafı akışını başlatır.',
        permissions: 'Rol yönetimi',
        parameters: 'Kanal, metin/embed seçenekleri',
      },
      {
        name: '/tepki-sistem-gönder',
        description: 'Panelde ayarlanan tepki rolü mesajını kanala gönderir.',
        permissions: 'Rol / kanal yönetimi',
        parameters: 'Yok',
      },
      {
        name: '/gömülü-mesaj',
        description: 'Panelde tanımlı gömülü mesajı hedef kanala gönderir.',
        permissions: 'Mesaj yönetimi',
        parameters: 'Şablon adı, kanal, embed alanları',
      },
    ],
  },
  {
    title: 'Geçici ses kanalı',
    description: 'Geçici ses odası komutları (örnek).',
    commands: [
      {
        name: '/voice-lock',
        description: 'Geçici ses kanalını kilitler.',
        permissions: 'Kanal sahibi veya yetkili rol',
        parameters: 'Yok',
      },
      {
        name: '/voice-unlock',
        description: 'Geçici ses kilidini kaldırır.',
        permissions: 'Kanal sahibi veya yetkili rol',
        parameters: 'Yok',
      },
      {
        name: '/voice-limit',
        description: 'Geçici ses kanalının kullanıcı limitini ayarlar.',
        permissions: 'Kanal sahibi veya yetkili rol',
        parameters: 'Limit',
      },
    ],
  },
  {
    title: 'Doğum günü',
    description: 'Doğum günü kaydı ve kutlama.',
    commands: [
      {
        name: '/doğum-günü',
        description: 'Doğum günü kaydı veya kutlama akışını yönetir.',
        permissions: 'Herkes / sunucu politikası',
        parameters: 'Tarih veya alt komut',
      },
    ],
  },
  {
    title: 'Müzik',
    description: 'Oynatma ve kuyruk (örnek komutlar).',
    commands: [
      {
        name: '/music-play',
        description: 'Şarkı veya URL ile müzik oynatır.',
        permissions: 'Herkes (sunucu politikasına göre)',
        parameters: 'query, next',
      },
      {
        name: '/music-queue',
        description: 'Kuyruğu listeler.',
        permissions: 'Herkes',
        parameters: 'Yok',
      },
      {
        name: '/music-skip',
        description: 'Sıradaki şarkıya geçer.',
        permissions: 'Herkes (sunucu politikasına göre)',
        parameters: 'Yok',
      },
      {
        name: '/music-settings',
        description: 'Müzik ayarlarının özetini gösterir.',
        permissions: 'Herkes',
        parameters: 'Yok',
      },
    ],
  },
] as const
