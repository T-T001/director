import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateProjectSettings } from '../../../services/api/projects'
import { queryKeys } from '../../../services/queryKeys'
import { buildWorkspaceStagePath } from '../../../app/router/routes'
import { Button } from '../../../components/ui/Button'
import { SectionCard } from '../../../components/common/PageState'
import type { WorkspaceStagePageProps } from './types'

type SettingsDraft = {
  analysis_model: string
  character_model: string
  location_model: string
  storyboard_model: string
  video_model: string
  audio_model: string
  art_style: string
  video_ratio: string
  video_resolution: string
}

type Preset = {
  id: string
  title: string
  description: string
  values: Partial<SettingsDraft>
}

const presets: Preset[] = [
  {
    id: 'draft',
    title: '快速草稿',
    description: '低成本快速迭代，试错首选。',
    values: {
      art_style: '简洁概念画风',
      video_ratio: '16:9',
      video_resolution: '720p',
    },
  },
  {
    id: 'balanced',
    title: '均衡出片',
    description: '适合大多数剧集的通用配置。',
    values: {
      art_style: '电影级二次元写实',
      video_ratio: '16:9',
      video_resolution: '1080p',
    },
  },
  {
    id: 'short-video',
    title: '短视频',
    description: '竖屏输出，面向移动端社交平台。',
    values: {
      art_style: '高对比度海报风',
      video_ratio: '9:16',
      video_resolution: '1080p',
    },
  },
]

function toDraft(settings: WorkspaceStagePageProps['workspace']['settings']): SettingsDraft {
  return {
    analysis_model: settings?.analysis_model ?? '',
    character_model: settings?.character_model ?? '',
    location_model: settings?.location_model ?? '',
    storyboard_model: settings?.storyboard_model ?? '',
    video_model: settings?.video_model ?? '',
    audio_model: settings?.audio_model ?? '',
    art_style: settings?.art_style ?? '电影级二次元写实',
    video_ratio: settings?.video_ratio ?? '16:9',
    video_resolution: settings?.video_resolution ?? '1080p',
  }
}

function toPayload(draft: SettingsDraft) {
  return {
    analysis_model: draft.analysis_model.trim() || null,
    character_model: draft.character_model.trim() || null,
    location_model: draft.location_model.trim() || null,
    storyboard_model: draft.storyboard_model.trim() || null,
    video_model: draft.video_model.trim() || null,
    audio_model: draft.audio_model.trim() || null,
    art_style: draft.art_style.trim() || '电影级二次元写实',
    video_ratio: draft.video_ratio.trim() || '16:9',
    video_resolution: draft.video_resolution.trim() || '1080p',
  }
}

export function ConfigStage({ projectId, episodeId, workspace, episode }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()

  const baseline = useMemo(() => toDraft(workspace.settings), [workspace.settings])
  const [draft, setDraft] = useState<SettingsDraft>(baseline)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setDraft(baseline)
  }, [baseline])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [baseline, draft])

  const updateMutation = useMutation({
    mutationFn: () => updateProjectSettings(projectId, toPayload(draft)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      setFeedback('配置已保存。')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '保存配置失败。'
      setFeedback(message)
    },
  })

  const applyPreset = (preset: Preset) => {
    setDraft((previous) => ({ ...previous, ...preset.values }))
    setFeedback(`已应用预设：${preset.title}`)
  }

  const resetDraft = () => {
    setDraft(baseline)
    setFeedback('已重置为当前配置。')
  }

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">配置阶段</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              项目：{workspace.project.name} · 第 {episode.episode_number} 集：{episode.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'script')}>
              <Button variant="secondary">进入剧本</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'assets')}>
              <Button variant="secondary">进入素材</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="metric-card px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">草稿状态</p>
            <p className="mt-1 text-lg font-semibold">{dirty ? '有未保存修改' : '已同步'}</p>
          </article>
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

      {feedback ? <SectionCard className="glass-success rounded-2xl p-4 text-sm">{feedback}</SectionCard> : null}

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
              <h4 className="text-sm font-semibold">{preset.title}</h4>
              <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{preset.description}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="grid gap-4">
        <h3 className="text-base font-semibold">模型默认值</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">分析模型</span>
            <input
              className="glass-input"
              value={draft.analysis_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, analysis_model: event.target.value }))}
              placeholder="例如：gpt-5.4-mini"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">角色模型</span>
            <input
              className="glass-input"
              value={draft.character_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, character_model: event.target.value }))}
              placeholder="例如：flux-dev-character"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">场景模型</span>
            <input
              className="glass-input"
              value={draft.location_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, location_model: event.target.value }))}
              placeholder="例如：flux-dev-location"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">分镜模型</span>
            <input
              className="glass-input"
              value={draft.storyboard_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, storyboard_model: event.target.value }))}
              placeholder="例如：storyboard-v1"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">视频模型</span>
            <input
              className="glass-input"
              value={draft.video_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, video_model: event.target.value }))}
              placeholder="例如：runway-gen4"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">音频模型</span>
            <input
              className="glass-input"
              value={draft.audio_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, audio_model: event.target.value }))}
              placeholder="例如：fish-speech"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard className="grid gap-4">
        <h3 className="text-base font-semibold">出片配置</h3>
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

      <SectionCard className="grid gap-2">
        <h3 className="text-base font-semibold">阶段操作</h3>
        <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={resetDraft} disabled={!dirty || updateMutation.isPending}>
          重置草稿
        </Button>
        <Button type="button" onClick={() => updateMutation.mutate()} disabled={!dirty || updateMutation.isPending}>
          {updateMutation.isPending ? '保存中...' : '保存配置'}
        </Button>
        </div>
      </SectionCard>

      <Link
        to={buildWorkspaceStagePath(projectId, episodeId, 'script')}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        继续到剧本
      </Link>
    </div>
  )
}
