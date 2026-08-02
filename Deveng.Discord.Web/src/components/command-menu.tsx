import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { useAuthStore } from '@/stores/auth-store'
import { resolveNavUrl, splitHrefPathAndSearch } from '@/utils/nav-url'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { sidebarData } from './layout/data/sidebar-data'
import { ScrollArea } from './ui/scroll-area'

export function CommandMenu() {
  const { t } = useTranslation(['common', 'nav'])
  const navigate = useNavigate()
  const { open, setOpen } = useSearch()
  const guildId = useAuthStore((s) => s.auth.selectedGuild?.id)

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('common:commandSearchPlaceholder')} />
      <CommandList>
        <ScrollArea type='hover' className='h-72 pe-1'>
          <CommandEmpty>{t('common:noResultsFound')}</CommandEmpty>
          {sidebarData.navGroups.map((group) => (
            <CommandGroup key={group.titleKey ?? group.title} heading={group.titleKey ? t(group.titleKey) : group.title}>
              {group.items.map((navItem, i) => {
                if (navItem.url)
                  return (
                    <CommandItem
                      key={`${navItem.url}-${i}`}
                      value={navItem.titleKey ? t(navItem.titleKey) : navItem.title}
                      onSelect={() => {
                        const url = resolveNavUrl(navItem.url as string, guildId)
                        const { to, search } = splitHrefPathAndSearch(url)
                        runCommand(() => navigate({ to, ...(search ? { search } : {}) }))
                      }}
                    >
                      <div className='flex size-4 items-center justify-center'>
                        <ArrowRight className='text-muted-foreground/80 size-2' />
                      </div>
                      {navItem.titleKey ? t(navItem.titleKey) : navItem.title}
                    </CommandItem>
                  )

                return navItem.items?.map((subItem, i) => (
                  <CommandItem
                    key={`${navItem.titleKey}-${subItem.url}-${i}`}
                    value={[navItem.titleKey ? t(navItem.titleKey) : navItem.title, subItem.titleKey ? t(subItem.titleKey) : subItem.title].join(' - ')}
                    onSelect={() => {
                      const url = resolveNavUrl(subItem.url as string, guildId)
                      const { to, search } = splitHrefPathAndSearch(url)
                      runCommand(() => navigate({ to, ...(search ? { search } : {}) }))
                    }}
                  >
                    <div className='flex size-4 items-center justify-center'>
                      <ArrowRight className='text-muted-foreground/80 size-2' />
                    </div>
                    {navItem.titleKey ? t(navItem.titleKey) : navItem.title} <ChevronRight /> {subItem.titleKey ? t(subItem.titleKey) : subItem.title}
                  </CommandItem>
                ))
              })}
            </CommandGroup>
          ))}
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  )
}
