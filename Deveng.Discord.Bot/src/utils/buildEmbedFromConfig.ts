import { EmbedBuilder } from 'discord.js';
import type { EmbedConfig, EmbedField } from '../types/embedConfig';
import { parseHexColor } from './helpers';
import { sanitizeOptionalUrl, stripMassMentions } from './mentionSanitize';

export interface BuildEmbedOptions {
  replaceTags?: (text: string) => string;
  defaultColor?: number;
  fallbackDescription?: string;
}

export function toEmbedConfig(partial: Partial<EmbedConfig> & Pick<EmbedConfig, 'isEmbed'>): EmbedConfig {
  return {
    isEmbed: partial.isEmbed,
    message: partial.message ?? null,
    embedTitle: partial.embedTitle ?? null,
    embedTitleUrl: partial.embedTitleUrl ?? null,
    embedDescription: partial.embedDescription ?? null,
    embedColor: partial.embedColor ?? null,
    embedAuthorName: partial.embedAuthorName ?? null,
    embedAuthorIcon: partial.embedAuthorIcon ?? null,
    embedAuthorUrl: partial.embedAuthorUrl ?? null,
    embedThumbnail: partial.embedThumbnail ?? null,
    embedImage: partial.embedImage ?? null,
    embedFooter: partial.embedFooter ?? null,
    embedFooterIcon: partial.embedFooterIcon ?? null,
    embedUseTimestamp: partial.embedUseTimestamp,
    embedFieldsJson: partial.embedFieldsJson ?? null,
  };
}

function applyText(text: string, replaceTags: (text: string) => string): string {
  return stripMassMentions(replaceTags(text).replace(/\\n/g, '\n'));
}

function parseEmbedFields(
  json: string | null | undefined,
  replaceTags: (text: string) => string,
): EmbedField[] {
  if (!json?.trim()) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const fields: EmbedField[] = [];
    for (const item of parsed.slice(0, 25)) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const record = item as Record<string, unknown>;
      if (typeof record.name !== 'string' || typeof record.value !== 'string') {
        continue;
      }
      const name = applyText(record.name, replaceTags).slice(0, 256);
      const value = applyText(record.value, replaceTags).slice(0, 1024);
      if (!name || !value) {
        continue;
      }
      fields.push({
        name,
        value,
        inline: record.inline === true,
      });
    }
    return fields;
  } catch {
    return [];
  }
}

function hasConfiguredEmbedContent(config: EmbedConfig): boolean {
  return !!(
    config.embedTitle ||
    config.embedDescription ||
    config.embedThumbnail ||
    config.embedImage ||
    config.embedFooter ||
    config.embedAuthorName ||
    config.embedFieldsJson
  );
}

export function buildEmbedFromConfig(
  config: EmbedConfig,
  options?: BuildEmbedOptions,
): { content?: string; embeds?: EmbedBuilder[] } {
  const replaceTags = options?.replaceTags ?? ((text: string) => stripMassMentions(text));
  const defaultColor = options?.defaultColor ?? 0x5865f2;

  if (!config.isEmbed) {
    const content = config.message ? applyText(config.message, replaceTags) : undefined;
    return content ? { content } : {};
  }

  const embed = new EmbedBuilder();
  let hasBody = false;

  if (config.embedTitle) {
    const title = applyText(config.embedTitle, replaceTags).slice(0, 256);
    if (title) {
      embed.setTitle(title);
      hasBody = true;
      const titleUrl = sanitizeOptionalUrl(
        config.embedTitleUrl ? replaceTags(config.embedTitleUrl) : null,
      );
      if (titleUrl) {
        embed.setURL(titleUrl);
      }
    }
  }

  if (config.embedDescription) {
    const description = applyText(config.embedDescription, replaceTags).slice(0, 4096);
    if (description) {
      embed.setDescription(description);
      hasBody = true;
    }
  }

  embed.setColor(parseHexColor(config.embedColor, defaultColor));

  if (config.embedAuthorName) {
    const authorName = applyText(config.embedAuthorName, replaceTags).slice(0, 256);
    if (authorName) {
      const authorIcon = sanitizeOptionalUrl(
        config.embedAuthorIcon ? replaceTags(config.embedAuthorIcon) : null,
      );
      const authorUrl = sanitizeOptionalUrl(
        config.embedAuthorUrl ? replaceTags(config.embedAuthorUrl) : null,
      );
      embed.setAuthor({
        name: authorName,
        iconURL: authorIcon ?? undefined,
        url: authorUrl ?? undefined,
      });
      hasBody = true;
    }
  }

  if (config.embedThumbnail) {
    const thumbnail = sanitizeOptionalUrl(replaceTags(config.embedThumbnail));
    if (thumbnail) {
      embed.setThumbnail(thumbnail);
      hasBody = true;
    }
  }

  if (config.embedImage) {
    const image = sanitizeOptionalUrl(replaceTags(config.embedImage));
    if (image) {
      embed.setImage(image);
      hasBody = true;
    }
  }

  if (config.embedFooter) {
    const footerText = applyText(config.embedFooter, replaceTags).slice(0, 2048);
    if (footerText) {
      const footerIcon = sanitizeOptionalUrl(
        config.embedFooterIcon ? replaceTags(config.embedFooterIcon) : null,
      );
      embed.setFooter({
        text: footerText,
        iconURL: footerIcon ?? undefined,
      });
      hasBody = true;
    }
  }

  const fields = parseEmbedFields(config.embedFieldsJson, replaceTags);
  if (fields.length > 0) {
    embed.addFields(fields);
    hasBody = true;
  }

  if (config.embedUseTimestamp !== false) {
    embed.setTimestamp();
  }

  if (!hasBody && !hasConfiguredEmbedContent(config)) {
    const fallback = options?.fallbackDescription
      ? applyText(options.fallbackDescription, replaceTags)
      : ' ';
    embed.setDescription(fallback.slice(0, 4096));
  } else if (!hasBody) {
    embed.setDescription(' ');
  }

  return { embeds: [embed] };
}

export function buildSingleEmbedFromConfig(
  config: EmbedConfig,
  options?: BuildEmbedOptions,
): EmbedBuilder {
  const result = buildEmbedFromConfig(config, options);
  const embed = result.embeds?.[0];
  if (!embed) {
    throw new Error('Embed oluşturulamadı');
  }
  return embed;
}
