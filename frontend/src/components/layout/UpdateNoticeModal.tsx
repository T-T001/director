import { Sparkles, ExternalLink } from 'lucide-react'

import { Modal } from '../ui/Modal'

type Props = {
  open: boolean
  onClose: () => void
  onDismiss: () => void
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseName: string
  publishedAt: string
}

export function UpdateNoticeModal({
  open,
  onClose,
  onDismiss,
  currentVersion,
  latestVersion,
  releaseUrl,
  releaseName,
  publishedAt,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="新版本可用" subtitle="建议尽快升级以获得更好的体验" width={500}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-4 py-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--glass-tone-warning-bg)] to-white text-[var(--glass-tone-warning-fg)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--glass-text-primary)]">{releaseName}</p>
            <p className="mt-0.5 text-[11px] text-[var(--glass-text-tertiary)]">发布于 {publishedAt}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--glass-text-tertiary)]">当前版本</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--glass-text-secondary)]">v{currentVersion}</p>
          </div>
          <div className="rounded-xl border border-[var(--glass-tone-warning-fg)]/30 bg-[var(--glass-tone-warning-bg)]/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--glass-tone-warning-fg)]">最新版本</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--glass-tone-warning-fg)]">v{latestVersion}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onDismiss}
            className="glass-btn-base glass-btn-ghost px-3 py-1.5 text-xs"
          >
            稍后再说
          </button>
          <a
            href={releaseUrl}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="glass-btn-base glass-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            前往查看
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </Modal>
  )
}
