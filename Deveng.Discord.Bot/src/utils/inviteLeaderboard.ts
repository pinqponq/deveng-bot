import { Guild, GuildMember, Invite } from 'discord.js';
import { apiRequest } from './apiClient';

interface InviteSnapshot {
  inviteCode: string;
  inviterId?: string | null;
  uses: number;
  channelId?: string | null;
  expiresAt?: string | null;
}

export async function syncGuildInviteSnapshots(guild: Guild): Promise<void> {
  const invites = await fetchGuildInvites(guild);
  for (const invite of invites) {
    await upsertSnapshot(guild.id, toSnapshot(invite));
  }
}

async function syncGuildsInvitePool(guilds: Guild[], concurrency: number): Promise<void> {
  const queue = [...guilds];
  const workers = Array.from({ length: Math.min(concurrency, Math.max(queue.length, 1)) }, async () => {
    while (queue.length > 0) {
      const guild = queue.shift();
      if (!guild) break;
      try {
        await syncGuildInviteSnapshots(guild);
      } catch (error) {
        console.warn(`[InviteLeaderboard] Snapshot senkronu atlandi (Guild: ${guild.id}):`, error);
      }
    }
  });
  await Promise.all(workers);
}

export async function syncAllInviteSnapshots(guilds: Guild[]): Promise<void> {
  await syncGuildsInvitePool(guilds, Math.min(6, Math.max(2, Number(process.env.INVITE_SNAPSHOT_CONCURRENCY || '5'))));
}

export async function trackInviteContribution(member: GuildMember): Promise<void> {
  try {
    const before = await apiRequest<InviteSnapshot[]>(`/api/InviteLeaderboard/guild/${member.guild.id}/snapshots`);
    const currentInvites = await fetchGuildInvites(member.guild);
    const usedInvite = currentInvites.find((invite) => {
      const old = before?.find((snapshot) => snapshot.inviteCode === invite.code);
      return old && (invite.uses ?? 0) > old.uses;
    });

    await apiRequest(`/api/InviteLeaderboard/guild/${member.guild.id}/contributions`, {
      method: 'POST',
      body: JSON.stringify({
        joinedUserId: member.user.id,
        inviterUserId: usedInvite?.inviter?.id ?? null,
        inviteCode: usedInvite?.code ?? null,
        sourceType: usedInvite ? 'invite' : 'unknown',
      }),
    });

    for (const invite of currentInvites) {
      await upsertSnapshot(member.guild.id, toSnapshot(invite));
    }
  } catch (error) {
    console.warn(`[InviteLeaderboard] Davet katkisi izlenemedi (Guild: ${member.guild.id}, User: ${member.user.id}):`, error);
  }
}

async function fetchGuildInvites(guild: Guild): Promise<Invite[]> {
  const invites = await guild.invites.fetch();
  return Array.from(invites.values());
}

async function upsertSnapshot(guildId: string, snapshot: InviteSnapshot): Promise<void> {
  await apiRequest(`/api/InviteLeaderboard/guild/${guildId}/snapshots`, {
    method: 'POST',
    body: JSON.stringify(snapshot),
  });
}

function toSnapshot(invite: Invite): InviteSnapshot {
  return {
    inviteCode: invite.code,
    inviterId: invite.inviter?.id ?? null,
    uses: invite.uses ?? 0,
    channelId: invite.channel?.id ?? null,
    expiresAt: invite.expiresTimestamp ? new Date(invite.expiresTimestamp).toISOString() : null,
  };
}
