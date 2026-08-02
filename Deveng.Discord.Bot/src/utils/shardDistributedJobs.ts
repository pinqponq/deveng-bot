import type { Client } from 'discord.js';
import { checkAndEndExpiredPolls } from './pollSender';
import { customBotManager } from './customBotManager';

export async function runDistributedExpiredPollSweep(host: Client): Promise<void> {
  const skip = (guildId: string) => customBotManager.isGuildHandledByCustomBot(guildId);

  if (!host.shard) {
    await checkAndEndExpiredPolls(host, skip);
    return;
  }

  await host.shard.broadcastEval(async (inner: Client) => {
    const { checkAndEndExpiredPolls: sweep } = await import('./pollSender.js');
    const { customBotManager: cbm } = await import('./customBotManager.js');
    await sweep(inner, (gid) => cbm.isGuildHandledByCustomBot(gid));
  });
}

export async function runDistributedStatisticsSweep(host: Client): Promise<void> {
  const runner = async (inner: Client) => {
    const { updateAllStatisticsChannels } = await import('./statisticsChannel.js');
    const { customBotManager: cbm } = await import('./customBotManager.js');
    for (const guild of inner.guilds.cache.values()) {
      if (cbm.isGuildHandledByCustomBot(guild.id)) continue;
      await updateAllStatisticsChannels(guild.id);
    }
  };

  if (!host.shard) {
    await runner(host);
    return;
  }

  await host.shard.broadcastEval(runner as (c: Client) => Promise<void>);
}
