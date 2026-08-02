import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Loader, SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  SelectItem,
  SelectScrollDownButton,
  SelectScrollUpButton,
} from '@/components/ui/select'

export type SearchableSelectItem = { value: string; label: string }

type SearchableSelectContentProps = Omit<
  React.ComponentProps<typeof SelectPrimitive.Content>,
  'children'
> & {
  items: SearchableSelectItem[]
  searchPlaceholder?: string
  loading?: boolean
}

function SearchableSelectContent({
  className,
  position = 'popper',
  items,
  searchPlaceholder,
  loading = false,
  ...props
}: SearchableSelectContentProps) {
  const { t } = useTranslation('common')
  const [query, setQuery] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const placeholder = searchPlaceholder ?? t('searchPlaceholder')

  const filtered = React.useMemo(() => {
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter((item) => item.label.toLowerCase().includes(q))
  }, [items, query])

  React.useEffect(() => {
    if (!loading) requestAnimationFrame(() => inputRef.current?.focus())
  }, [loading])

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot='select-content'
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-hidden rounded-md border shadow-md flex flex-col',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        {...props}
      >
        {loading ? (
          <div className='flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground'>
            <Loader className='size-4 animate-spin' />
            {t('loading')}
          </div>
        ) : (
          <>
            <div
              className='sticky top-0 z-10 border-b bg-popover p-1'
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className='relative'>
                <SearchIcon className='text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2' />
                <Input
                  ref={inputRef}
                  type='text'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder={placeholder}
                  className='h-8 pl-8 pr-2 text-sm'
                />
              </div>
            </div>
            <SelectScrollUpButton />
            <SelectPrimitive.Viewport
              className={cn(
                'p-1 overflow-y-auto overflow-x-hidden',
                position === 'popper' &&
                  'min-h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1'
              )}
            >
              {filtered.length === 0 ? (
                <div className='text-muted-foreground py-4 text-center text-sm'>
                  {query.trim() ? 'Sonuç bulunamadı' : 'Liste boş'}
                </div>
              ) : (
                filtered.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))
              )}
            </SelectPrimitive.Viewport>
            <SelectScrollDownButton />
          </>
        )}
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export { SearchableSelectContent }
