import { NavLink } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'

import type { WorkspaceStage } from '../../app/router/routes'
import { buildWorkspaceStagePath, workspaceStageItems } from '../../app/router/routes'

export type WorkspaceStageStatus = 'empty' | 'active' | 'processing' | 'ready'

export type WorkspaceStageSignal = {
  status: WorkspaceStageStatus
  detail: string
}

const statusText: Record<WorkspaceStageStatus, string> = {
  empty: '待准备',
  active: '制作中',
  processing: '任务中',
  ready: '已就绪',
}

export function WorkspaceStageNav({
  projectId,
  episodeId,
  currentStage,
  signals = {},
}: {
  projectId: string
  episodeId: string
  currentStage: WorkspaceStage
  signals?: Partial<Record<WorkspaceStage, WorkspaceStageSignal>>
}) {
  return (
    <nav className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] gap-3 overflow-x-auto pb-2">
      {workspaceStageItems.map((item, index) => {
        const to = buildWorkspaceStagePath(projectId, episodeId, item.stage)
        const isActive = currentStage === item.stage
        const signal = signals[item.stage] ?? { status: 'empty' as const, detail: item.description }
        const isReady = signal.status === 'ready'
        const isProcessing = signal.status === 'processing'
        return (
          <NavLink
            key={item.stage}
            to={to}
            className={[
              'group relative min-w-[160px] overflow-hidden rounded-2xl border px-4 py-3 text-sm transition-all',
              isActive
                ? 'animate-capsule-glow border-amber-200/30 bg-gradient-to-br from-amber-300 to-orange-500 text-stone-950 shadow-[var(--glass-shadow-md)]'
                : isReady
                  ? 'border-[var(--glass-tone-success-fg)]/28 bg-[var(--glass-tone-success-bg)] text-[var(--glass-tone-success-fg)] hover:-translate-y-0.5'
                  : isProcessing
                    ? 'border-[var(--glass-accent-from)]/28 bg-amber-200/10 text-[var(--glass-accent-from)] hover:-translate-y-0.5'
                    : 'border-[var(--glass-stroke-base)] bg-white/[0.045] text-[var(--glass-text-secondary)] hover:-translate-y-0.5 hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/10 hover:shadow-[var(--glass-shadow-sm)]',
            ].join(' ')}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
            <div className="flex items-center gap-2">
              <span
                className={[
                  'inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-black',
                  isActive
                    ? 'border-stone-950/20 bg-stone-950/12 text-stone-950'
                    : isReady
                      ? 'border-[var(--glass-tone-success-fg)]/30 bg-[var(--glass-tone-success-fg)] text-stone-950'
                      : isProcessing
                        ? 'border-[var(--glass-accent-from)]/30 bg-[var(--glass-accent-from)] text-stone-950'
                        : 'border-[var(--glass-stroke-base)] bg-black/20 text-[var(--glass-text-tertiary)]',
                ].join(' ')}
              >
                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={3} /> : isReady ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : String(index + 1).padStart(2, '0')}
              </span>
              <span className="whitespace-nowrap text-[13px] font-black tracking-wide">{item.label}</span>
            </div>
            <p
              className={[
                'mt-1 truncate text-[11px]',
                isActive ? 'text-stone-950/72' : 'text-[var(--glass-text-tertiary)]',
              ].join(' ')}
              title={signal.detail}
            >
              {signal.detail}
            </p>
            <span
              className={[
                'mt-3 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black tracking-[0.12em]',
                isActive
                  ? 'border-stone-950/18 bg-stone-950/10 text-stone-950'
                  : isReady
                    ? 'border-[var(--glass-tone-success-fg)]/24 bg-black/18 text-[var(--glass-tone-success-fg)]'
                    : isProcessing
                      ? 'border-[var(--glass-accent-from)]/24 bg-black/18 text-[var(--glass-accent-from)]'
                      : 'border-[var(--glass-stroke-soft)] bg-black/16 text-[var(--glass-text-tertiary)]',
              ].join(' ')}
            >
              {statusText[signal.status]}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
