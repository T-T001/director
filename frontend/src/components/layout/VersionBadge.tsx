import { Sparkles, Upload, RefreshCcw } from 'lucide-react'

import { useUpdateNotice } from '../../hooks/useUpdateNotice'
import { UpdateNoticeModal } from './UpdateNoticeModal'

export function VersionBadge() {
  const {
    currentVersion,
    update,
    shouldPulse,
    showModal,
    openModal,
    closeModal,
    dismissCurrentUpdate,
    checkNow,
    checkState,
  } = useUpdateNotice()

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={!update}
        className={[
          'relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.02em] transition-all',
          update
            ? 'border-[var(--glass-tone-warning-fg)]/40 bg-gradient-to-br from-[var(--glass-tone-warning-bg)] to-[var(--glass-bg-surface-strong)] text-[var(--glass-tone-warning-fg)] shadow-[0_8px_24px_-16px_rgba(245,158,11,0.9)] hover:brightness-105'
            : 'border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] text-[var(--glass-text-secondary)] disabled:cursor-default',
        ].join(' ')}
        aria-label="查看版本信息"
      >
        <Sparkles className={['h-3.5 w-3.5', update ? 'animate-spin-slow' : ''].join(' ')} />
        Beta v{currentVersion}
        {update ? (
          <span className="relative inline-flex items-center">
            {shouldPulse ? (
              <span className="absolute -inset-1.5 animate-ping rounded-full bg-[var(--glass-tone-warning-fg)] opacity-25" />
            ) : null}
            <span className="relative inline-flex items-center gap-1 rounded-full bg-[var(--glass-tone-warning-fg)]/16 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em]">
              <Upload className="h-3 w-3" />
              有更新
            </span>
          </span>
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => void checkNow()}
        disabled={checkState === 'checking'}
        className="rounded-full p-1.5 text-[var(--glass-text-tertiary)] transition-colors hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-text-secondary)] disabled:opacity-40"
        title="检查更新"
        aria-label="检查更新"
      >
        <RefreshCcw className={['h-3.5 w-3.5', checkState === 'checking' ? 'animate-spin' : ''].join(' ')} />
      </button>

      {checkState === 'up-to-date' && (
        <span className="text-[11px] font-medium text-[var(--glass-tone-success-fg)]">✓ 已是最新版本</span>
      )}

      {update && (
        <UpdateNoticeModal
          open={showModal}
          onClose={closeModal}
          onDismiss={dismissCurrentUpdate}
          currentVersion={currentVersion}
          latestVersion={update.latestVersion}
          releaseUrl={update.releaseUrl}
          releaseName={update.releaseName}
          publishedAt={update.publishedAt}
        />
      )}
    </>
  )
}
