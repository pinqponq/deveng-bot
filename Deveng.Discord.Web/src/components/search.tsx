import { SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useSearch } from '@/context/search-provider'
import { Button } from './ui/button'

type SearchProps = {
  className?: string
  type?: React.HTMLInputTypeAttribute
  placeholder?: string
}

export function Search({
  className = '',
  placeholder,
}: SearchProps) {
  const { t } = useTranslation('common')
  const { setOpen } = useSearch()
  const label = placeholder ?? t('search')
  return (
    <Button
      variant='outline'
      aria-label={label}
      className={cn(
        'bg-muted/25 group text-muted-foreground hover:bg-accent h-8 justify-center gap-2 rounded-md text-sm font-normal shadow-none',
        // Mobilde yalnızca ikon (kare buton); sm+ ekranda etiketli genişleyen buton
        'w-8 px-0 sm:w-40 sm:justify-start sm:px-3 lg:w-52 xl:w-64',
        className
      )}
      onClick={() => setOpen(true)}
    >
      <SearchIcon aria-hidden='true' className='shrink-0' size={16} />
      <span className='hidden sm:inline'>{label}</span>
    </Button>
  )
}
