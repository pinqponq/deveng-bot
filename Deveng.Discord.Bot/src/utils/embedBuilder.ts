import { EmbedBuilder, GuildMember, PartialGuildMember } from 'discord.js';
import { WelcomeData, GoodbyeData } from '../types/database';
import { replacePlaceholders } from './helpers';
import { createWelcomePlaceholders, createGoodbyePlaceholders } from './embedPlaceholders';
import { EMBED_COLOR_WELCOME, EMBED_COLOR_GOODBYE } from './constants';
import { buildSingleEmbedFromConfig, toEmbedConfig } from './buildEmbedFromConfig';
import type { EmbedConfig } from '../types/embedConfig';

function resolveWelcomeThumbnail(
  welcomeData: WelcomeData,
  placeholders: ReturnType<typeof createWelcomePlaceholders>,
): string | null {
  if (welcomeData.embedThumbnail === '{userAvatar}') {
    return placeholders.userAvatar;
  }
  if (welcomeData.embedThumbnail) {
    return welcomeData.embedThumbnail;
  }
  return placeholders.userAvatar;
}

function buildWelcomeEmbedConfig(
  welcomeData: WelcomeData,
  finalMessage: string,
  placeholders: ReturnType<typeof createWelcomePlaceholders>,
  member: GuildMember,
): EmbedConfig {
  const footerText = welcomeData.embedFooter ?? member.guild.name;
  const footerIcon =
    welcomeData.embedFooterIcon ??
    (welcomeData.embedFooter ? null : member.guild.iconURL());

  return toEmbedConfig({
    isEmbed: true,
    embedTitle: welcomeData.embedTitle ?? null,
    embedTitleUrl: welcomeData.embedTitleUrl ?? null,
    embedDescription: welcomeData.embedDescription ?? finalMessage,
    embedColor: welcomeData.embedColor ?? null,
    embedAuthorName: welcomeData.embedAuthorName ?? null,
    embedAuthorIcon: welcomeData.embedAuthorIcon ?? null,
    embedAuthorUrl: welcomeData.embedAuthorUrl ?? null,
    embedThumbnail: resolveWelcomeThumbnail(welcomeData, placeholders),
    embedImage: welcomeData.embedImage ?? null,
    embedFooter: footerText,
    embedFooterIcon: footerIcon,
    embedUseTimestamp: welcomeData.embedUseTimestamp,
    embedFieldsJson: welcomeData.embedFieldsJson ?? null,
  });
}

export function createWelcomeEmbed(member: GuildMember, welcomeData: WelcomeData, finalMessage: string): EmbedBuilder {
  const placeholders = createWelcomePlaceholders(member);
  const replaceTags = (text: string) => replacePlaceholders(text, placeholders);

  return buildSingleEmbedFromConfig(
    buildWelcomeEmbedConfig(welcomeData, finalMessage, placeholders, member),
    {
      replaceTags,
      defaultColor: EMBED_COLOR_WELCOME,
    },
  );
}

export function createGoodbyeEmbed(
  member: GuildMember | PartialGuildMember,
  goodbyeData: GoodbyeData,
  finalMessage: string,
): EmbedBuilder {
  const placeholders = createGoodbyePlaceholders(member);
  const replaceTags = (text: string) => replacePlaceholders(text, placeholders);

  let thumbnail: string | null = placeholders.userAvatar;
  if (goodbyeData.embedThumbnail === '{userAvatar}') {
    thumbnail = placeholders.userAvatar;
  } else if (goodbyeData.embedThumbnail) {
    thumbnail = goodbyeData.embedThumbnail;
  }

  const footerText = goodbyeData.embedFooter ?? member.guild.name;
  const footerIcon =
    goodbyeData.embedFooterIcon ??
    (goodbyeData.embedFooter ? null : member.guild.iconURL());

  return buildSingleEmbedFromConfig(
    toEmbedConfig({
      isEmbed: true,
      embedTitle: goodbyeData.embedTitle ?? null,
      embedTitleUrl: goodbyeData.embedTitleUrl ?? null,
      embedDescription: goodbyeData.embedDescription ?? finalMessage,
      embedColor: goodbyeData.embedColor ?? null,
      embedAuthorName: goodbyeData.embedAuthorName ?? null,
      embedAuthorIcon: goodbyeData.embedAuthorIcon ?? null,
      embedAuthorUrl: goodbyeData.embedAuthorUrl ?? null,
      embedThumbnail: thumbnail,
      embedImage: goodbyeData.embedImage ?? null,
      embedFooter: footerText,
      embedFooterIcon: footerIcon,
      embedUseTimestamp: goodbyeData.embedUseTimestamp,
      embedFieldsJson: goodbyeData.embedFieldsJson ?? null,
    }),
    {
      replaceTags,
      defaultColor: EMBED_COLOR_GOODBYE,
    },
  );
}

export function createDMEmbed(member: GuildMember, welcomeData: WelcomeData, finalMessage: string): EmbedBuilder {
  const placeholders = createWelcomePlaceholders(member);
  const replaceTags = (text: string) => replacePlaceholders(text, placeholders);

  let dmThumbnail: string | null = placeholders.userAvatar;
  if (welcomeData.dmEmbedThumbnail === '{userAvatar}') {
    dmThumbnail = placeholders.userAvatar;
  } else if (welcomeData.dmEmbedThumbnail) {
    dmThumbnail = welcomeData.dmEmbedThumbnail;
  }

  const footerText = welcomeData.dmEmbedFooter ?? member.guild.name;
  const footerIcon =
    welcomeData.dmEmbedFooterIcon ??
    (welcomeData.dmEmbedFooter ? null : member.guild.iconURL());

  return buildSingleEmbedFromConfig(
    toEmbedConfig({
      isEmbed: true,
      embedTitle: welcomeData.dmEmbedTitle ?? null,
      embedTitleUrl: welcomeData.dmEmbedTitleUrl ?? null,
      embedDescription: welcomeData.dmEmbedDescription ?? finalMessage,
      embedColor: welcomeData.dmEmbedColor ?? null,
      embedAuthorName: welcomeData.dmEmbedAuthorName ?? null,
      embedAuthorIcon: welcomeData.dmEmbedAuthorIcon ?? null,
      embedAuthorUrl: welcomeData.dmEmbedAuthorUrl ?? null,
      embedThumbnail: dmThumbnail,
      embedImage: welcomeData.dmEmbedImage ?? null,
      embedFooter: footerText,
      embedFooterIcon: footerIcon,
      embedUseTimestamp: welcomeData.dmEmbedUseTimestamp,
      embedFieldsJson: welcomeData.dmEmbedFieldsJson ?? null,
    }),
    {
      replaceTags,
      defaultColor: EMBED_COLOR_WELCOME,
    },
  );
}
