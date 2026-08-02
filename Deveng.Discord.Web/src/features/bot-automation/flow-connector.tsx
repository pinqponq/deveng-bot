import { cn } from '@/lib/utils'

/** Dikey akış bağlayıcı (yalnızca görsel; tema renkleri) */
export function FlowConnector({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex flex-col items-center py-1', className)}
      aria-hidden
    >
      <div className='h-10 w-0 shrink-0 border-l-2 border-dashed border-primary/45' />
      <div className='size-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/20' />
      <div className='h-10 w-0 shrink-0 border-l-2 border-dashed border-primary/45' />
    </div>
  )
}
