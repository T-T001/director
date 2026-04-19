import { Sparkles, FileText, Users, Film, Mic, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ProjectStage = 'intake' | 'script' | 'assets' | 'storyboard' | 'voice' | 'video'

export const projectStages: Array<{ id: ProjectStage; label: string; icon: LucideIcon; tip: string }> = [
  { id: 'intake', label: '智能分析', icon: Sparkles, tip: '粘贴原文自动拆集、生成剧集骨架' },
  { id: 'script', label: '剧本', icon: FileText, tip: '撰写与修订每一集的剧本内容' },
  { id: 'assets', label: '素材', icon: Users, tip: '管理角色、场景与道具素材' },
  { id: 'storyboard', label: '分镜', icon: Film, tip: '生成分镜与面板提示词' },
  { id: 'voice', label: '配音', icon: Mic, tip: '台词与音色生成' },
  { id: 'video', label: '视频', icon: Video, tip: '渲染与成片导出' },
]

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
                  : 'text-[var(--glass-text-secondary)] hover:bg-white/70 hover:text-[var(--glass-text-primary)]',
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
