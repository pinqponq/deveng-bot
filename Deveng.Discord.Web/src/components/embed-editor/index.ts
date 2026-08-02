export {
  DISCORD_EMBED_LIMITS,
  DEFAULT_EMBED_COLOR,
  EMBED_DESCRIPTION_INSERT_TAGS,
  defaultEmbedFieldNames,
  createEmbedFieldNames,
  createEmptyEmbedValues,
  embedFieldName,
  parseEmbedFieldsJson,
  serializeEmbedFields,
  getEmbedPreviewValues,
  toEmbedApiPayload,
  fromEmbedApiDto,
} from './embed-config'
export type {
  EmbedField,
  EmbedFieldNames,
  EmbedFieldNameOverrides,
  EmbedContentFieldKey,
  EmbedDescriptionInsertTag,
  EmbedValuesRecord,
  EmbedPreviewValues,
} from './embed-config'

export { createEmbedSchema, validateEmbedFieldsArray, embedFieldItemSchema } from './embed-schema'
export type { EmbedSchemaShape, EmbedSchemaValues } from './embed-schema'

export { EmbedFieldsEditor } from './embed-fields-editor'
export type { EmbedFieldsEditorProps } from './embed-fields-editor'

export { EmbedTagPopover, insertTextAtCursor } from './embed-tag-popover'
export type { EmbedTagPopoverProps } from './embed-tag-popover'

export { EmbedPreview } from './embed-preview'
export type { EmbedPreviewProps } from './embed-preview'

export { EmbedFormSection } from './embed-form-section'
export type { EmbedFormSectionProps } from './embed-form-section'
