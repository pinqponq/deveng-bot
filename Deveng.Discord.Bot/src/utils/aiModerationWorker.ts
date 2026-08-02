import type { Client } from 'discord.js';
import { customBotManager } from './customBotManager';
import {
  type AIModerationPolicyRow,
  type AIModerationQueueItem,
  type AIModerationSettings,
  completeAIModerationQueueWorker,
  createModerationActionLog,
  failAIModerationQueueItem,
  getAIModerationPolicies,
  getAIModerationSettings,
  getPendingAIModerationQueue,
} from './apiClient';
import { logError } from './logger';

type WorkerMode = 'main' | 'custom';

/** Custom bot: bu client üyesi olmayan sunucu satırlarını sessizce atla (ana bot veya doğru örnek işlesin). */
type ProcessOneOptions = { skipIfGuildNotVisible: boolean };

/** Panel kategori anahtarları ile uyumlu: toxicity, spam, sexual, violence, self_harm */
function collectKeywordSignals(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const signals: Record<string, number> = {
    toxicity: 0,
    spam: 0,
    sexual: 0,
    violence: 0,
    self_harm: 0,
  };
  if (/\b(fuck|shit|bitch|damn|asshole|bastard)\b/i.test(text)) {
    signals.toxicity = Math.max(signals.toxicity, 0.72);
  }
  if (/\b(anan|orospu|piç|salak|aptal|mal|gerizekalı)\b/i.test(text)) {
    signals.toxicity = Math.max(signals.toxicity, 0.78);
  }
  if (/(discord\.(gg|com\/invite)\/|nitro\s*free|free\s+nitro|steam\s*gift)/i.test(text)) {
    signals.spam = Math.max(signals.spam, 0.82);
  }
  if (/(https?:\/\/\S+\s+){2,}/i.test(text)) {
    signals.spam = Math.max(signals.spam, 0.64);
  }
  if (/\b(porn|xxx|nsfw|onlyfans|sex\s*tape)\b/i.test(lower)) {
    signals.sexual = Math.max(signals.sexual, 0.74);
  }
  // Şiddet: tek başına "kill" (oyun dili) yok; bağlam veya daha net ifadeler
  if (
    /\b(murder|manslaughter|mass\s*shoot|massacre|lynch(ing)?)\b/i.test(lower) ||
    /\b(stab(bed|bing)?|stabbing)\b/i.test(lower) ||
    /\b(shoot(ing|er)?|gunned\s+down)\b/i.test(lower) ||
    /\b(bomb(ing|er|s)?|detonate)\b/i.test(lower) ||
    /\b(şiddet|katliam|kan\s+dök|öldüreceğim|öldürürsün|infaz)\b/i.test(lower)
  ) {
    signals.violence = Math.max(signals.violence, 0.74);
  }
  if (
    /\b(kill\s+yourself|kys\b|die\s+already|hang\s+yourself|intihar|kendimi\s*öldür|hayatıma\s*son)\b/i.test(lower)
  ) {
    signals.self_harm = Math.max(signals.self_harm, 0.78);
  }
  return signals;
}

function signalForPolicyCategory(category: string, signals: Record<string, number>): number {
  const c = category.toLowerCase();
  if (c.includes('toxic') || c.includes('profanity') || c === 'toxicity') return signals.toxicity;
  if (c.includes('spam') || c.includes('scam') || c.includes('phish')) return signals.spam;
  if (c === 'sexual' || c.includes('nsfw') || c.includes('adult')) return signals.sexual;
  if (c === 'violence' || c.includes('gore')) return signals.violence;
  if (c === 'self_harm' || c.includes('harass') || c.includes('bully')) return signals.self_harm;
  return Math.max(signals.toxicity, signals.spam, signals.sexual, signals.violence, signals.self_harm);
}

function scoreFromPolicies(
  text: string,
  policies: AIModerationPolicyRow[],
): { score: number; matchedCategory: string | undefined; labels: Record<string, unknown> } {
  const signals = collectKeywordSignals(text);
  const enabled = policies.filter((p) => p.enabled);
  let bestScore = 0;
  let matchedCategory: string | undefined;
  for (const p of enabled) {
    const s = signalForPolicyCategory(p.category, signals);
    if (s > bestScore) {
      bestScore = s;
      matchedCategory = p.category;
    }
  }
  if (!matchedCategory) {
    const entries = Object.entries(signals).sort((a, b) => b[1] - a[1]);
    if (entries.length && entries[0][1] > 0) {
      matchedCategory = entries[0][0];
      bestScore = entries[0][1];
    }
  }
  return {
    score: bestScore,
    matchedCategory,
    labels: { keywordFallback: true, signals },
  };
}

function recommendedActionFor(score: number, settings: AIModerationSettings): string {
  const tl = Number(settings.thresholdLog ?? 0.5);
  const td = Number(settings.thresholdDelete ?? 0.85);
  const tt = Number(settings.thresholdTimeout ?? 0.95);
  if (score >= tt) return 'timeout';
  if (score >= td) return 'delete';
  if (score >= tl) return 'log';
  return 'none';
}

