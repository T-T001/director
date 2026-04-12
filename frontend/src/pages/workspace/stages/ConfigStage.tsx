import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateSettings } from '../../../services/api/settings'
import { queryKeys } from '../../../services/queryKeys'
import { Button } from '../../../components/ui/Button'
import { SectionCard } from '../../../components/common/PageState'
import type { WorkspaceStagePageProps } from './types'

type SettingsDraft = {
  analysis_model: string | null
  video_model: string | null
  audio_model: string | null
  art_style: string
  video_ratio: string
  video_resolution: string
}

function toDraft(settings: WorkspaceStagePageProps['workspace']['settings']): SettingsDraft {
  return {
    analysis_model: settings?.analysis_model ?? null,
    video_model: settings?.video_model ?? null,
    audio_model: settings?.audio_model ?? null,
    art_style: settings?.art_style ?? '',
    video_ratio: settings?.video_ratio ?? '16:9',
    video_resolution: settings?.video_resolution ?? '1080p',
  }
}

export function ConfigStage({ projectId, workspace, episode }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()
  const initialDraft = useMemo(() => toDraft(workspace.settings), [workspace.settings])
  const [draft, setDraft] = useState<SettingsDraft>(initialDraft)

  useEffect(() => {
    setDraft(initialDraft)
  }, [initialDraft])

  const updateMutation = useMutation({
    mutationFn: () => updateSettings(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.current() })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
    },
  })

  return (
    <div className="grid gap-4">
      <SectionCard>
        <h2 className="text-lg font-semibold">项目与剧集</h2>
        <p className="mt-2 text-sm text-[var(--glass-text-tertiary)]">
          当前项目：{workspace.project.name}，当前剧集：第 {episode.episode_number} 集《{episode.name}》
        </p>
      </SectionCard>

      <SectionCard className="grid gap-3">
        <h2 className="text-lg font-semibold">基础配置</h2>
        <label className="grid gap-1">
          <span className="text-sm text-[var(--glass-text-secondary)]">分析模型</span>
          <input
            className="glass-input"
            value={draft.analysis_model ?? ''}
            onChange={(event) => setDraft((prev) => ({ ...prev, analysis_model: event.target.value || null }))}
            placeholder="analysis model key"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-[var(--glass-text-secondary)]">视频模型</span>
          <input
            className="glass-input"
            value={draft.video_model ?? ''}
            onChange={(event) => setDraft((prev) => ({ ...prev, video_model: event.target.value || null }))}
            placeholder="video model key"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-[var(--glass-text-secondary)]">音频模型</span>
          <input
            className="glass-input"
            value={draft.audio_model ?? ''}
            onChange={(event) => setDraft((prev) => ({ ...prev, audio_model: event.target.value || null }))}
            placeholder="audio model key"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">艺术风格</span>
            <input
              className="glass-input"
              value={draft.art_style}
              onChange={(event) => setDraft((prev) => ({ ...prev, art_style: event.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">画幅比例</span>
            <input
              className="glass-input"
              value={draft.video_ratio}
              onChange={(event) => setDraft((prev) => ({ ...prev, video_ratio: event.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">分辨率</span>
            <input
              className="glass-input"
              value={draft.video_resolution}
              onChange={(event) => setDraft((prev) => ({ ...prev, video_resolution: event.target.value }))}
            />
          </label>
        </div>
        <div>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}
