import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  /** Sağ tarafta gösterilecek aksiyonlar (buton vb.). Mobilde başlığın altına iner. */
  actions?: React.ReactNode
  className?: string
}

/**
 * Tüm panel sayfaları için standart, responsive sayfa başlığı.
 * Mobilde başlık ve aksiyonlar alt alta, sm+ ekranda yan yana gelir.
 * Not: h1 tek olmalı — sayfa başına yalnızca bir PageHeader kullanın.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
        {description && (
          <p className='text-muted-foreground text-sm'>{description}</p>
        )}
      </div>
      {actions && (
        <div className='flex flex-wrap items-center gap-2'>{actions}</div>
      )}
    </div>
  )
}
