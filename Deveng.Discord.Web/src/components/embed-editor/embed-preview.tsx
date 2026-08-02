import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_EMBED_COLOR, type EmbedField, type EmbedPreviewValues } from './embed-config'
import { cn } from '@/lib/utils'

export interface EmbedPreviewProps {
  values: EmbedPreviewValues
  className?: string
  showMessage?: boolean
}

/** Discord (2024) koyu tema paleti — önizleme her zaman koyu render edilir. */
const DISCORD = {
  chatBg: '#313338',
  embedBg: '#2b2d31',
  text: '#dbdee1',
  heading: '#f2f3f5',
  link: '#00a8fc',
  muted: '#949ba4',
  divider: '#3f4147',
  codeBg: '#1e1f22',
} as const

// Sıralama önemli: uzun/özel token'lar önce eşleşmeli (** > *, __ > _)
const MARKDOWN_TOKEN =
  /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g

function renderDiscordMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return []
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let tokenIndex = 0
  let match: RegExpExecArray | null

  const regex = new RegExp(MARKDOWN_TOKEN.source, 'g')
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    const key = `${keyPrefix}-${tokenIndex++}`

    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key} className='font-semibold' style={{ color: DISCORD.heading }}>
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('__') && token.endsWith('__')) {
      nodes.push(
        <u key={key} className='underline'>
          {token.slice(2, -2)}
        </u>
      )
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      nodes.push(
        <s key={key} className='line-through'>
          {token.slice(2, -2)}
        </s>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          className='rounded px-1 py-0.5 font-mono text-[0.85em]'
          style={{ backgroundColor: DISCORD.codeBg }}
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      nodes.push(
        <em key={key} className='italic'>
          {token.slice(1, -1)}
        </em>
      )
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline'
            style={{ color: DISCORD.link }}
          >
            {linkMatch[1]}
          </a>
        )
      } else {
        nodes.push(token)
      }
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function MarkdownText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('whitespace-pre-wrap break-words leading-[1.375]', className)}>
      {renderDiscordMarkdown(text, 'md')}
    </div>
  )
}

function EmbedFieldsGrid({ fields }: { fields: EmbedField[] }) {
  if (fields.length === 0) return null

  return (
    <div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3'>
      {fields.map((field, index) => (
        <div
          key={`${field.name}-${index}`}
          className={cn(field.inline ? 'sm:col-span-1' : 'sm:col-span-3')}
        >
          <div className='mb-0.5 text-xs font-semibold' style={{ color: DISCORD.heading }}>
            {field.name || '—'}
          </div>
          <MarkdownText text={field.value} className='text-sm' />
        </div>
      ))}
    </div>
  )
}

export function EmbedPreview({ values, className, showMessage = true }: EmbedPreviewProps) {
  const { t } = useTranslation('embed')
  const color = values.color?.trim() || DEFAULT_EMBED_COLOR
  const hasEmbedContent =
    values.title ||
    values.description ||
    values.authorName ||
    values.thumbnail ||
    values.image ||
    values.footer ||
    values.fields.length > 0

  return (
    <div className={cn('space-y-2', className)}>
      <p className='text-sm font-medium'>{t('livePreview')}</p>
      <p className='text-xs text-muted-foreground'>{t('previewHint')}</p>
      <div
        className='overflow-hidden rounded-lg border border-black/20 p-4 shadow-sm'
        style={{ backgroundColor: DISCORD.chatBg, color: DISCORD.text }}
      >
        {showMessage && values.message?.trim() && (
          <div className='mb-2 whitespace-pre-wrap break-words text-sm'>{values.message}</div>
        )}
        {(values.isEmbed || hasEmbedContent) && (
          <div
            className='max-w-[440px] overflow-hidden rounded'
            style={{
              borderLeft: `4px solid ${color}`,
              backgroundColor: DISCORD.embedBg,
            }}
          >
            <div className='space-y-2 p-3'>
              {values.authorName && (
                <div className='mb-1 flex items-center gap-2'>
                  {values.authorIcon && (
                    <img
                      src={values.authorIcon}
                      alt=''
                      className='size-6 rounded-full object-cover'
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  {values.authorUrl ? (
                    <a
                      href={values.authorUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-sm font-semibold hover:underline'
                      style={{ color: DISCORD.heading }}
                    >
                      {values.authorName}
                    </a>
                  ) : (
                    <span className='text-sm font-semibold' style={{ color: DISCORD.heading }}>
                      {values.authorName}
                    </span>
                  )}
                </div>
              )}

              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0 flex-1'>
                  {values.title &&
                    (values.titleUrl ? (
                      <a
                        href={values.titleUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='mb-1.5 block text-base font-semibold leading-tight hover:underline'
                        style={{ color: DISCORD.link }}
                      >
                        {values.title}
                      </a>
                    ) : (
                      <div
                        className='mb-1.5 text-base font-semibold leading-tight'
                        style={{ color: DISCORD.heading }}
                      >
                        {values.title}
                      </div>
                    ))}
                  {values.description ? (
                    <MarkdownText text={values.description} className='text-sm' />
                  ) : (
                    !values.title &&
                    values.fields.length === 0 && (
                      <div className='text-sm leading-relaxed' style={{ color: DISCORD.muted }}>
                        {t('previewPlaceholder')}
                      </div>
                    )
                  )}
                  <EmbedFieldsGrid fields={values.fields} />
                </div>
                {values.thumbnail && (
                  <div className='ml-2 shrink-0'>
                    <img
                      src={values.thumbnail}
                      alt=''
                      className='size-20 rounded object-contain'
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              {values.image && (
                <div className='mt-1'>
                  <img
                    src={values.image}
                    alt=''
                    className='max-h-72 max-w-full rounded object-contain'
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {(values.footer || values.useTimestamp) && (
                <div
                  className='mt-2 flex items-center gap-2 border-t pt-2'
                  style={{ borderColor: DISCORD.divider }}
                >
                  {values.footerIcon && (
                    <img
                      src={values.footerIcon}
                      alt=''
                      className='size-5 rounded-full object-cover'
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <div className='text-xs leading-tight' style={{ color: DISCORD.muted }}>
                    {values.footer}
                    {values.footer && values.useTimestamp && <span className='mx-1'>•</span>}
                    {values.useTimestamp && <span>{new Date().toLocaleString()}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
