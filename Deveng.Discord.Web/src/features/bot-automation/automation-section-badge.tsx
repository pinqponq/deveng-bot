import { cn } from '@/lib/utils'

type BadgeVariant = 'trigger' | 'condition' | 'action'

const styles: Record<BadgeVariant, string> = {
  trigger: 'border-primary/40 bg-primary/10 text-primary shadow-sm',
  condition: 'border-chart-2/45 bg-chart-2/10 text-chart-2 shadow-sm',
  action: 'border-chart-3/45 bg-chart-3/10 text-chart-3 shadow-sm',
}

export function AutomationSectionBadge({
  variant,
  children,
  className,
}: {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
