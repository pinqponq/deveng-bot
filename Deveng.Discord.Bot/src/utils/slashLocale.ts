import type { ChatInputCommandInteraction } from 'discord.js';

/** Discord interaction.locale (kullanıcı istemci dili) */
export function interactionLang(interaction: ChatInputCommandInteraction): 'en' | 'tr' {
  const l = interaction.locale ?? 'tr';
  return l.toLowerCase().startsWith('en') ? 'en' : 'tr';
}

export function commonGuildOnly(interaction: ChatInputCommandInteraction): string {
  return interactionLang(interaction) === 'en'
    ? 'This command can only be used in servers.'
    : 'Bu komut sadece sunucularda kullanılabilir!';
}

const ticketPanelStrings = {
  tr: {
    notConfigured: 'Talep paneli ayarlanmamış! Önce web arayüzünden ayarlayın.',
    channelMissing: 'Panel kanalı bulunamadı!',
    noContent: 'Gönderilecek içerik bulunamadı!',
    sendFailed: 'Mesaj gönderilemedi!',
    genericError: 'Bir hata oluştu!',
    sent: (channelMention: string, messageId: string) =>
      `Talep paneli ${channelMention} kanalına gönderildi! Mesaj ID: ${messageId}`,
  },
  en: {
    notConfigured: 'Ticket panel is not configured. Set it up in the web dashboard first.',
    channelMissing: 'Panel channel could not be found.',
    noContent: 'No content to send.',
    sendFailed: 'Could not send the message.',
    genericError: 'Something went wrong.',
    sent: (channelMention: string, messageId: string) =>
      `Ticket panel was sent to ${channelMention}. Message ID: ${messageId}`,
  },
} as const;

const pollStrings = {
  tr: {
    onlyGuild: 'Bu komut sadece sunucularda kullanılabilir!',
    noApi: 'API bağlantısı yapılandırılmamış!',
    createFailed: 'Anket oluşturulamadı',
    unknownError: 'Bilinmeyen hata',
    channelConflict: 'Bu kanalda zaten aktif bir anket var. Önce /poll-end ile kapatın veya başka kanalda deneyin.',
    quotaOrForbidden: 'Anket kotası veya yetki sınırı nedeniyle oluşturulamadı.',
  },
  en: {
    onlyGuild: 'This command can only be used in servers.',
    noApi: 'API is not configured.',
    createFailed: 'Could not create poll',
    unknownError: 'Unknown error',
    channelConflict: 'There is already an active poll in this channel. Use /poll-end first or try another channel.',
    quotaOrForbidden: 'Poll could not be created due to quota or permission limits.',
  },
} as const;

export function pollMsg(
  interaction: ChatInputCommandInteraction,
  key: keyof (typeof pollStrings)['tr'],
): string {
  const lang = interactionLang(interaction);
  return pollStrings[lang][key];
}

export function ticketPanelMsg(
  interaction: ChatInputCommandInteraction,
  key: Exclude<keyof (typeof ticketPanelStrings)['tr'], 'sent'>,
): string {
  const lang = interactionLang(interaction);
  return ticketPanelStrings[lang][key];
}

export function ticketPanelSent(
  interaction: ChatInputCommandInteraction,
  channelMention: string,
  messageId: string,
): string {
  const lang = interactionLang(interaction);
  return ticketPanelStrings[lang].sent(channelMention, messageId);
}
