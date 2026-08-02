import * as React from 'react'
import { Loader, SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SelectDropdownProps = {
  onValueChange?: (value: string) => void
  defaultValue: string | undefined
  placeholder?: string
  isPending?: boolean
  items: { label: string; value: string }[] | undefined
  disabled?: boolean
  className?: string
  isControlled?: boolean
  searchPlaceholder?: string
}

export function SelectDropdown({
  defaultValue,
  onValueChange,
  isPending,
  items,
  placeholder,
  disabled,
  className = '',
  isControlled = false,
  searchPlaceholder,
}: SelectDropdownProps) {
  const { t } = useTranslation('common')
  const [query, setQuery] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const searchPlaceholderText = searchPlaceholder ?? t('searchPlaceholder')
  const placeholderText = placeholder ?? t('select')

  const filteredItems = React.useMemo(() => {
    if (!items) return []
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter((item) => item.label.toLowerCase().includes(q))
  }, [items, query])

  const defaultState = isControlled
    ? { value: defaultValue, onValueChange }
    : { defaultValue, onValueChange }

  return (
    <Select
      {...defaultState}
      onOpenChange={(open) => {
        if (open) {
          setQuery('')
          requestAnimationFrame(() => inputRef.current?.focus())
        }
      }}
    >
      <FormControl>
        <SelectTrigger disabled={disabled} className={cn(className)}>
          <SelectValue placeholder={placeholderText} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {isPending ? (
          <SelectItem disabled value='loading' className='h-14'>
            <div className='flex items-center justify-center gap-2'>
              <Loader className='h-5 w-5 animate-spin' />
              {'  '}
              {t('loading')}
            </div>
          </SelectItem>
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
                  placeholder={searchPlaceholderText}
                  className='h-8 pl-8 pr-2 text-sm'
                />
              </div>
            </div>
            {filteredItems.length === 0 ? (
              <div className='text-muted-foreground py-4 text-center text-sm'>
                {query.trim() ? t('noResultsFound') : t('emptyList')}
              </div>
            ) : (
              filteredItems.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))
            )}
          </>
        )}
      </SelectContent>
    </Select>
  )
}
