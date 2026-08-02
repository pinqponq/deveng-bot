/**
 * Periyodik (background) iş aralıkları — tümü ortam değişkeni ile ayarlanabilir.
 *
 * Amaç: "neden sürekli kontrol ediyoruz?" yükünü koda dokunmadan operasyonel olarak
 * düşürebilmek. Zaman-hassas olmayan işlerin (feed, zamanlanmış duyuru, rapor) aralığı
 * prod'da tek env değişkeni ile büyütülebilir; böylece DB/API/log baskısı azalır.
 *
 * Değerler saniye cinsinden okunur, milisaniye döner. Env yoksa/geçersizse varsayılan kullanılır.
 */

function readIntervalMs(envKey: string, defaultSeconds: number): number {
  const raw = process.env[envKey];
  const parsed = raw != null ? Number.parseInt(raw, 10) : Number.NaN;
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultSeconds;
  return seconds * 1000;
}

/** İş türü başına periyodik tarama aralığı (ms). */
export const JOB_INTERVALS = {
  statistics: readIntervalMs('JOB_INTERVAL_STATISTICS_SEC', 300),
  giveaways: readIntervalMs('JOB_INTERVAL_GIVEAWAYS_SEC', 60),
  polls: readIntervalMs('JOB_INTERVAL_POLLS_SEC', 60),
  birthdays: readIntervalMs('JOB_INTERVAL_BIRTHDAYS_SEC', 60),
  reminders: readIntervalMs('JOB_INTERVAL_REMINDERS_SEC', 60),
  feedAnnouncements: readIntervalMs('JOB_INTERVAL_FEED_SEC', 60),
  scheduledAnnouncements: readIntervalMs('JOB_INTERVAL_SCHEDULED_ANNOUNCEMENTS_SEC', 60),
  guildReports: readIntervalMs('JOB_INTERVAL_GUILD_REPORTS_SEC', 300),
  aiModeration: readIntervalMs('JOB_INTERVAL_AI_MODERATION_SEC', 45),
} as const;

/**
 * Bu iş türü .NET Scheduling Worker'a (RabbitMQ) devredildiyse, ana bot içindeki
 * periyodik sweep atlanır — böylece aynı işi iki sistem birden taramaz (çift tarama/log önleme).
 * Varsayılan: kapalı (mevcut davranış korunur). Yalnızca Worker aktifken açın.
 */
export function isJobOwnedByWorker(job: 'reminders' | 'polls'): boolean {
  const flag = job === 'reminders'
    ? process.env.SCHEDULING_WORKER_OWNS_REMINDERS
    : process.env.SCHEDULING_WORKER_OWNS_POLLS;
  return flag === 'true' || flag === '1';
}
