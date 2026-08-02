import './loadEnv';
import { initLogger } from './utils/logger';
initLogger();

import path from 'path';
import { ShardingManager } from 'discord.js';

async function main(): Promise<void> {
  const useSharding = process.env.USE_SHARDING === 'true';
  if (useSharding) {
    const token = process.env.BOT_TOKEN?.trim();
    if (!token) {
      console.error('[FATAL] USE_SHARDING=true için BOT_TOKEN zorunlu');
      process.exit(1);
    }
    const runningTsDirectly = __filename.endsWith('.ts');
    const entryFile = path.join(__dirname, runningTsDirectly ? 'botEntry.ts' : 'botEntry.js');
    const rawTotal = (process.env.SHARD_TOTAL ?? 'auto').trim();
    const totalShards =
      rawTotal === '' || rawTotal === 'auto' ? 'auto' : parseInt(rawTotal, 10);
    if (typeof totalShards === 'number' && (!Number.isFinite(totalShards) || totalShards < 1)) {
      console.error('[FATAL] SHARD_TOTAL sayısal ve >= 1 veya auto olmalı');
      process.exit(1);
    }

    const manager = new ShardingManager(entryFile, {
      token,
      totalShards,
      ...(runningTsDirectly ? { execArgv: ['-r', 'ts-node/register'] as string[] } : {}),
    });

    manager.on('shardCreate', (shard) => {
      console.log(`[Sharding] Shard ${shard.id} oluşturuldu`);
    });

    // Ebeveyn süreç kapatma sinyalini shard child'larına iletir.
    const shutdownParent = (signal: string) => {
      console.log(`[Sharding] Kapatma sinyali alındı (${signal}); shard'lar durduruluyor...`);
      for (const shard of manager.shards.values()) {
        try {
          if (shard.process) shard.process.kill('SIGTERM');
          else shard.worker?.terminate();
        } catch (error) {
          console.error(`[Sharding] Shard ${shard.id} durdurulamadı:`, error);
        }
      }
      // Shard'ların graceful kapanması için kısa süre tanı, sonra çık.
      setTimeout(() => process.exit(0), 8000).unref();
    };
    process.once('SIGINT', () => shutdownParent('SIGINT'));
    process.once('SIGTERM', () => shutdownParent('SIGTERM'));

    await manager.spawn({
      delay: 5500,
      timeout: 120_000,
    });
    return;
  }

  const { startBot } = await import('./botEntry');
  await startBot();
}

main().catch((error: unknown) => {
  console.error('[FATAL] Bot başlatılamadı:', error);
  process.exit(1);
});
