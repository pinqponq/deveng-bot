import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Braces } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EMBED_DESCRIPTION_INSERT_TAGS } from './embed-config'

export interface EmbedTagPopoverProps {
  value: string
  onChange: (value: string) => void
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
  tags?: readonly string[]
  align?: 'start' | 'center' | 'end'
  buttonClassName?: string
}

export function insertTextAtCursor(
  el: HTMLTextAreaElement | null,
  current: string,
  insert: string,
  onChange: (value: string) => void
) {
  const start = el?.selectionStart ?? current.length
  const end = el?.selectionEnd ?? current.length
  const next = current.slice(0, start) + insert + current.slice(end)
  onChange(next)
  requestAnimationFrame(() => {
    if (!el) return
    el.focus()
    const pos = start + insert.length
    el.setSelectionRange(pos, pos)
  })
}

export function EmbedTagPopover({
  value,
  onChange,
  textareaRef,
  tags = EMBED_DESCRIPTION_INSERT_TAGS,
  align = 'end',
  buttonClassName,
}: EmbedTagPopoverProps) {
  const { t } = useTranslation('embed')

  const handleInsert = React.useCallback(
    (tag: string) => {
      insertTextAtCursor(textareaRef?.current ?? null, value, tag, onChange)
    },
    [onChange, textareaRef, value]
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className={buttonClassName ?? 'h-8 gap-1.5 text-xs'}
        >
          <Braces className='size-3.5' />
          {t('insertTag')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className='w-72 p-3'>
        <p className='mb-2 text-xs text-muted-foreground'>{t('tagsPopoverHint')}</p>
        <div className='grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto'>
          {tags.map((tag) => (
            <Button
              key={tag}
              type='button'
              variant='secondary'
              size='sm'
              className='h-8 font-mono text-xs'
              onClick={() => handleInsert(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
