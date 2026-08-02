import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { languageLabels, resolveActiveLocale, isLocaleActive, setLanguage, supportedLngs } from '@/i18n'

function LanguageSwitchButton() {
  const { t, i18n } = useTranslation()
  const active = resolveActiveLocale(i18n)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='scale-95 rounded-full'>
          <Languages className='size-[1.2rem]' />
          <span className='sr-only'>{t('common:language', { defaultValue: 'Dil' })}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {supportedLngs.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => setLanguage(lng)}
            className={isLocaleActive(active, lng) ? 'bg-accent' : ''}
          >
            {languageLabels[lng]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ThemeAndLanguageSwitches() {
  return (
    <div className='flex items-center gap-1'>
      <LanguageSwitchButton />
    </div>
  )
}
