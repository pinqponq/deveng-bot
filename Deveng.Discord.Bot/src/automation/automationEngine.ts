import type { ButtonInteraction, Message, MessageReaction, PartialMessage, PartialMessageReaction } from 'discord.js';
import { ChannelType, MessageFlags, ThreadAutoArchiveDuration } from 'discord.js';
import { getTextChannel } from '../utils/channelHelper';
import { addXpToUser, getGuildAutomationsCached, isFeatureEnabled } from '../utils/apiClient';
import { botCanAssignRole, describeRoleAssignBlock } from '../utils/roleAssignment';
import { logError } from '../utils/logger';
import type { AutomationDefinition, GuildAutomationApiRow } from './types';

const MAX_RULES_PER_EVENT = 15;

function parseDef(json: string): AutomationDefinition | null {
  try {
    const o = JSON.parse(json) as AutomationDefinition;
    if (!o?.trigger?.type) return null;
    if (!Array.isArray(o.conditions)) o.conditions = [];
    if (!Array.isArray(o.actions)) o.actions = [];
    return o;
  } catch {
    return null;
  }
}

function strIncludesAny(haystack: string, phrases: string[], ci: boolean): boolean {
  const h = ci ? haystack.toLowerCase() : haystack;
  return phrases.some((p) => {
    const q = (p || '').trim();
    if (!q) return false;
    return ci ? h.includes(q.toLowerCase()) : haystack.includes(q);
  });
}

function evalConditionsMessage(
  message: Message,
  conditions: AutomationDefinition['conditions']
): boolean {
  for (const c of conditions) {
    const p = c.params ?? {};
    switch (c.type) {
      case 'channel_in': {
        const ids = (p.channelIds as string[] | undefined) ?? [];
        if (ids.length === 0) return false;
        const ch = message.channel;
        const cid = ch.id;
        const parent =
          'parentId' in ch && ch.parentId != null ? String(ch.parentId) : null;
        if (!ids.includes(cid) && !(parent && ids.includes(parent))) return false;
        break;
      }
      case 'user_has_all_roles': {
        const roleIds = (p.roleIds as string[] | undefined) ?? [];
        if (!message.member || roleIds.length === 0) return false;
        if (!roleIds.every((rid) => message.member!.roles.cache.has(rid))) return false;
        break;
      }
      case 'user_has_one_role': {
        const roleIds = (p.roleIds as string[] | undefined) ?? [];
        if (!message.member || roleIds.length === 0) return false;
        if (!roleIds.some((rid) => message.member!.roles.cache.has(rid))) return false;
        break;
      }
      case 'user_missing_all_roles': {
        const roleIds = (p.roleIds as string[] | undefined) ?? [];
        if (!message.member || roleIds.length === 0) return false;
        if (!roleIds.every((rid) => !message.member!.roles.cache.has(rid))) return false;
        break;
      }
      case 'user_missing_one_role': {
        const roleIds = (p.roleIds as string[] | undefined) ?? [];
        if (!message.member || roleIds.length === 0) return false;
        if (!roleIds.some((rid) => !message.member!.roles.cache.has(rid))) return false;
        break;
      }
      case 'message_equals_any': {
        const phrases = (p.phrases as string[] | undefined) ?? [];
        const ci = p.caseInsensitive !== false;
        const content = (message.content || '').trim();
        if (phrases.length === 0) return false;
        const ok = phrases.some((x) => {
          const t = (x || '').trim();
          if (!t) return false;
          return ci ? content.toLowerCase() === t.toLowerCase() : content === t;
        });
        if (!ok) return false;
        break;
      }
      case 'message_contains_any': {
        const phrases = (p.phrases as string[] | undefined) ?? [];
        const ci = p.caseInsensitive !== false;
        if (phrases.length === 0) return false;
        if (!strIncludesAny(message.content || '', phrases, ci)) return false;
        break;
      }
      case 'message_not_contains_any': {
        const phrases = (p.phrases as string[] | undefined) ?? [];
        const ci = p.caseInsensitive !== false;
        if (phrases.length === 0) break;
        if (strIncludesAny(message.content || '', phrases, ci)) return false;
        break;
      }
      case 'user_in_list': {
        const userIds = (p.userIds as string[] | undefined) ?? [];
        if (userIds.length === 0) return false;
        if (!userIds.includes(message.author.id)) return false;
        break;
      }
      case 'attachment_image': {
        if (!message.attachments.some((a) => a.contentType?.startsWith('image/'))) return false;
        break;
      }
      case 'attachment_audio': {
        const ok = message.attachments.some(
          (a) => a.contentType?.startsWith('audio/') || a.name?.match(/\.(mp3|ogg|wav)$/i)
        );
        if (!ok) return false;
        break;
      }
      case 'attachment_video': {
        if (!message.attachments.some((a) => a.contentType?.startsWith('video/'))) return false;
        break;
      }
      case 'attachment_text': {
        const ok = message.attachments.some(
          (a) => a.contentType?.startsWith('text/') || a.name?.endsWith('.txt')
        );
        if (!ok) return false;
        break;
      }
      case 'message_is_reply': {
        if (!message.reference?.messageId) return false;
        break;
      }
      case 'message_is_not_reply': {
        if (message.reference?.messageId) return false;
        break;
      }
      default:
        return false;
    }
  }
  return true;
}

