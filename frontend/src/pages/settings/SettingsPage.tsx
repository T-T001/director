import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSettings, updateSettings } from '../../services/api/settings'
import { queryKeys } from '../../services/queryKeys'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'
import type { UserSettings } from '../../types/project'

type SettingsDraft = {
  analysis_model: string
  image_model: string
  video_model: string
  audio_model: string
  art_style: string
  video_ratio: string
  video_resolution: string
}

type SettingsPreset = {
  id: string
  title: string
  description: string
  values: Partial<SettingsDraft>
}

const presets: SettingsPreset[] = [
  {
    id: 'fast',
    title: 'Fast Draft',
    description: 'Prioritize throughput and quick iteration.',
    values: {
      art_style: 'clean concept art, minimal detail',
      video_ratio: '16:9',
      video_resolution: '720p',
    },
  },
  {
    id: 'balanced',
    title: 'Balanced Production',
    description: 'General-purpose setup for most episodes.',
    values: {
      art_style: 'cinematic anime realism',
      video_ratio: '16:9',
      video_resolution: '1080p',
    },
  },
  {
    id: 'vertical',
    title: 'Short Video',
    description: 'Optimized for mobile-first social delivery.',
    values: {
      art_style: 'high contrast, bold composition',
      video_ratio: '9:16',
      video_resolution: '1080p',
    },
  },
]

function normalizeDraft(settings: UserSettings | undefined): SettingsDraft {
  return {
    analysis_model: settings?.analysis_model ?? '',
    image_model: settings?.image_model ?? '',
    video_model: settings?.video_model ?? '',
    audio_model: settings?.audio_model ?? '',
    art_style: settings?.art_style ?? 'cinematic anime realism',
    video_ratio: settings?.video_ratio ?? '16:9',
    video_resolution: settings?.video_resolution ?? '1080p',
  }
}

function toPatchPayload(draft: SettingsDraft): Partial<UserSettings> {
  return {
    analysis_model: draft.analysis_model.trim() || null,
    image_model: draft.image_model.trim() || null,
    video_model: draft.video_model.trim() || null,
    audio_model: draft.audio_model.trim() || null,
    art_style: draft.art_style.trim() || 'cinematic anime realism',
    video_ratio: draft.video_ratio.trim() || '16:9',
    video_resolution: draft.video_resolution.trim() || '1080p',
  }
}

export function SettingsPage() {
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.current(),
    queryFn: getSettings,
  })

  const [draft, setDraft] = useState<SettingsDraft>(() => normalizeDraft(undefined))
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!settingsQuery.data) return
    setDraft(normalizeDraft(settingsQuery.data))
  }, [settingsQuery.data])

  const baseline = useMemo(() => normalizeDraft(settingsQuery.data), [settingsQuery.data])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [baseline, draft])

  const mutation = useMutation({
    mutationFn: () => updateSettings(toPatchPayload(draft)),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.settings.current(), updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.current() })
      setFeedback('Settings saved successfully.')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to save settings.'
      setFeedback(message)
    },
  })

  const applyPreset = (preset: SettingsPreset) => {
    setDraft((previous) => ({
      ...previous,
      ...preset.values,
    }))
    setFeedback(`Preset applied: ${preset.title}`)
  }

  const handleReset = () => {
    setDraft(baseline)
    setFeedback('Draft reset to last saved settings.')
  }

  return (
    <div className="grid gap-4 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Settings Console</h1>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              Refactored configuration center for model defaults and output policy.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleReset} disabled={!dirty || mutation.isPending}>
              Reset Draft
            </Button>
            <Button type="button" onClick={() => mutation.mutate()} disabled={!dirty || mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Draft State</p>
            <p className="mt-1 text-lg font-semibold">{dirty ? 'Unsaved Changes' : 'Synced'}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Video Ratio</p>
            <p className="mt-1 text-lg font-semibold">{draft.video_ratio}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Resolution</p>
            <p className="mt-1 text-lg font-semibold">{draft.video_resolution}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Style</p>
            <p className="mt-1 line-clamp-1 text-lg font-semibold">{draft.art_style}</p>
          </article>
        </div>
      </SectionCard>

      {settingsQuery.isLoading ? <LoadingState message="Loading settings..." /> : null}
      {settingsQuery.isError ? <ErrorState message="Failed to load settings." /> : null}
      {feedback ? <SectionCard className="glass-success rounded-2xl p-4 text-sm">{feedback}</SectionCard> : null}

      <SectionCard className="grid gap-3">
        <h2 className="text-base font-semibold">Workflow Presets</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="card-base p-3 text-left transition-colors hover:bg-white"
            >
              <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{preset.title}</h3>
              <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{preset.description}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="grid gap-4">
        <h2 className="text-base font-semibold">Model Defaults</h2>
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
            <span className="text-sm text-[var(--glass-text-secondary)]">Image Model</span>
            <input
              className="glass-input"
              value={draft.image_model}
              onChange={(event) => setDraft((previous) => ({ ...previous, image_model: event.target.value }))}
              placeholder="e.g. flux-dev"
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
        <h2 className="text-base font-semibold">Output Policy</h2>
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

      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!dirty || mutation.isPending}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {mutation.isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
