export interface EmbedField {
  name: string
  value: string
  inline: boolean
}

export const DISCORD_EMBED_LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  maxFields: 25,
  authorName: 256,
  footer: 2048,
  message: 2000,
} as const

export const DEFAULT_EMBED_COLOR = '#5865F2'

export const EMBED_DESCRIPTION_INSERT_TAGS = [
  '{user}',
  '{username}',
  '{userid}',
  '{usermention}',
  '{server}',
  '{servername}',
  '{membercount}',
  '{timestamp}',
] as const

export type EmbedDescriptionInsertTag = (typeof EMBED_DESCRIPTION_INSERT_TAGS)[number]

/** Form alan adları — prefix ile (embed, pollEmbed, dmEmbed, …) üretilir. */
export type EmbedFieldNames = {
  isEmbed: string
  message: string
  embedTitle: string
  embedTitleUrl: string
  embedDescription: string
  embedColor: string
  embedAuthorName: string
  embedAuthorIcon: string
  embedAuthorUrl: string
  embedThumbnail: string
  embedImage: string
  embedFooter: string
  embedFooterIcon: string
  embedUseTimestamp: string
  embedFieldsJson: string
}

export type EmbedFieldNameOverrides = Partial<Pick<EmbedFieldNames, 'isEmbed' | 'message'>>

const EMBED_SUFFIXES = {
  embedTitle: 'Title',
  embedTitleUrl: 'TitleUrl',
  embedDescription: 'Description',
  embedColor: 'Color',
  embedAuthorName: 'AuthorName',
  embedAuthorIcon: 'AuthorIcon',
  embedAuthorUrl: 'AuthorUrl',
  embedThumbnail: 'Thumbnail',
  embedImage: 'Image',
  embedFooter: 'Footer',
  embedFooterIcon: 'FooterIcon',
  embedUseTimestamp: 'UseTimestamp',
  embedFieldsJson: 'FieldsJson',
} as const satisfies Record<
  Exclude<keyof EmbedFieldNames, 'isEmbed' | 'message'>,
  string
>

export type EmbedContentFieldKey = keyof typeof EMBED_SUFFIXES

/** Tek bir embed alan adı üretir: embedFieldName('pollEmbed', 'embedTitle') → pollEmbedTitle */
export function embedFieldName(prefix: string, key: EmbedContentFieldKey): string {
  return `${prefix}${EMBED_SUFFIXES[key]}`
}

export function createEmbedFieldNames(
  prefix: string,
  overrides?: EmbedFieldNameOverrides
): EmbedFieldNames {
  return {
    isEmbed: overrides?.isEmbed ?? 'isEmbed',
    message: overrides?.message ?? 'message',
    embedTitle: embedFieldName(prefix, 'embedTitle'),
    embedTitleUrl: embedFieldName(prefix, 'embedTitleUrl'),
    embedDescription: embedFieldName(prefix, 'embedDescription'),
    embedColor: embedFieldName(prefix, 'embedColor'),
    embedAuthorName: embedFieldName(prefix, 'embedAuthorName'),
    embedAuthorIcon: embedFieldName(prefix, 'embedAuthorIcon'),
    embedAuthorUrl: embedFieldName(prefix, 'embedAuthorUrl'),
    embedThumbnail: embedFieldName(prefix, 'embedThumbnail'),
    embedImage: embedFieldName(prefix, 'embedImage'),
    embedFooter: embedFieldName(prefix, 'embedFooter'),
    embedFooterIcon: embedFieldName(prefix, 'embedFooterIcon'),
    embedUseTimestamp: embedFieldName(prefix, 'embedUseTimestamp'),
    embedFieldsJson: embedFieldName(prefix, 'embedFieldsJson'),
  }
}

export const defaultEmbedFieldNames = createEmbedFieldNames('embed')

export type EmbedValuesRecord = Record<string, string | boolean | undefined>

export function createEmptyEmbedValues(
  prefix: string,
  overrides?: EmbedFieldNameOverrides
): EmbedValuesRecord {
  const names = createEmbedFieldNames(prefix, overrides)
  return {
    [names.isEmbed]: true,
    [names.message]: '',
    [names.embedTitle]: '',
    [names.embedTitleUrl]: '',
    [names.embedDescription]: '',
    [names.embedColor]: DEFAULT_EMBED_COLOR,
    [names.embedAuthorName]: '',
    [names.embedAuthorIcon]: '',
    [names.embedAuthorUrl]: '',
    [names.embedThumbnail]: '',
    [names.embedImage]: '',
    [names.embedFooter]: '',
    [names.embedFooterIcon]: '',
    [names.embedUseTimestamp]: true,
    [names.embedFieldsJson]: '[]',
  }
}

export function parseEmbedFieldsJson(json: string | undefined | null): EmbedField[] {
  if (!json?.trim()) return []
  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is EmbedField =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as EmbedField).name === 'string' &&
          typeof (item as EmbedField).value === 'string' &&
          typeof (item as EmbedField).inline === 'boolean'
      )
      .map((item) => ({
        name: item.name,
        value: item.value,
        inline: item.inline,
      }))
  } catch {
    return []
  }
}