async function runActionsForMessage(message: Message, actions: AutomationDefinition['actions']): Promise<void> {
  const guild = message.guild;
  if (!guild || !message.member) return;

  for (const a of actions) {
    const p = a.params ?? {};
    try {
      switch (a.type) {
        case 'send_message': {
          const channelId = String(p.channelId || '');
          const content = String(p.content || '').slice(0, 2000);
          if (!channelId || !content) break;
          const ch = getTextChannel(guild, channelId);
          if (ch) await ch.send({ content, allowedMentions: { parse: [] } });
          break;
        }
        case 'reply': {
          const content = String(p.content || '').slice(0, 2000);
          if (content && typeof message.reply === 'function') {
            await message.reply({ content, allowedMentions: { parse: [], repliedUser: false } });
          }
          break;
        }
        case 'repost': {
          const channelId = String(p.channelId || '');
          const extra = String(p.content || '').trim();
          const body = [extra, message.content].filter(Boolean).join('\n\n').slice(0, 2000);
          if (!channelId || !body) break;
          const ch = getTextChannel(guild, channelId);
          if (ch) await ch.send({ content: body, allowedMentions: { parse: [] } });
          break;
        }
        case 'pin': {
          if (typeof message.pin === 'function') await message.pin().catch((error) => logError('automationEngine:pin', error, 'warn'));
          break;
        }
        case 'delete_message': {
          if (typeof message.delete === 'function') await message.delete().catch((error) => logError('automationEngine:deleteMessage', error, 'debug'));
          break;
        }
        case 'react': {
          const emojis = (p.emojis as string[] | undefined) ?? ['👍'];
          for (const e of emojis.slice(0, 5)) {
            if (e) await message.react(e).catch((error) => logError('automationEngine:react', error, 'debug'));
          }
          break;
        }
        case 'add_roles': {
          const roleIds = (p.roleIds as string[] | undefined) ?? [];
          for (const rid of roleIds) {
            const role = guild.roles.cache.get(rid);
            if (!role) continue;
            const check = botCanAssignRole(guild, role);
            if (!check.ok) {
              console.warn(`[Automation] Rol verilemedi (${describeRoleAssignBlock(check.reason!)}): ${role.name} (${rid})`);
              continue;
            }
            await message.member!.roles.add(role).catch((error) => logError('automationEngine:addRole', error, 'warn'));
          }
          break;
        }
        case 'remove_roles': {
          const roleIds = (p.roleIds as string[] | undefined) ?? [];
          for (const rid of roleIds) {
            const role = guild.roles.cache.get(rid);
            if (!role) continue;
            const check = botCanAssignRole(guild, role);
            if (!check.ok) {
              console.warn(`[Automation] Rol kaldırılamadı (${describeRoleAssignBlock(check.reason!)}): ${role.name} (${rid})`);
              continue;
            }
            await message.member!.roles.remove(role).catch((error) => logError('automationEngine:removeRole', error, 'warn'));
          }
          break;
        }
        case 'create_thread': {
          const name = String(p.name || 'thread').slice(0, 100);
          const dur = Number(p.autoArchiveDuration) === 1440 ? 1440 : 60;
          const arch =
            dur >= 1440
              ? ThreadAutoArchiveDuration.OneDay
              : ThreadAutoArchiveDuration.OneHour;
          if (message.channel.type === ChannelType.GuildText) {
            await message.startThread({ name, autoArchiveDuration: arch }).catch((error) => logError('automationEngine:createThread', error, 'warn'));
          }
          break;
        }
        case 'give_xp': {
          const amount = Math.max(1, Math.min(10_000, Number(p.amount) || 10));
          const levelOn = await isFeatureEnabled(guild.id, 'level');
          if (levelOn) await addXpToUser(guild.id, message.author.id, amount);
          break;
        }
        default:
          break;
      }
    } catch (e) {
      console.warn(`[Automation] Aksiyon hatasi (${a.type}):`, e);
    }
  }
}

