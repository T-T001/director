import type { PropsWithChildren } from 'react'

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return <div className="glass-surface-elevated rounded-2xl px-4 py-3 text-sm text-[var(--glass-text-secondary)]">{message}</div>
}

export function ErrorState({ message = 'Failed to load.' }: { message?: string }) {
  return <div className="glass-surface-elevated glass-danger rounded-2xl px-4 py-3 text-sm">{message}</div>
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="glass-surface-elevated rounded-2xl p-8 text-center">
      <h3 className="text-lg font-semibold text-[var(--glass-text-primary)]">{title}</h3>
      {description ? <p className="mt-2 text-sm text-[var(--glass-text-tertiary)]">{description}</p> : null}
    </div>
  )
}

export function SectionCard({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={['glass-surface rounded-2xl p-5', className ?? ''].join(' ')}>{children}</section>
}
