import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { languageLabels, resolveActiveLocale, isLocaleActive, setLanguage, type Locale, supportedLngs } from '@/i18n'

export function LanguageSwitch() {
  const { i18n } = useTranslation()
  const active = resolveActiveLocale(i18n)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='sm'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Languages className='size-4' />
              <span>{languageLabels[active as Locale] ?? languageLabels.tr}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side='top' align='start' sideOffset={4}>
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
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
