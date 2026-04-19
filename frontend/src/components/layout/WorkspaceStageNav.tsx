import { NavLink } from 'react-router-dom'
import { Check } from 'lucide-react'

import type { WorkspaceStage } from '../../app/router/routes'
import { buildWorkspaceStagePath, workspaceStageItems } from '../../app/router/routes'

export function WorkspaceStageNav({
  projectId,
  episodeId,
  currentStage,
}: {
  projectId: string
  episodeId: string
  currentStage: WorkspaceStage
}) {
  const currentIndex = workspaceStageItems.findIndex((item) => item.stage === currentStage)

  return (
    <nav className="grid grid-flow-col auto-cols-[minmax(160px,1fr)] gap-3 overflow-x-auto pb-1">
      {workspaceStageItems.map((item, index) => {
        const to = buildWorkspaceStagePath(projectId, episodeId, item.stage)
        const isActive = currentStage === item.stage
        const isDone = index < currentIndex
        const statusText = isActive ? '进行中' : isDone ? '已完成' : '待开始'
        return (
          <NavLink
            key={item.stage}
            to={to}
            className={[
              'group relative min-w-[140px] rounded-2xl border px-4 py-3 text-sm transition-all',
              isActive
                ? 'animate-capsule-glow border-transparent bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-white shadow-[var(--glass-shadow-md)]'
                : isDone
                  ? 'border-[var(--glass-tone-success-fg)]/30 bg-[var(--glass-tone-success-bg)]/40 text-[var(--glass-tone-success-fg)] hover:-translate-y-0.5'
                  : 'border-[var(--glass-stroke-base)] bg-white/70 text-[var(--glass-text-secondary)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--glass-shadow-sm)]',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <span
                className={[
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold',
                  isActive
                    ? 'bg-white/25 text-white'
                    : isDone
                      ? 'bg-[var(--glass-tone-success-fg)] text-white'
                      : 'bg-[var(--glass-bg-muted)] text-[var(--glass-text-tertiary)]',
                ].join(' ')}
              >
                {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span className="whitespace-nowrap text-[13px] font-semibold">{item.label}</span>
            </div>
            <p
              className={[
                'mt-1 truncate text-[11px]',
                isActive ? 'text-white/85' : 'text-[var(--glass-text-tertiary)]',
              ].join(' ')}
            >
              {item.description}
            </p>
            <span
              className={[
                'mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide',
                isActive
                  ? 'bg-white/20 text-white'
                  : isDone
                    ? 'bg-white/70 text-[var(--glass-tone-success-fg)]'
                    : 'bg-[var(--glass-bg-muted)] text-[var(--glass-text-tertiary)]',
              ].join(' ')}
            >
              {statusText}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
