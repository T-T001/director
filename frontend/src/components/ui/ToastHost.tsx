import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

import { useToastStore, type ToastTone } from './toast.store'

const toneStyles: Record<ToastTone, string> = {
  info: 'border-[var(--glass-stroke-base)] text-[var(--glass-text-secondary)]',
  success: 'border-[var(--glass-tone-success-fg)]/35 text-[var(--glass-tone-success-fg)]',
  error: 'border-[var(--glass-tone-danger-fg)]/40 text-[var(--glass-tone-danger-fg)]',
}

const toneIcons: Record<ToastTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
}

export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[120] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((toast) => {
        const Icon = toneIcons[toast.tone]
        return (
          <div
            key={toast.id}
            className={[
              'glass-modal-shell pointer-events-auto flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-[var(--glass-shadow-md)] animate-modal-in',
              toneStyles[toast.tone],
            ].join(' ')}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="min-w-0 flex-1 break-words leading-relaxed">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-full p-0.5 text-[var(--glass-text-tertiary)] transition hover:text-[var(--glass-text-primary)]"
              aria-label="关闭提示"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
