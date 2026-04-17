import { NavLink } from 'react-router-dom'

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
    <nav className="grid grid-flow-col auto-cols-[minmax(148px,1fr)] gap-2 overflow-x-auto pb-1">
      {workspaceStageItems.map((item, index) => {
        const to = buildWorkspaceStagePath(projectId, episodeId, item.stage)
        const isActive = currentStage === item.stage
        const isDone = index < currentIndex
        const statusText = isActive ? 'In Progress' : isDone ? 'Completed' : 'Pending'
        return (
          <NavLink
            key={item.stage}
            to={to}
            className={[
              'min-w-[128px] rounded-2xl border px-3 py-2 text-sm transition-all',
              isActive
                ? 'border-[var(--glass-accent-from)] bg-[var(--glass-accent-from)] text-white shadow-[var(--glass-shadow-md)]'
                : isDone
                  ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]'
                  : 'border-[var(--glass-stroke-base)] bg-white/70 text-[var(--glass-text-secondary)] hover:bg-white',
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-2">
              <span
                className={[
                  'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                  isActive
                    ? 'bg-white/30 text-white'
                    : isDone
                      ? 'bg-white/80 text-[var(--glass-tone-info-fg)]'
                      : 'bg-[var(--glass-bg-muted)] text-[var(--glass-text-tertiary)]',
                ].join(' ')}
              >
                {isDone ? '✓' : index + 1}
              </span>
              <span className="whitespace-nowrap">{item.label}</span>
            </span>
            <span
              className={[
                'mt-1 block text-[10px] uppercase tracking-wide',
                isActive ? 'text-white/85' : 'text-[var(--glass-text-tertiary)]',
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
