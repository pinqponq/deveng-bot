import * as React from 'react'
import { cn } from '@/lib/utils'

export type SectionNavItem = {
  /** PageSection id ile eşleşmeli. */
  id: string
  label: React.ReactNode
}

type SectionNavProps = {
  items: SectionNavItem[]
  className?: string
  /** Yapışkan üst ofset (px). Varsayılan header yüksekliği (64). */
  topOffset?: number
}

/**
 * Sekme çubuğunun yerini alan yapışkan bölüm navigasyonu.
 * Çıpa linkleriyle bölümlere yumuşak kaydırır; mobilde yatay kaydırılabilir.
 * Görünürdeki bölümü IntersectionObserver ile vurgular.
 */
export function SectionNav({ items, className, topOffset = 64 }: SectionNavProps) {
  const [active, setActive] = React.useState<string | undefined>(items[0]?.id)

  React.useEffect(() => {
    if (items.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: `-${topOffset + 48}px 0px -60% 0px`, threshold: 0 }
    )
    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [items, topOffset])

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  if (items.length === 0) return null

  return (
    <nav
      aria-label='Bölümler'
      className={cn(
        'bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky z-30 -mx-4 border-b px-4 backdrop-blur',
        className
      )}
      style={{ top: topOffset }}
    >
      <div className='no-scrollbar flex gap-1 overflow-x-auto py-2'>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleClick(e, item.id)}
            aria-current={active === item.id ? 'true' : undefined}
            className={cn(
              'focus-visible:ring-ring inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none',
              active === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
