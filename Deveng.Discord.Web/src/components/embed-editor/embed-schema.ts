import { z } from 'zod'
import i18n from '@/i18n'
import {
  DISCORD_EMBED_LIMITS,
  type EmbedFieldNames,
  parseEmbedFieldsJson,
} from './embed-config'

/** Doğrulama mesajını aktif dilde üretir (validasyon anında değerlendirilir). */
const vt = (key: string, options?: Record<string, unknown>): string =>
  i18n.t(key, { ns: 'embed', ...options }) as string

const embedFieldItemSchema = z.object({
  name: z.string().max(DISCORD_EMBED_LIMITS.fieldName, {
    message: vt('validationFieldNameMax', { max: DISCORD_EMBED_LIMITS.fieldName }),
  }),
  value: z.string().max(DISCORD_EMBED_LIMITS.fieldValue, {
    message: vt('validationFieldValueMax', { max: DISCORD_EMBED_LIMITS.fieldValue }),
  }),
  inline: z.boolean(),
})

function embedFieldsJsonSchema() {
  return z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      if (!val?.trim() || val === '[]') return
      let parsed: unknown
      try {
        parsed = JSON.parse(val)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: vt('validationFieldsJson'),
        })
        return
      }
      if (!Array.isArray(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: vt('validationFieldsArray'),
        })
        return
      }
      if (parsed.length > DISCORD_EMBED_LIMITS.maxFields) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: vt('validationFieldsMax', { max: DISCORD_EMBED_LIMITS.maxFields }),
        })
        return
      }
      parsed.forEach((item, index) => {
        const result = embedFieldItemSchema.safeParse(item)
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            ctx.addIssue({
              ...issue,
              path: [index, ...(issue.path ?? [])],
            })
          })
        }
      })
    })
}

const optionalUrl = z
  .string()
  .optional()
  .refine((val) => !val?.trim() || /^https?:\/\/.+/i.test(val.trim()), {
    message: vt('validationUrl'),
  })

/** Prefix'e göre embed form alanları için zod şeması üretir. */
export function createEmbedSchema(fieldNames: EmbedFieldNames) {
  return z.object({
    [fieldNames.isEmbed]: z.boolean(),
    [fieldNames.message]: z
      .string()
      .max(DISCORD_EMBED_LIMITS.message, {
        message: vt('validationMessageMax', { max: DISCORD_EMBED_LIMITS.message }),
      })
      .optional(),
    [fieldNames.embedTitle]: z
      .string()
      .max(DISCORD_EMBED_LIMITS.title, {
        message: vt('validationTitleMax', { max: DISCORD_EMBED_LIMITS.title }),
      })
      .optional(),
    [fieldNames.embedTitleUrl]: optionalUrl,
    [fieldNames.embedDescription]: z
      .string()
      .max(DISCORD_EMBED_LIMITS.description, {
        message: vt('validationDescriptionMax', { max: DISCORD_EMBED_LIMITS.description }),
      })
      .optional(),
    [fieldNames.embedColor]: z.string().optional(),
    [fieldNames.embedAuthorName]: z
      .string()
      .max(DISCORD_EMBED_LIMITS.authorName, {
        message: vt('validationAuthorNameMax', { max: DISCORD_EMBED_LIMITS.authorName }),
      })
      .optional(),
    [fieldNames.embedAuthorIcon]: optionalUrl,
    [fieldNames.embedAuthorUrl]: optionalUrl,
    [fieldNames.embedThumbnail]: optionalUrl,
    [fieldNames.embedImage]: optionalUrl,
    [fieldNames.embedFooter]: z
      .string()
      .max(DISCORD_EMBED_LIMITS.footer, {
        message: vt('validationFooterMax', { max: DISCORD_EMBED_LIMITS.footer }),
      })
      .optional(),
    [fieldNames.embedFooterIcon]: optionalUrl,
    [fieldNames.embedUseTimestamp]: z.boolean().optional(),
    [fieldNames.embedFieldsJson]: embedFieldsJsonSchema(),
  })
}

export type EmbedSchemaShape = ReturnType<typeof createEmbedSchema>
export type EmbedSchemaValues = z.infer<EmbedSchemaShape>

/** Şema dışında kullanım için tek alan doğrulama */
export function validateEmbedFieldsArray(fields: unknown): fields is z.infer<typeof embedFieldItemSchema>[] {
  if (!Array.isArray(fields)) return false
  if (fields.length > DISCORD_EMBED_LIMITS.maxFields) return false
  return fields.every((item) => embedFieldItemSchema.safeParse(item).success)
}

export { embedFieldItemSchema, parseEmbedFieldsJson }
