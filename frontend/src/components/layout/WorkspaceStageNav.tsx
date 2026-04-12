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
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {workspaceStageItems.map((item) => {
        const to = buildWorkspaceStagePath(projectId, episodeId, item.stage)
        return (
          <NavLink
            key={item.stage}
            to={to}
            className={[
              'rounded-xl px-3 py-2 text-sm transition-colors',
              currentStage === item.stage
                ? 'bg-[var(--glass-accent-from)] text-white'
                : 'bg-white/70 text-[var(--glass-text-secondary)] hover:bg-white',
            ].join(' ')}
          >
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
