import { useTranslation } from 'react-i18next'
import type { Control, FieldValues, Path } from 'react-hook-form'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  DISCORD_EMBED_LIMITS,
  type EmbedField,
  parseEmbedFieldsJson,
  serializeEmbedFields,
} from './embed-config'

export interface EmbedFieldsEditorProps<T extends FieldValues> {
  control: Control<T>
  /** embedFieldsJson form alan adı */
  fieldsJsonName: Path<T>
}

function CharacterCounter({ current, max }: { current: number; max: number }) {
  const over = current > max
  return (
    <span className={`text-xs tabular-nums ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
      {current}/{max}
    </span>
  )
}

export function EmbedFieldsEditor<T extends FieldValues>({
  control,
  fieldsJsonName,
}: EmbedFieldsEditorProps<T>) {
  const { t } = useTranslation('embed')

  return (
    <FormField
      control={control}
      name={fieldsJsonName}
      render={({ field }) => {
        const fields = parseEmbedFieldsJson(String(field.value ?? '[]'))

        const updateFields = (next: EmbedField[]) => {
          field.onChange(serializeEmbedFields(next))
        }

        const addField = () => {
          if (fields.length >= DISCORD_EMBED_LIMITS.maxFields) return
          updateFields([...fields, { name: '', value: '', inline: false }])
        }

        const removeField = (index: number) => {
          updateFields(fields.filter((_, i) => i !== index))
        }

        const moveField = (index: number, direction: -1 | 1) => {
          const target = index + direction
          if (target < 0 || target >= fields.length) return
          const next = [...fields]
          const temp = next[index]
          next[index] = next[target]
          next[target] = temp
          updateFields(next)
        }

        const patchField = (index: number, patch: Partial<EmbedField>) => {
          updateFields(fields.map((item, i) => (i === index ? { ...item, ...patch } : item)))
        }

        return (
          <FormItem>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <FormLabel className='text-sm font-medium'>{t('embedFields')}</FormLabel>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 gap-1.5'
                onClick={addField}
                disabled={fields.length >= DISCORD_EMBED_LIMITS.maxFields}
              >
                <Plus className='size-3.5' />
                {t('addField')}
              </Button>
            </div>
            <FormControl>
              <div className='space-y-3'>
                {fields.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>{t('noEmbedFields')}</p>
                ) : (
                  fields.map((item, index) => (
                    <div
                      key={`embed-field-${index}`}
                      className='space-y-3 rounded-lg border bg-muted/20 p-3'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span className='text-xs font-medium text-muted-foreground'>
                          {t('fieldNumber', { n: index + 1 })}
                        </span>
                        <div className='flex items-center gap-1'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='size-7'
                            onClick={() => moveField(index, -1)}
                            disabled={index === 0}
                            aria-label={t('moveFieldUp')}
                          >
                            <ChevronUp className='size-4' />
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='size-7'
                            onClick={() => moveField(index, 1)}
                            disabled={index === fields.length - 1}
                            aria-label={t('moveFieldDown')}
                          >
                            <ChevronDown className='size-4' />
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='size-7 text-destructive hover:text-destructive'
                            onClick={() => removeField(index)}
                            aria-label={t('removeField')}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      </div>

                      <div className='space-y-1.5'>
                        <div className='flex items-center justify-between gap-2'>
                          <Label className='text-xs'>{t('fieldName')}</Label>
                          <CharacterCounter
                            current={item.name.length}
                            max={DISCORD_EMBED_LIMITS.fieldName}
                          />
                        </div>
                        <Input
                          value={item.name}
                          onChange={(e) => patchField(index, { name: e.target.value })}
                          placeholder={t('fieldNamePlaceholder')}
                          className='h-9'
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <div className='flex items-center justify-between gap-2'>
                          <Label className='text-xs'>{t('fieldValue')}</Label>
                          <CharacterCounter
                            current={item.value.length}
                            max={DISCORD_EMBED_LIMITS.fieldValue}
                          />
                        </div>
                        <textarea
                          value={item.value}
                          onChange={(e) => patchField(index, { value: e.target.value })}
                          placeholder={t('fieldValuePlaceholder')}
                          rows={3}
                          className='flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                        />
                      </div>

                      <div className='flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2'>
                        <div className='space-y-0.5'>
                          <Label className='text-sm'>{t('fieldInline')}</Label>
                          <p className='text-xs text-muted-foreground'>{t('fieldInlineHint')}</p>
                        </div>
                        <Switch
                          checked={item.inline}
                          onCheckedChange={(checked) => patchField(index, { inline: checked })}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </FormControl>
            <p className='text-xs text-muted-foreground'>
              {t('embedFieldsLimit', { max: DISCORD_EMBED_LIMITS.maxFields })}
            </p>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
