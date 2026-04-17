import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { listStoryboards, scriptToStoryboard, updatePanel } from '../../../services/api/storyboards'
import { queryKeys } from '../../../services/queryKeys'
import { buildWorkspaceStagePath } from '../../../app/router/routes'
import { Button } from '../../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import type { Storyboard, StoryboardPanel } from '../../../types/project'
import type { WorkspaceStagePageProps } from './types'

function sortStoryboards(items: Storyboard[]) {
  return [...items].sort((left, right) => left.id.localeCompare(right.id))
}

function totalPanels(storyboards: Storyboard[]) {
  return storyboards.reduce((sum, storyboard) => sum + storyboard.panels.length, 0)
}

function panelHasImage(panel: StoryboardPanel) {
  return Boolean(panel.image_media_id)
}

type PanelDraft = {
  description: string
  imagePrompt: string
  videoPrompt: string
}

function defaultPanelDraft(panel: StoryboardPanel): PanelDraft {
  return {
    description: panel.description ?? '',
    imagePrompt: panel.image_prompt ?? '',
    videoPrompt: panel.video_prompt ?? '',
  }
}

function normalizeDraft(draft: PanelDraft): PanelDraft {
  return {
    description: draft.description.trim(),
    imagePrompt: draft.imagePrompt.trim(),
    videoPrompt: draft.videoPrompt.trim(),
  }
}

function isPanelDirty(panel: StoryboardPanel, draft: PanelDraft) {
  const base = normalizeDraft(defaultPanelDraft(panel))
  const current = normalizeDraft(draft)
  return (
    current.description !== base.description ||
    current.imagePrompt !== base.imagePrompt ||
    current.videoPrompt !== base.videoPrompt
  )
}

function appendSnippet(value: string, snippet: string) {
  const base = value.trim()
  const safeSnippet = snippet.trim()
  if (!safeSnippet) {
    return base
  }
  return `${base}${base ? '\n\n' : ''}${safeSnippet}`
}

function buildImagePrompt(description: string, styleSnippet: string) {
  const base = description.trim()
  if (!base) {
    return ''
  }
  const style = styleSnippet.trim()
  return style ? `${base}. ${style}` : base
}

function buildVideoPrompt(description: string, styleSnippet: string) {
  const base = description.trim()
  if (!base) {
    return ''
  }
  const style = styleSnippet.trim()
  const suffix = style ? `${style}, camera movement, cinematic pacing` : 'camera movement, cinematic pacing'
  return `${base}. ${suffix}`
}

