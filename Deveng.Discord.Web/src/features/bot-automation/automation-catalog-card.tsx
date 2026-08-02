import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CatalogVariant } from './automation-catalog'

const accent: Record<CatalogVariant, string> = {
  trigger: 'from-primary/80 via-primary/35 to-transparent',
  condition: 'from-chart-2/80 via-chart-2/35 to-transparent',
  action: 'from-chart-3/80 via-chart-3/35 to-transparent',
}

const iconBox: Record<CatalogVariant, string> = {
  trigger: 'border-primary/35 bg-primary/10 text-primary',
  condition: 'border-chart-2/35 bg-chart-2/10 text-chart-2',
  action: 'border-chart-3/35 bg-chart-3/10 text-chart-3',
}

export function AutomationCatalogCard({
  variant,
  icon: Icon,
  label,
  disabled,
  onSelect,
  'aria-label': ariaLabel,
}: {
  variant: CatalogVariant
  icon: LucideIcon
  label: string
  disabled?: boolean
  onSelect: () => void
  'aria-label'?: string
}) {
  return (
    <button
      type='button'
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      onClick={onSelect}
      className={cn(
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 text-start transition-colors',
        'hover:border-primary/25 hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        disabled && 'pointer-events-none opacity-45'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-90 transition group-hover:opacity-100',
          accent[variant]
        )}
        aria-hidden
      />
      <div
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-lg border',
          iconBox[variant]
        )}
      >
        <Icon className='size-5' strokeWidth={1.75} />
      </div>
      <span className='min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground'>{label}</span>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-lg font-light transition-colors',
          variant === 'trigger' &&
            'text-primary group-hover:border-primary/40 group-hover:bg-primary/5',
          variant === 'condition' &&
            'text-chart-2 group-hover:border-chart-2/40 group-hover:bg-chart-2/5',
          variant === 'action' &&
            'text-chart-3 group-hover:border-chart-3/40 group-hover:bg-chart-3/5'
        )}
        aria-hidden
      >
        <Plus className='size-5' strokeWidth={2} />
      </span>
    </button>
  )
}