async function runRulesForMessage(
  message: Message,
  triggerType: string,
  rows: GuildAutomationApiRow[]
): Promise<void> {
  let n = 0;
  for (const row of rows) {
    if (!row.enabled || n >= MAX_RULES_PER_EVENT) break;
    const def = parseDef(row.definitionJson);
    if (!def || def.trigger?.type !== triggerType) continue;
    if (!evalConditionsMessage(message, def.conditions)) continue;
    n += 1;
    await runActionsForMessage(message, def.actions);
  }
}

export async function handleAutomationMessageCreate(message: Message): Promise<void> {
  if (!message.guild || message.author.bot || !message.member) return;
  const guildId = message.guild.id;
  if (!(await isFeatureEnabled(guildId, 'Automation'))) return;
  const rows = await getGuildAutomationsCached(guildId);
  if (!rows.length) return;
  await runRulesForMessage(message, 'message_send', rows);
}

export async function handleAutomationMessageDelete(message: Message | PartialMessage): Promise<void> {
  try {
    if (!message.guildId) return;
    const guild = message.client.guilds.cache.get(message.guildId);
    if (!guild) return;
    const full = message.partial ? await message.fetch().catch((error) => { logError('automationEngine:fetchPartialOnDelete', error, 'debug'); return null; }) : message;
    if (!full || full.author?.bot || !full.guild) return;
    const msg = full as Message;
    if (!msg.member && msg.author) {
      const m = await guild.members.fetch(msg.author.id).catch((error) => { logError('automationEngine:fetchMemberOnDelete', error, 'debug'); return null; });
      if (m) (msg as { member?: typeof m }).member = m;
    }
    if (!msg.member) return;
    if (!(await isFeatureEnabled(guild.id, 'Automation'))) return;
    const rows = await getGuildAutomationsCached(guild.id);
    if (!rows.length) return;
    await runRulesForMessage(msg, 'message_delete', rows);
  } catch (e) {
    console.warn('[Automation] messageDelete:', e);
  }
}

export async function handleAutomationMessageUpdate(
  _oldMessage: Message | PartialMessage,
  newMessage: Message | PartialMessage
): Promise<void> {
  const msg = newMessage.partial ? await newMessage.fetch().catch((error) => { logError('automationEngine:fetchPartialOnUpdate', error, 'debug'); return null; }) : (newMessage as Message);
  if (!msg || !msg.guild || msg.author?.bot || !msg.member) return;
  if (!(await isFeatureEnabled(msg.guild.id, 'Automation'))) return;
  const rows = await getGuildAutomationsCached(msg.guild.id);
  if (!rows.length) return;
  await runRulesForMessage(msg, 'message_edit', rows);
}

export async function handleAutomationReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: { bot: boolean; id: string }
): Promise<void> {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch((error) => logError('automationEngine:fetchPartialReaction', error, 'debug'));
  const r = reaction as MessageReaction;
  if (r.message.partial) await r.message.fetch().catch((error) => logError('automationEngine:fetchPartialReactionMessage', error, 'debug'));
  const msg = r.message;
  if (!msg.guild || msg.channel.type !== ChannelType.GuildText) return;
  if (!msg.member) {
    const m = await msg.guild.members.fetch(user.id).catch((error) => { logError('automationEngine:fetchMemberOnReaction', error, 'debug'); return null; });
    if (!m) return;
    (msg as { member?: typeof m }).member = m;
  }
  if (!(await isFeatureEnabled(msg.guild.id, 'Automation'))) return;
  const rows = await getGuildAutomationsCached(msg.guild.id);
  if (!rows.length) return;
  await runRulesForMessage(msg as Message, 'reaction_add', rows);
}

/** Faz 2: rol/ses/thread/üye/buton tetikleyicileri icin genisletilecek */
export async function handleAutomationGuildMemberUpdate(): Promise<void> {}
export async function handleAutomationVoiceState(): Promise<void> {}
export async function handleAutomationThreadCreate(): Promise<void> {}
export async function handleAutomationMemberAdd(): Promise<void> {}
/** Buton tetikleyicili otomasyon henüz desteklenmiyor; interaction ACK + bilgi mesajı döner. */
export async function handleAutomationButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.isRepliable() || interaction.replied || interaction.deferred) return;
  await interaction
    .reply({ content: 'Bu otomasyon eylemi şu anda kullanılamıyor.', flags: MessageFlags.Ephemeral })
    .catch((error) => logError('automationEngine:handleAutomationButton', error, 'debug'));
}