export function StoryboardStage({ projectId, episodeId }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [panelSearch, setPanelSearch] = useState('')
  const [panelDrafts, setPanelDrafts] = useState<Record<string, PanelDraft>>({})
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [styleSnippet, setStyleSnippet] = useState('cinematic composition, coherent character identity, dramatic lighting')
  const [expandedStoryboardIds, setExpandedStoryboardIds] = useState<Record<string, boolean>>({})

  const storyboardsQuery = useQuery({
    queryKey: queryKeys.storyboards.byEpisode(episodeId),
    queryFn: () => listStoryboards(episodeId),
  })

  const scriptToStoryboardMutation = useMutation({
    mutationFn: () => scriptToStoryboard(episodeId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
    },
  })

  const storyboards = useMemo(() => sortStoryboards(storyboardsQuery.data ?? []), [storyboardsQuery.data])
  const panelMap = useMemo(() => {
    const map = new Map<string, StoryboardPanel>()
    storyboards.forEach((storyboard) => {
      storyboard.panels.forEach((panel) => {
        map.set(panel.id, panel)
      })
    })
    return map
  }, [storyboards])

  const getPanelDraft = (panel: StoryboardPanel) => panelDrafts[panel.id] ?? defaultPanelDraft(panel)

  useEffect(() => {
    setPanelDrafts((previous) => {
      const next: Record<string, PanelDraft> = {}
      storyboards.forEach((storyboard) => {
        storyboard.panels.forEach((panel) => {
          next[panel.id] = previous[panel.id] ?? defaultPanelDraft(panel)
        })
      })
      return next
    })
  }, [storyboards])

  useEffect(() => {
    setExpandedStoryboardIds((previous) => {
      const next: Record<string, boolean> = {}
      storyboards.forEach((storyboard, index) => {
        next[storyboard.id] = previous[storyboard.id] ?? index === 0
      })
      return next
    })
  }, [storyboards])

  useEffect(() => {
    if (storyboards.length === 0) {
      setSelectedStoryboardId(null)
      return
    }
    if (!selectedStoryboardId || !storyboards.some((storyboard) => storyboard.id === selectedStoryboardId)) {
      setSelectedStoryboardId(storyboards[0].id)
    }
  }, [selectedStoryboardId, storyboards])

  const selectedStoryboard = useMemo(
    () => storyboards.find((storyboard) => storyboard.id === selectedStoryboardId) ?? null,
    [selectedStoryboardId, storyboards],
  )

  const filteredPanels = useMemo(() => {
    const panels = selectedStoryboard?.panels ?? []
    const keyword = panelSearch.trim().toLowerCase()
    if (!keyword) return [...panels].sort((a, b) => a.panel_index - b.panel_index)
    return panels
      .filter((panel) => {
        const draft = getPanelDraft(panel)
        const content = `${panel.panel_index} ${draft.description} ${draft.imagePrompt} ${draft.videoPrompt}`.toLowerCase()
        return content.includes(keyword)
      })
      .sort((a, b) => a.panel_index - b.panel_index)
  }, [panelDrafts, panelSearch, selectedStoryboard?.panels])

  useEffect(() => {
    if (filteredPanels.length === 0) {
      setSelectedPanelId(null)
      return
    }
    if (!selectedPanelId || !filteredPanels.some((panel) => panel.id === selectedPanelId)) {
      setSelectedPanelId(filteredPanels[0].id)
    }
  }, [filteredPanels, selectedPanelId])

  const selectedPanel = useMemo(
    () => filteredPanels.find((panel) => panel.id === selectedPanelId) ?? null,
    [filteredPanels, selectedPanelId],
  )

  const generatedImageCount = useMemo(
    () => (selectedStoryboard?.panels ?? []).filter(panelHasImage).length,
    [selectedStoryboard?.panels],
  )

  const dirtyPanelCount = useMemo(
    () => (selectedStoryboard?.panels ?? []).filter((panel) => isPanelDirty(panel, getPanelDraft(panel))).length,
    [panelDrafts, selectedStoryboard?.panels],
  )

  const readyPromptCount = useMemo(
    () =>
      (selectedStoryboard?.panels ?? []).filter((panel) => {
        const draft = getPanelDraft(panel)
        return Boolean(draft.imagePrompt.trim() && draft.videoPrompt.trim())
      }).length,
    [panelDrafts, selectedStoryboard?.panels],
  )

  const selectedPanelDraft = selectedPanel ? getPanelDraft(selectedPanel) : null
  const selectedPanelDirty = selectedPanel ? isPanelDirty(selectedPanel, getPanelDraft(selectedPanel)) : false

  const saveSelectedMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPanel) {
        throw new Error('Please select a panel first.')
      }
      const draft = normalizeDraft(getPanelDraft(selectedPanel))
      await updatePanel(selectedPanel.id, {
        description: draft.description || selectedPanel.description,
        image_prompt: draft.imagePrompt || null,
        video_prompt: draft.videoPrompt || null,
      })
      return selectedPanel.id
    },
    onSuccess: async () => {
      setSaveNotice('Selected panel saved.')
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      await storyboardsQuery.refetch()
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Save failed.'
      setSaveNotice(message)
    },
  })

  const saveAllDirtyMutation = useMutation({
    mutationFn: async () => {
      const scopedPanels = selectedStoryboard?.panels ?? []
      const dirtyPanels = scopedPanels.filter((panel) => isPanelDirty(panel, getPanelDraft(panel)))

      for (const panel of dirtyPanels) {
        const draft = normalizeDraft(getPanelDraft(panel))
        await updatePanel(panel.id, {
          description: draft.description || panel.description,
          image_prompt: draft.imagePrompt || null,
          video_prompt: draft.videoPrompt || null,
        })
      }

      return dirtyPanels.length
    },
    onSuccess: async (count) => {
      setSaveNotice(count > 0 ? `Saved ${count} panel(s).` : 'No panel changes to save.')
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      await storyboardsQuery.refetch()
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Batch save failed.'
      setSaveNotice(message)
    },
  })

  const updatePanelDraft = (panelId: string, patch: Partial<PanelDraft>) => {
    setPanelDrafts((previous) => {
      const panel = panelMap.get(panelId)
      const fallbackDraft = panel ? defaultPanelDraft(panel) : { description: '', imagePrompt: '', videoPrompt: '' }
      return {
        ...previous,
        [panelId]: {
          ...(previous[panelId] ?? fallbackDraft),
          ...patch,
        },
      }
    })
  }

  const handleAppendStyleToSelected = () => {
    if (!selectedPanel || !selectedPanelDraft || !styleSnippet.trim()) {
      return
    }
    updatePanelDraft(selectedPanel.id, {
      imagePrompt: appendSnippet(selectedPanelDraft.imagePrompt, styleSnippet),
      videoPrompt: appendSnippet(selectedPanelDraft.videoPrompt, styleSnippet),
    })
    setSaveNotice('Style snippet appended to selected panel prompts.')
  }

  const handleFillMissingPrompts = () => {
    if (!selectedStoryboard) {
      return
    }
    setPanelDrafts((previous) => {
      const next = { ...previous }
      selectedStoryboard.panels.forEach((panel) => {
        const draft = next[panel.id] ?? defaultPanelDraft(panel)
        next[panel.id] = {
          description: draft.description,
          imagePrompt: draft.imagePrompt.trim() ? draft.imagePrompt : buildImagePrompt(draft.description, styleSnippet),
          videoPrompt: draft.videoPrompt.trim() ? draft.videoPrompt : buildVideoPrompt(draft.description, styleSnippet),
        }
      })
      return next
    })
    setSaveNotice('Filled missing prompts in current storyboard.')
  }

  const handleResetSelected = () => {
    if (!selectedPanel) {
      return
    }
    setPanelDrafts((previous) => ({
      ...previous,
      [selectedPanel.id]: defaultPanelDraft(selectedPanel),
    }))
    setSaveNotice('Selected panel draft reset.')
  }

  const handleToggleStoryboardExpand = (storyboardId: string) => {
    setExpandedStoryboardIds((previous) => ({
      ...previous,
      [storyboardId]: !previous[storyboardId],
    }))
  }

  const pendingPanelCount = useMemo(
    () => storyboards.reduce((sum, storyboard) => sum + storyboard.panels.filter((panel) => !panelHasImage(panel)).length, 0),
    [storyboards],
  )

  const handleMockInsertGroup = (afterStoryboardId: string) => {
    const index = storyboards.findIndex((item) => item.id === afterStoryboardId)
    if (index < 0) {
      return
    }
    setSaveNotice(`Insert storyboard group UI triggered after group #${index + 1} (shell only).`)
  }

  const handleMockDownloadAll = () => {
    setSaveNotice('Download all storyboard images triggered (UI shell placeholder).')
  }

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Storyboard Stage</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              Editable storyboard workspace with panel drafts, batch tools, and save workflow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'script')}>
              <Button variant="secondary">Back</Button>
            </Link>
            <Button
              onClick={() => scriptToStoryboardMutation.mutate()}
              disabled={scriptToStoryboardMutation.isPending}
            >
              {scriptToStoryboardMutation.isPending ? 'Submitting...' : 'Generate Storyboard'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => saveSelectedMutation.mutate()}
              disabled={!selectedPanel || saveSelectedMutation.isPending || saveAllDirtyMutation.isPending}
            >
              {saveSelectedMutation.isPending ? 'Saving...' : 'Save Selected Panel'}
            </Button>
            <Button
              onClick={() => saveAllDirtyMutation.mutate()}
              disabled={saveSelectedMutation.isPending || saveAllDirtyMutation.isPending}
            >
              {saveAllDirtyMutation.isPending ? 'Saving All...' : 'Save Board Changes'}
            </Button>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'prompts')}>
              <Button variant="secondary">Go To Prompts</Button>
            </Link>
            <Button variant="secondary" onClick={handleMockDownloadAll}>
              Download All Images
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Boards</p>
            <p className="mt-1 text-2xl font-semibold">{storyboards.length}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Panels</p>
            <p className="mt-1 text-2xl font-semibold">{totalPanels(storyboards)}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Generated Images</p>
            <p className="mt-1 text-2xl font-semibold">{generatedImageCount}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Dirty / Prompt Ready</p>
            <p className="mt-1 text-2xl font-semibold">
              {dirtyPanelCount} / {readyPromptCount}
            </p>
          </article>
        </div>
      </SectionCard>

      {saveNotice ? <SectionCard className="glass-success rounded-2xl p-4 text-sm">{saveNotice}</SectionCard> : null}
      {storyboardsQuery.isLoading ? <LoadingState message="Loading storyboards..." /> : null}
      {storyboardsQuery.isError ? <ErrorState message="Failed to load storyboards." /> : null}

      {storyboards.length === 0 && !storyboardsQuery.isLoading ? (
        <EmptyState
          title="No storyboard yet"
          description="Generate storyboard from script first, then refine panel prompts in the Prompts stage."
        />
      ) : null}

      {storyboards.length > 0 ? (
        <>
          <SectionCard className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Storyboard Canvas</h3>
              <p className="text-xs text-[var(--glass-text-tertiary)]">
                Pending panels: {pendingPanelCount} | Total groups: {storyboards.length}
              </p>
            </div>

            <div className="grid gap-4">
              {storyboards.map((storyboard, sbIndex) => {
                const expanded = expandedStoryboardIds[storyboard.id] ?? false
                const sortedPanels = [...storyboard.panels].sort((a, b) => a.panel_index - b.panel_index)
                const groupDirtyCount = sortedPanels.filter((panel) => isPanelDirty(panel, getPanelDraft(panel))).length
                return (
                  <article key={storyboard.id} className="card-base grid gap-3 rounded-2xl p-4">
                    <header className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-[var(--glass-text-tertiary)]">Group {sbIndex + 1}</p>
                        <h4 className="text-base font-semibold">Storyboard {storyboard.id.slice(0, 8)}</h4>
                        <p className="text-xs text-[var(--glass-text-tertiary)]">
                          Panels: {storyboard.panels.length} | Dirty: {groupDirtyCount}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStoryboardId(storyboard.id)}
                          className="glass-btn-base glass-btn-secondary rounded-xl px-3 py-2 text-xs"
                        >
                          Focus Group
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStoryboardExpand(storyboard.id)}
                          className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-xs"
                        >
                          {expanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </header>

                    {expanded ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {sortedPanels.map((panel) => {
                          const panelDraft = getPanelDraft(panel)
                          const active = panel.id === selectedPanelId
                          const dirty = isPanelDirty(panel, panelDraft)
                          return (
                            <button
                              key={panel.id}
                              type="button"
                              onClick={() => {
                                setSelectedStoryboardId(storyboard.id)
                                setSelectedPanelId(panel.id)
                              }}
                              className={[
                                'card-base grid gap-2 rounded-xl p-3 text-left transition-colors',
                                active ? 'border-[var(--glass-accent-from)] bg-[var(--glass-bg-muted)]' : '',
                              ].join(' ')}
                            >
                              <div className="aspect-video rounded-lg border border-dashed border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)]" />
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold">Panel {panel.panel_index}</p>
                                <span className={['rounded-full px-2 py-0.5 text-xs', dirty ? 'glass-warning' : 'glass-success'].join(' ')}>
                                  {dirty ? 'Draft' : 'Saved'}
                                </span>
                              </div>
                              <p className="line-clamp-2 text-xs text-[var(--glass-text-secondary)]">{panelDraft.description || 'No description'}</p>
                              <div className="flex items-center justify-between text-[11px] text-[var(--glass-text-tertiary)]">
                                <span>{panelHasImage(panel) ? 'Image Ready' : 'No Image'}</span>
                                <span>{panelDraft.imagePrompt.trim() ? 'Image Prompt' : 'No Prompt'}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : null}

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleMockInsertGroup(storyboard.id)}
                        className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-xs"
                      >
                        + Insert Group Here
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          <SectionCard className="h-fit xl:sticky xl:top-24">
            <h3 className="mb-3 text-base font-semibold">Boards</h3>
            <div className="grid gap-2">
              {storyboards.map((storyboard) => (
                <button
                  key={storyboard.id}
                  type="button"
                  onClick={() => setSelectedStoryboardId(storyboard.id)}
                  className={[
                    'rounded-xl border px-3 py-2 text-left transition-colors',
                    selectedStoryboardId === storyboard.id
                      ? 'border-[var(--glass-accent-from)] bg-[var(--glass-bg-muted)]'
                      : 'border-[var(--glass-stroke-base)] bg-white/70 hover:bg-white',
                  ].join(' ')}
                >
                  <p className="text-sm font-medium">Storyboard {storyboard.id.slice(0, 8)}</p>
                  <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{storyboard.panels.length} panel(s)</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Panel Explorer</h3>
              <input
                className="glass-input w-full max-w-xs"
                value={panelSearch}
                onChange={(event) => setPanelSearch(event.target.value)}
                placeholder="Search panels"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                className="glass-input"
                value={styleSnippet}
                onChange={(event) => setStyleSnippet(event.target.value)}
                placeholder="Reusable style snippet"
              />
              <Button type="button" variant="secondary" onClick={handleAppendStyleToSelected} disabled={!selectedPanel}>
                Append To Selected
              </Button>
              <Button type="button" variant="secondary" onClick={handleFillMissingPrompts} disabled={!selectedStoryboard}>
                Fill Missing
              </Button>
            </div>
            {filteredPanels.length === 0 ? (
              <EmptyState title="No panels matched" description="Adjust keyword or switch storyboard." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredPanels.map((panel) => (
                  <button
                    key={panel.id}
                    type="button"
                    onClick={() => setSelectedPanelId(panel.id)}
                    className={[
                      'grid gap-2 rounded-xl border p-3 text-left transition-colors',
                      selectedPanelId === panel.id
                        ? 'border-[var(--glass-accent-from)] bg-[var(--glass-bg-muted)]'
                        : 'border-[var(--glass-stroke-base)] bg-white/70 hover:bg-white',
                    ].join(' ')}
                  >
                    {isPanelDirty(panel, getPanelDraft(panel)) ? (
                      <span className="w-fit rounded-full px-2 py-0.5 text-xs glass-warning">Draft</span>
                    ) : (
                      <span className="w-fit rounded-full px-2 py-0.5 text-xs glass-success">Saved</span>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Panel {panel.panel_index}</p>
                      <span className={['rounded-full px-2 py-0.5 text-xs', panelHasImage(panel) ? 'glass-success' : 'glass-warning'].join(' ')}>
                        {panelHasImage(panel) ? 'Image Ready' : 'No Image'}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm text-[var(--glass-text-secondary)]">{getPanelDraft(panel).description}</p>
                    {getPanelDraft(panel).imagePrompt ? (
                      <p className="line-clamp-2 text-xs text-[var(--glass-text-tertiary)]">Prompt: {getPanelDraft(panel).imagePrompt}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

          {selectedPanel && selectedPanelDraft ? (
            <SectionCard className="h-fit xl:sticky xl:top-24">
              <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Selected Panel</p>
              <h3 className="mt-1 text-lg font-semibold">Panel {selectedPanel.panel_index}</h3>
              <p className="mt-2 text-xs text-[var(--glass-text-tertiary)]">
                Status: {selectedPanelDirty ? 'Draft' : 'Saved'}
              </p>

              <div className="mt-4 grid gap-3 text-sm">
                <textarea
                  className="glass-input min-h-24"
                  value={selectedPanelDraft.description}
                  onChange={(event) => updatePanelDraft(selectedPanel.id, { description: event.target.value })}
                  placeholder="Panel description"
                />
                <textarea
                  className="glass-input min-h-24"
                  value={selectedPanelDraft.imagePrompt}
                  onChange={(event) => updatePanelDraft(selectedPanel.id, { imagePrompt: event.target.value })}
                  placeholder="Image prompt"
                />
                <textarea
                  className="glass-input min-h-24"
                  value={selectedPanelDraft.videoPrompt}
                  onChange={(event) => updatePanelDraft(selectedPanel.id, { videoPrompt: event.target.value })}
                  placeholder="Video prompt"
                />
              </div>

              <div className="mt-4 grid gap-2">
                <Button
                  type="button"
                  onClick={() => saveSelectedMutation.mutate()}
                  disabled={saveSelectedMutation.isPending || saveAllDirtyMutation.isPending}
                  block
                >
                  {saveSelectedMutation.isPending ? 'Saving...' : 'Save Selected Panel'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleResetSelected} block>
                  Reset Selected Draft
                </Button>
                <Link to={buildWorkspaceStagePath(projectId, episodeId, 'prompts')}>
                  <Button variant="secondary" block>Edit Prompt In Prompts Stage</Button>
                </Link>
                <Link to={buildWorkspaceStagePath(projectId, episodeId, 'video')}>
                  <Button variant="secondary" block>Open Video Stage</Button>
                </Link>
              </div>
            </SectionCard>
          ) : null}
          </div>
        </>
      ) : null}

      <Link
        to={buildWorkspaceStagePath(projectId, episodeId, 'prompts')}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        Continue To Prompts
      </Link>
    </div>
  )
}