export function serializeEmbedFields(fields: EmbedField[]): string {
  return JSON.stringify(fields)
}

export function getEmbedPreviewValues(
  watch: (name: string) => unknown,
  fieldNames: EmbedFieldNames
) {
  return {
    message: String(watch(fieldNames.message) ?? ''),
    isEmbed: Boolean(watch(fieldNames.isEmbed)),
    title: String(watch(fieldNames.embedTitle) ?? ''),
    titleUrl: String(watch(fieldNames.embedTitleUrl) ?? ''),
    description: String(watch(fieldNames.embedDescription) ?? ''),
    color: String(watch(fieldNames.embedColor) ?? DEFAULT_EMBED_COLOR),
    authorName: String(watch(fieldNames.embedAuthorName) ?? ''),
    authorIcon: String(watch(fieldNames.embedAuthorIcon) ?? ''),
    authorUrl: String(watch(fieldNames.embedAuthorUrl) ?? ''),
    thumbnail: String(watch(fieldNames.embedThumbnail) ?? ''),
    image: String(watch(fieldNames.embedImage) ?? ''),
    footer: String(watch(fieldNames.embedFooter) ?? ''),
    footerIcon: String(watch(fieldNames.embedFooterIcon) ?? ''),
    useTimestamp: Boolean(watch(fieldNames.embedUseTimestamp)),
    fields: parseEmbedFieldsJson(String(watch(fieldNames.embedFieldsJson) ?? '[]')),
  }
}

export type EmbedPreviewValues = ReturnType<typeof getEmbedPreviewValues>

/** Form değerlerinden API create/update payload embed alanlarını çıkarır. */
export function toEmbedApiPayload(
  data: Record<string, unknown>,
  names: EmbedFieldNames
): Record<string, unknown> {
  const optionalString = (key: keyof EmbedFieldNames): string | undefined => {
    const raw = data[names[key]]
    if (typeof raw !== 'string') return undefined
    const trimmed = raw.trim()
    return trimmed || undefined
  }

  const fieldsJson = optionalString('embedFieldsJson')
  const normalizedFields =
    !fieldsJson || fieldsJson === '[]' ? undefined : fieldsJson

  return {
    [names.isEmbed]: Boolean(data[names.isEmbed]),
    [names.message]: optionalString('message'),
    [names.embedTitle]: optionalString('embedTitle'),
    [names.embedTitleUrl]: optionalString('embedTitleUrl'),
    [names.embedDescription]: optionalString('embedDescription'),
    [names.embedColor]: optionalString('embedColor'),
    [names.embedAuthorName]: optionalString('embedAuthorName'),
    [names.embedAuthorIcon]: optionalString('embedAuthorIcon'),
    [names.embedAuthorUrl]: optionalString('embedAuthorUrl'),
    [names.embedThumbnail]: optionalString('embedThumbnail'),
    [names.embedImage]: optionalString('embedImage'),
    [names.embedFooter]: optionalString('embedFooter'),
    [names.embedFooterIcon]: optionalString('embedFooterIcon'),
    [names.embedUseTimestamp]: data[names.embedUseTimestamp] !== false,
    [names.embedFieldsJson]: normalizedFields,
  }
}

/** API DTO embed alanlarını form default değerlerine dönüştürür. */
export function fromEmbedApiDto(
  dto: Record<string, unknown>,
  prefix: string,
  overrides?: EmbedFieldNameOverrides
): EmbedValuesRecord {
  const names = createEmbedFieldNames(prefix, overrides)
  return {
    [names.isEmbed]: dto[names.isEmbed] !== false,
    [names.message]: String(dto[names.message] ?? ''),
    [names.embedTitle]: String(dto[names.embedTitle] ?? ''),
    [names.embedTitleUrl]: String(dto[names.embedTitleUrl] ?? ''),
    [names.embedDescription]: String(dto[names.embedDescription] ?? ''),
    [names.embedColor]: String(dto[names.embedColor] ?? DEFAULT_EMBED_COLOR),
    [names.embedAuthorName]: String(dto[names.embedAuthorName] ?? ''),
    [names.embedAuthorIcon]: String(dto[names.embedAuthorIcon] ?? ''),
    [names.embedAuthorUrl]: String(dto[names.embedAuthorUrl] ?? ''),
    [names.embedThumbnail]: String(dto[names.embedThumbnail] ?? ''),
    [names.embedImage]: String(dto[names.embedImage] ?? ''),
    [names.embedFooter]: String(dto[names.embedFooter] ?? ''),
    [names.embedFooterIcon]: String(dto[names.embedFooterIcon] ?? ''),
    [names.embedUseTimestamp]: dto[names.embedUseTimestamp] !== false,
    [names.embedFieldsJson]: String(dto[names.embedFieldsJson] ?? '[]') || '[]',
  }
}
