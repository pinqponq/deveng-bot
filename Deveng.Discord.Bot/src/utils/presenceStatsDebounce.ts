/** Presence tetikli istatistik güncellemelerini tek süreçte birleştirir (100k+ guild burst için). */
const debounceMs = Math.max(
  30_000,
  Number.parseInt(process.env.PRESENCE_STATS_DEBOUNCE_MS || '120000', 10) || 120_000
);

const timers = new Map<string, NodeJS.Timeout>();

export function scheduleOnlineMemberStatRefresh(guildId: string): void {
  const prev = timers.get(guildId);
  if (prev) clearTimeout(prev);

  timers.set(
    guildId,
    setTimeout(() => {
      timers.delete(guildId);
      void (async () => {
        try {
          const { updateStatisticsChannelByType } = await import('./statisticsChannel.js');
          await updateStatisticsChannelByType(guildId, 'Çevrimiçi Üye');
        } catch (e) {
          console.error(`[WARN] Debounced istatistik güncellenemedi (Guild: ${guildId}):`, e);
        }
      })();
    }, debounceMs)
  );
}
