import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ImageUploadTileProps = {
  label: string
  hint?: string
  value?: string | null
  onChange: (value: string | null) => void
  maxSizeBytes: number
  aspectClass?: string
  placeholderText?: string
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export function ImageUploadTile({
  label,
  hint,
  value,
  onChange,
  maxSizeBytes,
  aspectClass = 'aspect-square',
  placeholderText,
}: ImageUploadTileProps) {
  const { t } = useTranslation('customBots')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      window.alert(t('invalidImageType'))
      return
    }
    if (file.size > maxSizeBytes) {
      window.alert(t('imageTooLarge', { maxKb: Math.round(maxSizeBytes / 1024) }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className='space-y-2'>
      <p className='text-sm font-semibold'>{label}</p>
      <button
        type='button'
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group relative w-full overflow-hidden rounded-lg border border-border/80 bg-muted/20 transition hover:border-primary/40',
          aspectClass
        )}
      >
        {value ? (
          <>
            <img src={value} alt='' className='size-full object-cover' />
            <span
              role='button'
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onChange(null)
                }
              }}
              className='absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100'
            >
              <X className='size-4' />
            </span>
          </>
        ) : (
          <div className='flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground'>
            <ImagePlus className='size-8 opacity-60' />
            <p className='text-xs leading-relaxed'>
              {placeholderText ?? t('clickToUpload')}
            </p>
          </div>
        )}
      </button>
      {hint ? <p className='text-muted-foreground text-xs'>{hint}</p> : null}
      <input
        ref={inputRef}
        type='file'
        accept='image/png,image/jpeg,image/gif,image/webp'
        className='hidden'
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
