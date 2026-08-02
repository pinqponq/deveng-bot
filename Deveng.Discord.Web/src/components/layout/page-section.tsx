import * as React from 'react'
import { cn } from '@/lib/utils'

type PageSectionProps = {
  /** SectionNav çıpa linkleri için benzersiz id. */
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  /** Bölüm başlığının sağında gösterilecek aksiyonlar. */
  actions?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/**
 * Sekmelerin (Tabs) yerini alan tek-akış bölümü.
 * Her bölüm bir `<section id>` olur; SectionNav bu id'lere atlar.
 * `scroll-mt-*` yapışkan header + SectionNav yüksekliğini telafi eder.
 */
export function PageSection({
  id,
  title,
  description,
  actions,
  className,
  children,
}: PageSectionProps) {
  const hasHeading = Boolean(title || description || actions)

  return (
    <section id={id} className={cn('scroll-mt-32 space-y-4', className)}>
      {hasHeading && (
        <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
          {(title || description) && (
            <div className='space-y-1'>
              {title && (
                <h2 className='text-lg font-semibold tracking-tight'>{title}</h2>
              )}
              {description && (
                <p className='text-muted-foreground text-sm'>{description}</p>
              )}
            </div>
          )}
          {actions && (
            <div className='flex flex-wrap items-center gap-2'>{actions}</div>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
