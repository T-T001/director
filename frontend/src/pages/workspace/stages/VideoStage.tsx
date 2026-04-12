import { Link } from 'react-router-dom'

import { EmptyState, SectionCard } from '../../../components/common/PageState'
import { buildWorkspaceStagePath } from '../../../app/router/routes'
import { Button } from '../../../components/ui/Button'
import type { WorkspaceStagePageProps } from './types'

export function VideoStage({ projectId, episodeId, episode }: WorkspaceStagePageProps) {
  return (
    <div className="grid gap-4">
      <SectionCard className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">视频阶段</h2>
          <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
            当前剧集：第 {episode.episode_number} 集《{episode.name}》
          </p>
        </div>
        <Link to={`/editor/${episodeId}`}>
          <Button>进入编辑器</Button>
        </Link>
      </SectionCard>

      <EmptyState title="视频生成功能即将接入" description="后续将连接 panel 视频生成、lip-sync 与导出任务。" />

      <SectionCard>
        <p className="text-sm text-[var(--glass-text-tertiary)]">
          如需回到分镜补充内容，可返回
          <Link className="ml-1 underline" to={buildWorkspaceStagePath(projectId, episodeId, 'storyboard')}>
            分镜阶段
          </Link>
          。
        </p>
      </SectionCard>
    </div>
  )
}
