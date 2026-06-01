import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSettings, updateSettings } from '../../../services/api/settings'
import { queryKeys } from '../../../services/queryKeys'
import { Button } from '../../../components/ui/Button'
import { ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import type { UserSettings } from '../../../types/project'

type StrategyDraft = {
  art_style: string
  video_ratio: string
  video_resolution: string
}

type StrategyPreset = {
  id: string
  title: string
  description: string
  values: Partial<StrategyDraft>
}

const presets: StrategyPreset[] = [
  {
    id: 'fast',
    title: '快速草稿',
    description: '优先吞吐与迭代速度，适合试错阶段。',
    values: {
      art_style: '简洁概念画风，低细节',
      video_ratio: '16:9',
      video_resolution: '720p',
    },
  },
  {
    id: 'balanced',
    title: '均衡出片',
    description: '通用高质量配置，适合绝大多数剧集。',
    values: {
      art_style: '电影级二次元写实',
      video_ratio: '16:9',
      video_resolution: '1080p',
    },
  },
  {
    id: 'vertical',
    title: '短视频',
    description: '面向移动端与社交平台的竖屏优化。',
    values: {
      art_style: '高对比度、强构图',
      video_ratio: '9:16',
      video_resolution: '1080p',
    },
  },
]

function normalizeDraft(settings: UserSettings | undefined): StrategyDraft {
  return {
    art_style: settings?.art_style ?? '电影级二次元写实',
    video_ratio: settings?.video_ratio ?? '16:9',
    video_resolution: settings?.video_resolution ?? '1080p',
  }
}

export function RenderStrategySection() {
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.current(),
    queryFn: getSettings,
  })

  const [draft, setDraft] = useState<StrategyDraft>(() => normalizeDraft(undefined))
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!settingsQuery.data) return
    setDraft(normalizeDraft(settingsQuery.data))
  }, [settingsQuery.data])

  const baseline = useMemo(() => normalizeDraft(settingsQuery.data), [settingsQuery.data])
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [baseline, draft])

  const mutation = useMutation({
    mutationFn: () =>
      updateSettings({
        art_style: draft.art_style.trim() || '电影级二次元写实',
        video_ratio: draft.video_ratio.trim() || '16:9',
        video_resolution: draft.video_resolution.trim() || '1080p',
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.settings.current(), updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.current() })
      setFeedback('出片策略已保存。')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '保存失败。'
      setFeedback(message)
    },
  })

  const applyPreset = (preset: StrategyPreset) => {
    setDraft((previous) => ({ ...previous, ...preset.values }))
    setFeedback(`已应用预设：${preset.title}`)
  }

  const handleReset = () => {
    setDraft(baseline)
    setFeedback('已重置为上次保存的配置。')
  }

  if (settingsQuery.isLoading) return <LoadingState message="正在加载设置..." />
  if (settingsQuery.isError) return <ErrorState message="加载设置失败。" />

  return (
    <div className="grid gap-4">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">出片策略</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              控制画面风格、比例与分辨率，作用于每个剧集的渲染流程。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={!dirty || mutation.isPending}
            >
              重置
            </Button>
            <Button type="button" onClick={() => mutation.mutate()} disabled={!dirty || mutation.isPending}>
              {mutation.isPending ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="metric-card px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">画面比例</p>
            <p className="mt-1 text-lg font-semibold">{draft.video_ratio}</p>
          </article>
          <article className="metric-card px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">分辨率</p>
            <p className="mt-1 text-lg font-semibold">{draft.video_resolution}</p>
          </article>
          <article className="metric-card px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">画风</p>
            <p className="mt-1 line-clamp-1 text-lg font-semibold">{draft.art_style}</p>
          </article>
        </div>
      </SectionCard>

      {feedback ? (
        <SectionCard className="glass-success rounded-2xl p-4 text-sm">{feedback}</SectionCard>
      ) : null}

      <SectionCard className="grid gap-3">
        <h3 className="text-base font-semibold">工作流预设</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="card-base p-3 text-left transition-colors hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/10"
            >
              <h4 className="text-sm font-semibold text-[var(--glass-text-primary)]">{preset.title}</h4>
              <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{preset.description}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="grid gap-4">
        <h3 className="text-base font-semibold">自定义参数</h3>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">画风</span>
            <input
              className="glass-input"
              value={draft.art_style}
              onChange={(event) => setDraft((previous) => ({ ...previous, art_style: event.target.value }))}
              placeholder="例如：电影级二次元写实"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">画面比例</span>
            <select
              className="glass-input"
              value={draft.video_ratio}
              onChange={(event) => setDraft((previous) => ({ ...previous, video_ratio: event.target.value }))}
            >
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="1:1">1:1</option>
              <option value="4:3">4:3</option>
              <option value="21:9">21:9</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">分辨率</span>
            <select
              className="glass-input"
              value={draft.video_resolution}
              onChange={(event) => setDraft((previous) => ({ ...previous, video_resolution: event.target.value }))}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="1440p">1440p</option>
              <option value="4k">4K</option>
            </select>
          </label>
        </div>
      </SectionCard>
    </div>
  )
}
