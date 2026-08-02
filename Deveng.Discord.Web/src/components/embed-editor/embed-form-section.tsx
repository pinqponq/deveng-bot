import * as React from 'react'
import { useTranslation } from 'react-i18next'
import type { Control, FieldValues, Path, UseFormWatch } from 'react-hook-form'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ColorPicker } from '@/components/ui/color-picker'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import {
  DEFAULT_EMBED_COLOR,
  DISCORD_EMBED_LIMITS,
  type EmbedFieldNames,
  defaultEmbedFieldNames,
  getEmbedPreviewValues,
} from './embed-config'
import { EmbedFieldsEditor } from './embed-fields-editor'
import { EmbedPreview } from './embed-preview'
import { EmbedTagPopover } from './embed-tag-popover'

export interface EmbedFormSectionProps<T extends FieldValues> {
  control: Control<T>
  watch: UseFormWatch<T>
  fieldNames?: EmbedFieldNames
  showMessage?: boolean
  showIsEmbed?: boolean
  showPreview?: boolean
  descriptionTags?: readonly string[]
  className?: string
}

function CharacterCounter({ current, max }: { current: number; max: number }) {
  const over = current > max
  return (
    <span className={`text-xs tabular-nums ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
      {current}/{max}
    </span>
  )
}

export function EmbedFormSection<T extends FieldValues>({
  control,
  watch,
  fieldNames = defaultEmbedFieldNames,
  showMessage = true,
  showIsEmbed = true,
  showPreview = true,
  descriptionTags,
  className,
}: EmbedFormSectionProps<T>) {
  const { t } = useTranslation('embed')
  const descriptionRef = React.useRef<HTMLTextAreaElement | null>(null)

  const isEmbed = watch(fieldNames.isEmbed as Path<T>)
  const previewValues = getEmbedPreviewValues(
    (name) => watch(name as Path<T>),
    fieldNames
  )

  const asPath = (name: string) => name as Path<T>

  return (
    <div
      className={cn(
        'grid gap-6',
        showPreview && 'md:grid-cols-[minmax(0,1fr)_minmax(18rem,min(32rem,42vw))] md:items-start',
        className
      )}
    >
      <div className='min-w-0 space-y-4'>
        {showIsEmbed && (
          <FormField
            control={control}
            name={asPath(fieldNames.isEmbed)}
            render={({ field }) => (
              <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                <div className='space-y-0.5'>
                  <FormLabel className='text-sm font-medium'>{t('useEmbed')}</FormLabel>
                  <FormDescription>{t('useEmbedHint')}</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {showMessage && (
          <FormField
            control={control}
            name={asPath(fieldNames.message)}
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center justify-between gap-2'>
                  <FormLabel className='text-sm font-medium'>{t('embedMessage')}</FormLabel>
                  <CharacterCounter
                    current={String(field.value ?? '').length}
                    max={DISCORD_EMBED_LIMITS.message}
                  />
                </div>
                <FormControl>
                  <textarea
                    {...field}
                    value={String(field.value ?? '')}
                    rows={3}
                    className='flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                    placeholder={t('messagePlaceholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {(!showIsEmbed || isEmbed) && (
          <>
            <FormField
              control={control}
              name={asPath(fieldNames.embedTitle)}
              render={({ field }) => (
                <FormItem>
                  <div className='flex items-center justify-between gap-2'>
                    <FormLabel className='text-sm font-medium'>{t('embedTitle')}</FormLabel>
                    <CharacterCounter
                      current={String(field.value ?? '').length}
                      max={DISCORD_EMBED_LIMITS.title}
                    />
                  </div>
                  <FormControl>
                    <Input
                      className='h-10'
                      placeholder={t('titlePlaceholder')}
                      {...field}
                      value={String(field.value ?? '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={asPath(fieldNames.embedTitleUrl)}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm font-medium'>{t('embedTitleUrl')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='url'
                      className='h-10'
                      placeholder='https://…'
                      value={String(field.value ?? '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={asPath(fieldNames.embedDescription)}
              render={({ field }) => (
                <FormItem>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <FormLabel className='text-sm font-medium'>{t('embedDescription')}</FormLabel>
                      <CharacterCounter
                        current={String(field.value ?? '').length}
                        max={DISCORD_EMBED_LIMITS.description}
                      />
                    </div>
                    <EmbedTagPopover
                      value={String(field.value ?? '')}
                      onChange={field.onChange}
                      textareaRef={descriptionRef}
                      tags={descriptionTags}
                    />
                  </div>
                  <FormControl>
                    <textarea
                      {...field}
                      ref={(node) => {
                        descriptionRef.current = node
                        field.ref(node)
                      }}
                      rows={6}
                      value={String(field.value ?? '')}
                      className='flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                      placeholder={t('placeholderDesc')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Collapsible className='group rounded-lg border bg-muted/20 px-3 py-2'>
              <CollapsibleTrigger asChild>
                <Button
                  type='button'
                  variant='ghost'
                  className='flex h-10 w-full items-center justify-between px-1 font-medium text-muted-foreground hover:text-foreground'
                >
                  <span className='text-sm'>{t('authorSection')}</span>
                  <ChevronDown className='size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180' />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className='CollapsibleContent space-y-3 pb-2 pt-1'>
                <FormField
                  control={control}
                  name={asPath(fieldNames.embedAuthorName)}
                  render={({ field }) => (
                    <FormItem>
                      <div className='flex items-center justify-between gap-2'>
                        <FormLabel className='text-sm font-medium'>{t('embedAuthorName')}</FormLabel>
                        <CharacterCounter
                          current={String(field.value ?? '').length}
                          max={DISCORD_EMBED_LIMITS.authorName}
                        />
                      </div>
                      <FormControl>
                        <Input
                          className='h-10'
                          placeholder={t('authorNamePlaceholder')}
                          {...field}
                          value={String(field.value ?? '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={asPath(fieldNames.embedAuthorIcon)}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium'>{t('embedAuthorIcon')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type='url'
                          className='h-10'
                          placeholder='https://…'
                          value={String(field.value ?? '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={asPath(fieldNames.embedAuthorUrl)}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium'>{t('embedAuthorUrl')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type='url'
                          className='h-10'
                          placeholder='https://…'
                          value={String(field.value ?? '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <EmbedFieldsEditor control={control} fieldsJsonName={asPath(fieldNames.embedFieldsJson)} />

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={control}
                name={asPath(fieldNames.embedColor)}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium'>{t('embedColor')}</FormLabel>
                    <FormControl>
                      <ColorPicker
                        value={String(field.value ?? DEFAULT_EMBED_COLOR)}
                        onChange={field.onChange}
                        placeholder={DEFAULT_EMBED_COLOR}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={asPath(fieldNames.embedFooter)}
                render={({ field }) => (
                  <FormItem>
                    <div className='flex items-center justify-between gap-2'>
                      <FormLabel className='text-sm font-medium'>{t('embedFooter')}</FormLabel>
                      <CharacterCounter
                        current={String(field.value ?? '').length}
                        max={DISCORD_EMBED_LIMITS.footer}
                      />
                    </div>
                    <FormControl>
                      <Input
                        className='h-10'
                        placeholder={t('footerPlaceholder')}
                        {...field}
                        value={String(field.value ?? '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name={asPath(fieldNames.embedUseTimestamp)}
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-sm font-medium'>{t('embedTimestamp')}</FormLabel>
                    <FormDescription>{t('embedTimestampHint')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Collapsible className='group rounded-lg border bg-muted/20 px-3 py-2'>
              <CollapsibleTrigger asChild>
                <Button
                  type='button'
                  variant='ghost'
                  className='flex h-10 w-full items-center justify-between px-1 font-medium text-muted-foreground hover:text-foreground'
                >
                  <span className='text-sm'>{t('optionalMedia')}</span>
                  <ChevronDown className='size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180' />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className='CollapsibleContent space-y-3 pb-2 pt-1'>
                <FormField
                  control={control}
                  name={asPath(fieldNames.embedThumbnail)}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium'>{t('thumbnailUrl')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type='url'
                          className='h-10'
                          placeholder='https://…'
                          value={String(field.value ?? '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={asPath(fieldNames.embedImage)}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium'>{t('imageUrl')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type='url'
                          className='h-10'
                          placeholder='https://…'
                          value={String(field.value ?? '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={asPath(fieldNames.embedFooterIcon)}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium'>{t('embedFooterIcon')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type='url'
                          className='h-10'
                          placeholder='https://…'
                          value={String(field.value ?? '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className='text-xs text-muted-foreground'>{t('optionalMediaHint')}</p>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>

      {showPreview && (
        <div className='lg:sticky lg:top-24 lg:self-start'>
          <EmbedPreview values={previewValues} showMessage={showMessage} />
        </div>
      )}
    </div>
  )
}
