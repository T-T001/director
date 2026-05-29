import type { PropsWithChildren } from 'react'

export function LoadingState({ message = '加载中...' }: { message?: string }) {
  return <div className="glass-surface-elevated rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--glass-text-secondary)]">{message}</div>
}

export function ErrorState({ message = '加载失败。' }: { message?: string }) {
  return <div className="glass-surface-elevated glass-danger rounded-2xl border border-[var(--glass-tone-danger-fg)]/20 px-4 py-3 text-sm font-semibold">{message}</div>
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="glass-surface-elevated rounded-3xl p-8 text-center">
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--glass-accent-cyan)]">No scene loaded</p>
      <h3 className="text-lg font-black tracking-wide text-[var(--glass-text-primary)]">{title}</h3>
      {description ? <p className="mt-2 text-sm text-[var(--glass-text-tertiary)]">{description}</p> : null}
    </div>
  )
}

export function SectionCard({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={['glass-surface rounded-3xl p-5', className ?? ''].join(' ')}>{children}</section>
}
