import { projectStages, type ProjectStage } from './project-stages'

type Props = {
  currentStage: ProjectStage
  onStageChange: (stage: ProjectStage) => void
  hasEpisodes: boolean
}

export function ProjectStageNav({ currentStage, onStageChange, hasEpisodes }: Props) {
  return (
    <div className="glass-surface-elevated inline-flex items-center gap-1 rounded-2xl p-1">
      {projectStages.map((stage) => {
        const Icon = stage.icon
        const isActive = stage.id === currentStage
        const isDisabled = !hasEpisodes && stage.id !== 'intake'
        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => !isDisabled && onStageChange(stage.id)}
            disabled={isDisabled}
            title={isDisabled ? '请先在「智能分析」创建剧集' : stage.tip}
            className={[
              'group inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-white shadow-[var(--glass-shadow-sm)]'
                : isDisabled
                  ? 'cursor-not-allowed text-[var(--glass-text-tertiary)] opacity-60'
                  : 'text-[var(--glass-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--glass-text-primary)]',
            ].join(' ')}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{stage.label}</span>
          </button>
        )
      })}
    </div>
  )
}
