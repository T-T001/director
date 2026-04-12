import { EmptyState, SectionCard } from '../../../components/common/PageState'
import type { WorkspaceStagePageProps } from './types'

export function VoiceStage({ episode }: WorkspaceStagePageProps) {
  return (
    <div className="grid gap-4">
      <SectionCard>
        <h2 className="text-lg font-semibold">配音阶段</h2>
        <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
          当前剧集：第 {episode.episode_number} 集《{episode.name}》。第一版先保留 API-ready 容器。
        </p>
      </SectionCard>

      <EmptyState
        title="配音功能即将接入"
        description="后续将接 /voice-lines、/voice-generate、/speaker-voice 等接口，支持逐句生成与试听。"
      />
    </div>
  )
}