async function tryDeleteQueuedMessage(
  client: Client,
  channelId: string | null | undefined,
  messageId: string | null | undefined,
): Promise<'deleted' | 'skipped' | 'failed'> {
  if (!channelId || !messageId) return 'skipped';
  try {
    const ch = await client.channels.fetch(channelId).catch((error) => { logError('aiModerationWorker:fetchChannel', error, 'debug'); return null; });
    if (!ch || !ch.isTextBased()) return 'skipped';
    const msg = await ch.messages.fetch(messageId).catch((error) => { logError('aiModerationWorker:fetchMessage', error, 'debug'); return null; });
    if (!msg) return 'skipped';
    await msg.delete().catch((error) => logError('aiModerationWorker:deleteMessage', error, 'warn'));
    return 'deleted';
  } catch {
    return 'failed';
  }
}

async function processOne(client: Client, row: AIModerationQueueItem, opts: ProcessOneOptions): Promise<void> {
  const resolved =
    client.guilds.cache.get(row.guildId) ?? (await client.guilds.fetch(row.guildId).catch((error) => { logError('aiModerationWorker:fetchGuild', error, 'debug'); return null; }));
  if (!resolved) {
    if (opts.skipIfGuildNotVisible) return;
    await failAIModerationQueueItem(row.id, 'guild_not_found');
    return;
  }

  const settings = await getAIModerationSettings(resolved.id);
  if (!settings) {
    await failAIModerationQueueItem(row.id, 'settings_not_found');
    return;
  }
  if (!settings.enabled) {
    await failAIModerationQueueItem(row.id, 'settings_disabled');
    return;
  }

  const policies = await getAIModerationPolicies(row.guildId);
  const preview = row.contentPreviewRedacted ?? '';
  const { score, matchedCategory, labels } = scoreFromPolicies(preview, policies);
  const recommended = recommendedActionFor(score, settings);
  const mode = (settings.mode ?? 'log_only').toLowerCase();
  const td = Number(settings.thresholdDelete ?? 0.85);

  let applied = 'keyword_log';
  if (recommended === 'none') {
    applied = 'keyword_no_action';
  } else if (recommended === 'delete' && mode !== 'log_only' && score >= td) {
    const del = await tryDeleteQueuedMessage(client, row.channelId, row.messageId);
    if (del === 'deleted') {
      applied = 'keyword_delete';
      try {
        await createModerationActionLog({
          guildId: row.guildId,
          source: 'ai_keyword',
          ruleType: matchedCategory ?? 'ai_moderation',
          userIdHash: row.userIdHash ?? undefined,
          channelId: row.channelId ?? undefined,
          messageId: row.messageId ?? undefined,
          action: 'delete',
          actionStatus: 'applied',
          reasonKey: 'ai.keyword_fallback',
          reasonParamsJson: JSON.stringify({ score, category: matchedCategory ?? null, queueId: row.id }),
          scoreSnapshotJson: JSON.stringify({ score, matchedCategory }),
          actorType: 'system',
        });
      } catch (logErr) {
        console.warn(`[AIModerationWorker] Silme sonrası moderasyon logu yazılamadı (queue ${row.id}):`, logErr);
      }
    } else if (del === 'failed') applied = 'keyword_delete_failed';
    else applied = 'keyword_log';
  }

  const retentionDays = Math.min(365, Math.max(1, Number(settings.retentionDays ?? 14)));
  const expiresAt = new Date(Date.now() + retentionDays * 86_400_000).toISOString();

  const thresholdSnapshotJson = JSON.stringify({
    mode: settings.mode ?? 'log_only',
    thresholdLog: settings.thresholdLog ?? 0.5,
    thresholdDelete: settings.thresholdDelete ?? 0.85,
    thresholdTimeout: settings.thresholdTimeout ?? 0.95,
  });

  await completeAIModerationQueueWorker(row.id, {
    queueFinalStatus: 'completed',
    queueErrorCode: null,
    labelsJson: JSON.stringify(labels),
    matchedCategory: matchedCategory ?? null,
    score: score > 0 ? Math.round(score * 1000) / 1000 : null,
    thresholdSnapshotJson,
    provider: 'keyword-fallback',
    modelName: 'heuristic-v1',
    recommendedAction: recommended,
    appliedAction: applied,
    decisionReasonKey: 'ai.keyword_fallback',
    decisionReasonParamsJson: JSON.stringify({ score, category: matchedCategory ?? null }),
    expiresAt,
  });
}

export async function processAIModerationJobs(client: Client, mode: WorkerMode): Promise<void> {
  const items = await getPendingAIModerationQueue(40);
  const skipIfGuildNotVisible = mode === 'custom';
  for (const row of items) {
    if (mode === 'main' && customBotManager.isGuildHandledByCustomBot(row.guildId)) {
      continue;
    }
    try {
      await processOne(client, row, { skipIfGuildNotVisible });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      try {
        await failAIModerationQueueItem(row.id, msg.slice(0, 120));
      } catch (failErr) {
        console.error(`[AIModerationWorker] fail çağrısı başarısız queueId=${row.id}:`, failErr);
      }
    }
  }
}
