import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSettings, updateSettings } from '../../services/api/settings'
import { queryKeys } from '../../services/queryKeys'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'
import type { ProjectSettings } from '../../types/project'

function normalizeDraft(settings: ProjectSettings | undefined) {
  return {
    analysis_model: settings?.analysis_model ?? '',
    video_model: settings?.video_model ?? '',
    audio_model: settings?.audio_model ?? '',
    art_style: settings?.art_style ?? '',
    video_ratio: settings?.video_ratio ?? '16:9',
    video_resolution: settings?.video_resolution ?? '1080p',
  }
}

export function SettingsPage() {
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.current(),
    queryFn: getSettings,
  })

  const [draft, setDraft] = useState(() => normalizeDraft(undefined))

  useEffect(() => {
    if (!settingsQuery.data) return
    setDraft(normalizeDraft(settingsQuery.data))
  }, [settingsQuery.data])

  const mutation = useMutation({
    mutationFn: () =>
      updateSettings({
        analysis_model: draft.analysis_model || null,
        video_model: draft.video_model || null,
        audio_model: draft.audio_model || null,
        art_style: draft.art_style,
        video_ratio: draft.video_ratio,
        video_resolution: draft.video_resolution,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.current() })
    },
  })

  return (
    <div className="grid gap-4">
      <SectionCard>
        <h1 className="text-xl font-semibold">系统设置</h1>
        <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">统一管理默认模型和输出参数。</p>
      </SectionCard>

      {settingsQuery.isLoading ? <LoadingState message="正在加载设置..." /> : null}
      {settingsQuery.isError ? <ErrorState message="设置加载失败。" /> : null}

      <SectionCard>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">分析模型</span>
            <input
              className="glass-input"
              value={draft.analysis_model}
              onChange={(event) => setDraft((prev) => ({ ...prev, analysis_model: event.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">视频模型</span>
            <input
              className="glass-input"
              value={draft.video_model}
              onChange={(event) => setDraft((prev) => ({ ...prev, video_model: event.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">音频模型</span>
            <input
              className="glass-input"
              value={draft.audio_model}
              onChange={(event) => setDraft((prev) => ({ ...prev, audio_model: event.target.value }))}
            />
          </label>
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

        <div className="mt-4">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}
