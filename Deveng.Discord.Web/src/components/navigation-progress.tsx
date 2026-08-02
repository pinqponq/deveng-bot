import { useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function NavigationProgress() {
  const barRef = useRef<HTMLDivElement>(null)
  const state = useRouterState()
  const isPending = state.status === 'pending'

  useEffect(() => {
    const el = barRef.current
    if (!el) return

    if (isPending) {
      el.dataset.state = 'pending'
      return
    }

    if (el.dataset.state === 'pending') {
      el.dataset.state = 'complete'
      const timer = window.setTimeout(() => {
        el.dataset.state = 'idle'
      }, 450)
      return () => window.clearTimeout(timer)
    }

    el.dataset.state = 'idle'
  }, [isPending])

  return (
    <div
      ref={barRef}
      data-state='idle'
      className={cn('navigation-progress pointer-events-none fixed inset-x-0 top-0 z-[99999999999] h-0.5')}
      aria-hidden
    >
      <div className='navigation-progress__bar' />
    </div>
  )
}
