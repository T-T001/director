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
    title: 'Draft Fast',
    description: 'Quick iteration with lower output cost.',
    values: {
      art_style: 'clean concept style',
      video_ratio: '16:9',
      video_resolution: '720p',
    },
  },
  {
    id: 'balanced',
    title: 'Balanced',
    description: 'General production preset for most scenes.',
    values: {
      art_style: 'cinematic anime realism',
      video_ratio: '16:9',
      video_resolution: '1080p',
    },
  },
  {
    id: 'short-video',
    title: 'Short Video',
    description: 'Vertical output preset for social platforms.',
    values: {
      art_style: 'high contrast poster style',
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
    art_style: settings?.art_style ?? 'cinematic anime realism',
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
    art_style: draft.art_style.trim() || 'cinematic anime realism',
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
      setFeedback('Configuration saved.')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to save configuration.'
      setFeedback(message)
    },
  })

  const applyPreset = (preset: Preset) => {
    setDraft((previous) => ({ ...previous, ...preset.values }))
    setFeedback(`Preset applied: ${preset.title}`)
  }

  const resetDraft = () => {
    setDraft(baseline)
    setFeedback('Draft reset to current settings.')
  }

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Config Stage</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              Project: {workspace.project.name} | Episode {episode.episode_number}: {episode.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'script')}>
              <Button variant="secondary">Go Script</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'assets')}>
              <Button variant="secondary">Go Assets</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Draft State</p>
            <p className="mt-1 text-lg font-semibold">{dirty ? 'Unsaved Changes' : 'Synced'}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Aspect Ratio</p>
            <p className="mt-1 text-lg font-semibold">{draft.video_ratio}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Resolution</p>
            <p className="mt-1 text-lg font-semibold">{draft.video_resolution}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Art Style</p>
            <p className="mt-1 line-clamp-1 text-lg font-semibold">{draft.art_style}</p>
          </article>
        </div>
      </SectionCard>

      {feedback ? <SectionCard className="glass-success rounded-2xl p-4 text-sm">{feedback}</SectionCard> : null}

      <SectionCard className="grid gap-3">
        <h3 className="text-base font-semibold">Workflow Presets</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="card-base p-3 text-left transition-colors hover:bg-white"
            >
              <h4 className="text-sm font-semibold">{preset.title}</h4>
              <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{preset.description}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="grid gap-4">
        <h3 className="text-base font-semibold">Model Defaults</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">Analysis Model</span>
            <input
              className="glass-input"
              value={draft.analysis_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, analysis_model: event.target.value }))}
              placeholder="e.g. gpt-5.4-mini"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">Character Model</span>
            <input
              className="glass-input"
              value={draft.character_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, character_model: event.target.value }))}
              placeholder="e.g. flux-dev-character"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">Location Model</span>
            <input
              className="glass-input"
              value={draft.location_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, location_model: event.target.value }))}
              placeholder="e.g. flux-dev-location"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">Storyboard Model</span>
            <input
              className="glass-input"
              value={draft.storyboard_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, storyboard_model: event.target.value }))}
              placeholder="e.g. storyboard-v1"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">Video Model</span>
            <input
              className="glass-input"
              value={draft.video_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, video_model: event.target.value }))}
              placeholder="e.g. runway-gen4"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">Audio Model</span>
            <input
              className="glass-input"
              value={draft.audio_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, audio_model: event.target.value }))}
              placeholder="e.g. fish-speech"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard className="grid gap-4">
        <h3 className="text-base font-semibold">Output Profile</h3>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">Art Style</span>
            <input
              className="glass-input"
              value={draft.art_style}
              onChange={(event) => setDraft((previous) => ({ ...previous, art_style: event.target.value }))}
              placeholder="e.g. cinematic anime realism"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">Video Ratio</span>
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
            <span className="text-sm text-[var(--glass-text-secondary)]">Resolution</span>
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
        <h3 className="text-base font-semibold">Stage Actions</h3>
        <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={resetDraft} disabled={!dirty || updateMutation.isPending}>
          Reset Draft
        </Button>
        <Button type="button" onClick={() => updateMutation.mutate()} disabled={!dirty || updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
        </div>
      </SectionCard>

      <Link
        to={buildWorkspaceStagePath(projectId, episodeId, 'script')}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        Continue To Script
      </Link>
    </div>
  )
}
