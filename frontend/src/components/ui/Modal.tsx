import { useEffect, type PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type ModalProps = PropsWithChildren<{
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  width?: number
}>

export function Modal({ open, onClose, title, subtitle, width = 480, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="glass-overlay absolute inset-0 animate-overlay-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-modal-shell animate-modal-in relative w-full max-w-full"
        style={{ maxWidth: width }}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-3 border-b border-[var(--glass-stroke-soft)] px-6 py-4">
            <div>
              {title && <h2 className="text-base font-semibold text-[var(--glass-text-primary)]">{title}</h2>}
              {subtitle && <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-[var(--glass-text-tertiary)] transition hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-text-primary)]"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
