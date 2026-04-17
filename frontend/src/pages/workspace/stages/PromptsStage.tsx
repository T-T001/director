import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { appendPromptSource, getEpisode } from '../../../services/api/episodes'
import { listStoryboards, modifyPanelPrompt, updatePanel } from '../../../services/api/storyboards'
import { listTasks, type TaskItem } from '../../../services/api/tasks'
import { queryKeys } from '../../../services/queryKeys'
import { buildWorkspaceStagePath } from '../../../app/router/routes'
import { Button } from '../../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import { buildDraftPrompt, buildEpisodeStageLines, inferSpeaker, lineTimeLabel } from './episode-stage-content'
import type { Storyboard } from '../../../types/project'
import type { WorkspaceStagePageProps } from './types'

type PromptShot = {
  id: string
  order: number
  text: string
  source: 'storyboard' | 'episode'
  panelId: string | null
  panelIndex: number | null
  startTime: string | null
  endTime: string | null
  promptDefault: string
  originPrompt: string
}

type PromptAssetReference = {
  id: string
  name: string
  type: 'character' | 'location'
}

type PromptViewMode = 'cards' | 'table'

const runningStatuses = new Set(['queued', 'processing', 'running'])

function statusClass(status: string) {
  if (status === 'succeeded' || status === 'completed') return 'glass-success'
  if (status === 'failed' || status === 'canceled') return 'glass-danger'
  if (runningStatuses.has(status)) return 'glass-warning'
  return ''
}

function toShotsFromStoryboards(storyboards: Storyboard[]) {
  const sorted = [...storyboards].sort((a, b) => a.id.localeCompare(b.id))
  const shots: PromptShot[] = []
  let order = 1

  sorted.forEach((storyboard) => {
    const panels = [...storyboard.panels].sort((a, b) => a.panel_index - b.panel_index)
    panels.forEach((panel) => {
      const text = panel.description?.trim() || `Panel #${panel.panel_index}`
      const origin = panel.image_prompt?.trim() || ''
      shots.push({
        id: `panel-${panel.id}`,
        order,
        text,
        source: 'storyboard',
        panelId: panel.id,
        panelIndex: panel.panel_index,
        startTime: null,
        endTime: null,
        promptDefault: origin || buildDraftPrompt(text),
        originPrompt: origin,
      })
      order += 1
    })
  })

  return shots
}

function toShotsFromEpisode(episode: { novel_text: string | null; srt_content: string | null }) {
  const lines = buildEpisodeStageLines(episode)
  return lines.map((line, index) => {
    const prompt = buildDraftPrompt(line.text)
    return {
      id: `episode-${line.id}`,
      order: index + 1,
      text: line.text,
      source: 'episode' as const,
      panelId: null,
      panelIndex: null,
      startTime: line.startTime,
      endTime: line.endTime,
      promptDefault: prompt,
      originPrompt: prompt,
    }
  })
}

function filterPromptTasks(tasks: TaskItem[] | undefined, episodeId: string) {
  const scoped = (tasks ?? []).filter((task) => task.episode_id === episodeId || task.target_id === episodeId)
  const focused = scoped.filter((task) => /(storyboard|prompt|image)/i.test(task.task_type))
  return (focused.length > 0 ? focused : scoped).slice(0, 8)
}

function extractMentionCandidates(shots: PromptShot[], speakers: string[]) {
  const characters = new Set<string>()
  const locations = new Set<string>()

  speakers.forEach((speaker) => {
    const normalized = speaker.trim()
    if (normalized) characters.add(normalized)
  })

  shots.forEach((shot) => {
    const text = `${shot.text} ${shot.promptDefault}`
    const names = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? []
    names.forEach((item) => {
      if (!['The', 'A', 'An'].includes(item)) characters.add(item)
    })

    const locs = text.match(/\b(?:in|at|near|inside|around)\s+([A-Z][A-Za-z\-\s]{2,22})/g) ?? []
    locs.forEach((item) => locations.add(item.replace(/^(in|at|near|inside|around)\s+/i, '').trim()))
  })

  return {
    characters: Array.from(characters).slice(0, 16),
    locations: Array.from(locations).slice(0, 16),
  }
}

export function PromptsStage({ projectId, episodeId, episode }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<PromptViewMode>('cards')
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null)
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({})
  const [styleSnippet, setStyleSnippet] = useState('cinematic lighting, coherent character identity, rich visual detail')
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const [isMentionPickerOpen, setIsMentionPickerOpen] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionedCharacters, setMentionedCharacters] = useState<string[]>([])
  const [mentionedLocations, setMentionedLocations] = useState<string[]>([])
  const [selectedAssetsByShot, setSelectedAssetsByShot] = useState<Record<string, PromptAssetReference[]>>({})

  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('Keep continuity and improve camera language details.')

  const [appendContent, setAppendContent] = useState('')
  const [shotSearch, setShotSearch] = useState('')
  const [showDirtyOnly, setShowDirtyOnly] = useState(false)

  const episodeQuery = useQuery({
    queryKey: queryKeys.episodes.detail(episodeId),
    queryFn: () => getEpisode(episodeId),
    enabled: Boolean(episodeId),
  })

  const storyboardsQuery = useQuery({
    queryKey: queryKeys.storyboards.byEpisode(episodeId),
    queryFn: () => listStoryboards(episodeId),
    enabled: Boolean(episodeId),
  })

  const tasksQuery = useQuery({
    queryKey: [...queryKeys.tasks.byProject(projectId), 'prompts-stage', episodeId],
    queryFn: () => listTasks({ projectId, limit: 30 }),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const tasks = query.state.data as TaskItem[] | undefined
      return filterPromptTasks(tasks, episodeId).some((task) => runningStatuses.has(task.status)) ? 2000 : false
    },
  })

  const currentEpisode = useMemo(() => episodeQuery.data ?? episode, [episodeQuery.data, episode])

  const shots = useMemo(() => {
    if (storyboardsQuery.data && storyboardsQuery.data.length > 0) {
      const fromStoryboards = toShotsFromStoryboards(storyboardsQuery.data)
      if (fromStoryboards.length > 0) return fromStoryboards
    }
    return toShotsFromEpisode({
      novel_text: currentEpisode.novel_text,
      srt_content: currentEpisode.srt_content,
    })
  }, [currentEpisode.novel_text, currentEpisode.srt_content, storyboardsQuery.data])

  const speakers = useMemo(() => {
    const lines = buildEpisodeStageLines({
      novel_text: currentEpisode.novel_text,
      srt_content: currentEpisode.srt_content,
    })
    const set = new Set<string>()
    lines.forEach((line) => {
      const speaker = inferSpeaker(line.text)
      if (speaker) set.add(speaker)
    })
    return Array.from(set)
  }, [currentEpisode.novel_text, currentEpisode.srt_content])

  const mentionOptions = useMemo(() => extractMentionCandidates(shots, speakers), [shots, speakers])

  useEffect(() => {
    setPromptDrafts((previous) => {
      const next: Record<string, string> = {}
      shots.forEach((shot) => {
        next[shot.id] = previous[shot.id] ?? shot.promptDefault
      })
      return next
    })
  }, [shots])

  useEffect(() => {
    setSelectedAssetsByShot((previous) => {
      const next: Record<string, PromptAssetReference[]> = {}
      shots.forEach((shot) => {
        if (previous[shot.id]) {
          next[shot.id] = previous[shot.id]
        }
      })
      return next
    })
  }, [shots])

  useEffect(() => {
    if (shots.length === 0) {
      setSelectedShotId(null)
      return
    }
    if (!selectedShotId || !shots.some((shot) => shot.id === selectedShotId)) {
      setSelectedShotId(shots[0].id)
    }
  }, [selectedShotId, shots])

  const selectedShot = useMemo(() => shots.find((shot) => shot.id === selectedShotId) ?? null, [selectedShotId, shots])
  const getPrompt = (shot: PromptShot) => promptDrafts[shot.id] ?? shot.promptDefault
  const isShotDirty = (shot: PromptShot) => getPrompt(shot).trim() !== (shot.panelId ? shot.originPrompt.trim() : shot.promptDefault.trim())
  const hasMentionTokens = (shot: PromptShot) =>
    /(?:characters|locations)\s*:/i.test(getPrompt(shot)) || (selectedAssetsByShot[shot.id]?.length ?? 0) > 0
  const selectedAssetsForCurrentShot = useMemo(
    () => (selectedShot ? selectedAssetsByShot[selectedShot.id] ?? [] : []),
    [selectedAssetsByShot, selectedShot],
  )
  const assetLibrary = useMemo(() => {
    const characterAssets: PromptAssetReference[] = mentionOptions.characters.map((item) => ({
      id: `character:${item.toLowerCase()}`,
      name: item,
      type: 'character',
    }))
    const locationAssets: PromptAssetReference[] = mentionOptions.locations.map((item) => ({
      id: `location:${item.toLowerCase()}`,
      name: item,
      type: 'location',
    }))
    return { characterAssets, locationAssets }
  }, [mentionOptions.characters, mentionOptions.locations])

  const readyCount = useMemo(() => shots.filter((shot) => Boolean(getPrompt(shot).trim())).length, [shots, promptDrafts])
  const dirtyCount = useMemo(() => shots.filter((shot) => isShotDirty(shot)).length, [shots, promptDrafts])
  const mentionedShotCount = useMemo(() => shots.filter((shot) => hasMentionTokens(shot)).length, [selectedAssetsByShot, shots, promptDrafts])
  const visibleShots = useMemo(() => {
    const normalizedSearch = shotSearch.toLowerCase().trim()
    return shots.filter((shot) => {
      if (showDirtyOnly && !isShotDirty(shot)) return false
      if (!normalizedSearch) return true
      const prompt = getPrompt(shot)
      return [shot.text, prompt, shot.source, `${shot.order}`, `${shot.panelIndex ?? ''}`]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [promptDrafts, shotSearch, showDirtyOnly, shots])

  const promptTasks = useMemo(() => filterPromptTasks(tasksQuery.data, episodeId), [tasksQuery.data, episodeId])
  const hasRunningPromptTasks = useMemo(
    () => promptTasks.some((task) => runningStatuses.has(task.status)),
    [promptTasks],
  )

  useEffect(() => {
    if (!hasRunningPromptTasks) return
    const timer = window.setInterval(() => {
      void storyboardsQuery.refetch()
    }, 2000)
    return () => window.clearInterval(timer)
  }, [hasRunningPromptTasks, storyboardsQuery])

  const saveSelectedMutation = useMutation({
    mutationFn: async () => {
      if (!selectedShot || !selectedShot.panelId) {
        throw new Error('Only storyboard-backed shots can be saved to backend.')
      }
      const prompt = getPrompt(selectedShot).trim()
      await updatePanel(selectedShot.panelId, { image_prompt: prompt || null })
    },
    onSuccess: async () => {
      setSaveNotice('Selected prompt saved.')
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      await storyboardsQuery.refetch()
    },
    onError: (error) => {
      setSaveNotice(error instanceof Error ? error.message : 'Save failed.')
    },
  })

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const changed = shots.filter((shot) => shot.panelId && getPrompt(shot).trim() !== shot.originPrompt.trim())
      for (const shot of changed) {
        const prompt = getPrompt(shot).trim()
        await updatePanel(shot.panelId as string, { image_prompt: prompt || null })
      }
      return changed.length
    },
    onSuccess: async (count) => {
      setSaveNotice(count > 0 ? `Saved ${count} prompt(s).` : 'No changes to save.')
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      await storyboardsQuery.refetch()
    },
    onError: (error) => {
      setSaveNotice(error instanceof Error ? error.message : 'Batch save failed.')
    },
  })

  const aiModifyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedShot || !selectedShot.panelId) {
        throw new Error('Generate storyboard before using AI modify.')
      }
      const referencedAssets = selectedAssetsByShot[selectedShot.id] ?? []
      return modifyPanelPrompt(selectedShot.panelId, {
        prompt: getPrompt(selectedShot).trim(),
        instruction: aiInstruction.trim(),
        mentioned_characters: mentionedCharacters,
        mentioned_locations: mentionedLocations,
        referenced_assets: referencedAssets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          type: asset.type,
        })),
      })
    },
    onSuccess: async (result) => {
      setIsAiModalOpen(false)
      setSaveNotice(result.deduped ? 'AI modify is already running for this shot.' : 'AI modify queued for selected prompt.')
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      await Promise.all([tasksQuery.refetch(), storyboardsQuery.refetch()])
    },
    onError: (error) => {
      setSaveNotice(error instanceof Error ? error.message : 'AI modify failed to start.')
    },
  })

  const appendSourceMutation = useMutation({
    mutationFn: async () => {
      if (!storyboardsQuery.data || storyboardsQuery.data.length === 0) {
        throw new Error('Generate storyboard before appending prompt source.')
      }
      return appendPromptSource(episodeId, { content: appendContent.trim() })
    },
    onSuccess: async (result) => {
      setAppendContent('')
      setSaveNotice(result.deduped ? 'Append prompt source is already running for this episode.' : 'Append prompt source queued.')
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      await Promise.all([tasksQuery.refetch(), storyboardsQuery.refetch()])
    },
    onError: (error) => {
      setSaveNotice(error instanceof Error ? error.message : 'Append prompt source failed to start.')
    },
  })

  const updatePrompt = (shotId: string, value: string) => {
    setPromptDrafts((previous) => ({ ...previous, [shotId]: value }))
  }

  const handleFillEmptyPrompts = () => {
    setPromptDrafts((previous) => {
      const next = { ...previous }
      shots.forEach((shot) => {
        if (!next[shot.id] || !next[shot.id].trim()) {
          const base = buildDraftPrompt(shot.text)
          next[shot.id] = styleSnippet.trim() ? `${base}. ${styleSnippet.trim()}` : base
        }
      })
      return next
    })
  }

  const handleAppendStyle = () => {
    if (!selectedShot || !styleSnippet.trim()) return
    const current = getPrompt(selectedShot)
    updatePrompt(selectedShot.id, `${current}${current.trim() ? '\n\n' : ''}${styleSnippet.trim()}`)
  }

  const handleCopySelected = async () => {
    if (!selectedShot) return
    try {
      await navigator.clipboard.writeText(getPrompt(selectedShot))
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1200)
    } catch {
      setCopyState('failed')
      setTimeout(() => setCopyState('idle'), 1200)
    }
  }

  const toggleMention = (kind: 'character' | 'location', item: string) => {
    if (kind === 'character') {
      setMentionedCharacters((previous) => (previous.includes(item) ? previous.filter((v) => v !== item) : [...previous, item]))
      return
    }
    setMentionedLocations((previous) => (previous.includes(item) ? previous.filter((v) => v !== item) : [...previous, item]))
  }

  const mentionSummary = useMemo(() => {
    const chunks: string[] = []
    if (mentionedCharacters.length > 0) chunks.push(`${mentionedCharacters.length} character(s)`)
    if (mentionedLocations.length > 0) chunks.push(`${mentionedLocations.length} location(s)`)
    if (selectedAssetsForCurrentShot.length > 0) chunks.push(`${selectedAssetsForCurrentShot.length} asset mention(s)`)
    return chunks.length > 0 ? chunks.join(' + ') : 'No mentions selected'
  }, [mentionedCharacters, mentionedLocations, selectedAssetsForCurrentShot.length])

  const toggleAssetSelectionForShot = (shotId: string, asset: PromptAssetReference) => {
    setSelectedAssetsByShot((previous) => {
      const current = previous[shotId] ?? []
      const exists = current.some((item) => item.id === asset.id)
      return {
        ...previous,
        [shotId]: exists ? current.filter((item) => item.id !== asset.id) : [...current, asset],
      }
    })
  }

  const removeSelectedAsset = (shotId: string, assetId: string) => {
    setSelectedAssetsByShot((previous) => {
      const current = previous[shotId] ?? []
      return {
        ...previous,
        [shotId]: current.filter((item) => item.id !== assetId),
      }
    })
  }

  const insertSelectedAssetsToAiInstruction = () => {
    if (!selectedShot) return
    const assets = selectedAssetsByShot[selectedShot.id] ?? []
    if (assets.length === 0) return
    const mentions = assets.map((asset) => `@${asset.name}`).join(' ')
    setAiInstruction((previous) => `${previous.trim()}${previous.trim() ? '\n\n' : ''}${mentions}`)
  }

  const applyMentionsToSelected = () => {
    if (!selectedShot) return
    const segments: string[] = []
    if (mentionedCharacters.length > 0) segments.push(`Characters: ${mentionedCharacters.join(', ')}`)
    if (mentionedLocations.length > 0) segments.push(`Locations: ${mentionedLocations.join(', ')}`)
    const selectedAssets = selectedAssetsByShot[selectedShot.id] ?? []
    if (selectedAssets.length > 0) segments.push(`Assets: ${selectedAssets.map((asset) => `@${asset.name}`).join(', ')}`)
    if (segments.length === 0) return
    const current = getPrompt(selectedShot).trim()
    updatePrompt(selectedShot.id, `${current}${current ? '\n\n' : ''}${segments.join(' | ')}`)
    setSaveNotice('Mentions inserted into selected prompt.')
  }

  const applyAiModify = async () => {
    if (!selectedShot || !aiInstruction.trim()) return
    await aiModifyMutation.mutateAsync()
  }

  const submitAppend = async () => {
    if (!appendContent.trim()) return
    await appendSourceMutation.mutateAsync()
  }

  const generateShotImage = (shot: PromptShot) => {
    if (!shot.panelId) {
      setSaveNotice('Generate storyboard before running image generation from prompts.')
      return
    }
    setSaveNotice('Prompt image generation is not exposed from this stage yet.')
  }

  const generateAllImages = () => {
    if (shots.length === 0) return
    if (!storyboardsQuery.data || storyboardsQuery.data.length === 0) {
      setSaveNotice('Generate storyboard before running batch image generation.')
      return
    }
    setSaveNotice('Prompt image generation is not exposed from this stage yet.')
  }

  const filteredCharacters = mentionOptions.characters.filter((item) => item.toLowerCase().includes(mentionSearch.toLowerCase().trim()))
  const filteredLocations = mentionOptions.locations.filter((item) => item.toLowerCase().includes(mentionSearch.toLowerCase().trim()))
  const filteredCharacterAssets = assetLibrary.characterAssets.filter((item) => item.name.toLowerCase().includes(mentionSearch.toLowerCase().trim()))
  const filteredLocationAssets = assetLibrary.locationAssets.filter((item) => item.name.toLowerCase().includes(mentionSearch.toLowerCase().trim()))

  const runningTaskCount = promptTasks.filter((task) => runningStatuses.has(task.status)).length
  const runningTotal = runningTaskCount

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Prompts Stage</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              Prompt editing with storyboard-backed save, append source, and AI modify workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'storyboard')}>
              <Button variant="secondary">Back Storyboard</Button>
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={() => saveSelectedMutation.mutate()}
              disabled={!selectedShot || saveSelectedMutation.isPending || saveAllMutation.isPending}
            >
              {saveSelectedMutation.isPending ? 'Saving...' : 'Save Selected'}
            </Button>
            <Button type="button" onClick={() => saveAllMutation.mutate()} disabled={saveSelectedMutation.isPending || saveAllMutation.isPending}>
              {saveAllMutation.isPending ? 'Saving All...' : 'Save All'}
            </Button>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'voice')}>
              <Button variant="secondary">Go Voice</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Shots</p>
            <p className="mt-1 text-2xl font-semibold">{shots.length}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Prompt Ready</p>
            <p className="mt-1 text-2xl font-semibold">{readyCount}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Dirty Drafts</p>
            <p className="mt-1 text-2xl font-semibold">{dirtyCount}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Running Tasks</p>
            <p className="mt-1 text-2xl font-semibold">{runningTotal}</p>
          </article>
        </div>
      </SectionCard>

      {saveNotice ? <SectionCard className="glass-success rounded-2xl p-4 text-sm">{saveNotice}</SectionCard> : null}
      {episodeQuery.isLoading || storyboardsQuery.isLoading ? <LoadingState message="Loading prompt source..." /> : null}
      {episodeQuery.isError || storyboardsQuery.isError ? <ErrorState message="Failed to load prompt source." /> : null}

      {shots.length === 0 ? (
        <EmptyState title="No prompt source yet" description="Create script or storyboard content first." />
      ) : (
        <>
          <SectionCard className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">Prompt Workspace</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">
                  Visible {visibleShots.length} · Mention tagged {mentionedShotCount} · Dirty drafts {dirtyCount}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={[
                    'glass-btn-base rounded-lg px-3 py-1.5 text-xs',
                    viewMode === 'cards' ? 'glass-btn-tone-info text-white' : 'glass-btn-ghost',
                  ].join(' ')}
                  onClick={() => setViewMode('cards')}
                >
                  Cards
                </button>
                <button
                  type="button"
                  className={[
                    'glass-btn-base rounded-lg px-3 py-1.5 text-xs',
                    viewMode === 'table' ? 'glass-btn-tone-info text-white' : 'glass-btn-ghost',
                  ].join(' ')}
                  onClick={() => setViewMode('table')}
                >
                  Table
                </button>
                <button
                  type="button"
                  className="glass-btn-base glass-btn-tone-success rounded-lg px-3 py-1.5 text-xs text-white"
                  onClick={generateAllImages}
                  disabled={shots.length === 0}
                >
                  Generate All Images
                </button>
                <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-3 py-1.5 text-xs" onClick={() => setIsMentionPickerOpen(true)}>Mention Picker</button>
                <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-3 py-1.5 text-xs" onClick={() => setIsAiModalOpen(true)}>AI Modify</button>
              </div>
            </div>

            <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="glass-input"
                  value={shotSearch}
                  onChange={(event) => setShotSearch(event.target.value)}
                  placeholder="Search shots / prompts / source"
                />
                <button
                  type="button"
                  className={[
                    'glass-btn-base rounded-lg px-3 py-1.5 text-xs justify-start',
                    showDirtyOnly ? 'glass-btn-tone-info text-white' : 'glass-btn-ghost',
                  ].join(' ')}
                  onClick={() => setShowDirtyOnly((current) => !current)}
                >
                  {showDirtyOnly ? 'Showing Dirty Only' : 'Show Dirty Only'}
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <input className="glass-input" value={styleSnippet} onChange={(event) => setStyleSnippet(event.target.value)} placeholder="Reusable style snippet" />
                <Button type="button" variant="secondary" onClick={handleAppendStyle} disabled={!selectedShot}>Append To Selected</Button>
                <Button type="button" variant="secondary" onClick={handleFillEmptyPrompts}>Fill Empty</Button>
              </div>
            </div>

            {viewMode === 'cards' ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleShots.map((shot) => {
                  const active = shot.id === selectedShotId
                  const prompt = getPrompt(shot)
                  const shotDirty = isShotDirty(shot)
                  const timing = lineTimeLabel({ startTime: shot.startTime, endTime: shot.endTime }) || 'No Timing'
                  const isPromptReady = Boolean(prompt.trim())
                  const hasMention = hasMentionTokens(shot)
                  return (
                    <article
                      key={shot.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedShotId(shot.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedShotId(shot.id)
                        }
                      }}
                      className={[
                        'card-base rounded-xl p-3 text-left transition-colors cursor-pointer',
                        active ? 'border-[var(--glass-accent-from)] bg-[var(--glass-bg-muted)]' : '',
                      ].join(' ')}
                    >
                      <div className="aspect-video rounded-lg border border-dashed border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)]" />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-[var(--glass-text-tertiary)]">Shot {shot.order}</p>
                        <span className="glass-chip">{shot.source}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
                        <span className={['rounded-full px-2 py-0.5', isPromptReady ? 'glass-success' : 'glass-warning'].join(' ')}>
                          {isPromptReady ? 'Prompt Ready' : 'Prompt Missing'}
                        </span>
                        {shotDirty ? <span className="glass-warning rounded-full px-2 py-0.5">Dirty</span> : <span className="glass-success rounded-full px-2 py-0.5">Synced</span>}
                        {hasMention ? <span className="glass-chip px-2 py-0.5">Mentioned</span> : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--glass-text-tertiary)]">
                        <span>{shot.panelIndex !== null ? `Panel ${shot.panelIndex}` : 'Fallback'}</span>
                        <span>{timing}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--glass-text-secondary)]">{shot.text}</p>
                      <p className="mt-2 line-clamp-2 text-xs text-[var(--glass-text-tertiary)]">{prompt || 'No prompt'}</p>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            generateShotImage(shot)
                          }}
                          className="glass-btn-base rounded-lg border border-[var(--glass-stroke-base)] bg-white px-2 py-1 text-[11px] text-[var(--glass-text-secondary)]"
                        >
                          Generate
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedShotId(shot.id)
                            setIsMentionPickerOpen(true)
                          }}
                          className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-[11px]"
                        >
                          Mention
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedShotId(shot.id)
                            setIsAiModalOpen(true)
                          }}
                          className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-[11px]"
                        >
                          AI Modify
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedShotId(shot.id)
                          }}
                          className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-[11px]"
                        >
                          Edit
                        </button>
                      </div>
                    </article>
                  )
                })}
                {visibleShots.length === 0 ? <p className="text-sm text-[var(--glass-text-tertiary)]">No shots match the current filter.</p> : null}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--glass-stroke-base)] bg-white/70">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">
                    <tr>
                      <th className="px-3 py-2">Shot</th>
                      <th className="px-3 py-2">Preview</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2">Timing</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Prompt</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleShots.map((shot) => {
                      const shotDirty = isShotDirty(shot)
                      const prompt = getPrompt(shot)
                      return (
                        <tr key={shot.id} onClick={() => setSelectedShotId(shot.id)} className="cursor-pointer border-t border-[var(--glass-stroke-base)] hover:bg-white">
                          <td className="px-3 py-2 font-medium">#{shot.order}</td>
                          <td className="px-3 py-2">
                            <div className="h-10 w-16 rounded border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)]" />
                          </td>
                          <td className="px-3 py-2">{shot.source}</td>
                          <td className="px-3 py-2">{lineTimeLabel({ startTime: shot.startTime, endTime: shot.endTime }) || '-'}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-1 text-[11px]">
                              <span className={['rounded-full px-2 py-0.5', prompt.trim() ? 'glass-success' : 'glass-warning'].join(' ')}>
                                {prompt.trim() ? 'Ready' : 'Missing'}
                              </span>
                              {shotDirty ? <span className="glass-warning rounded-full px-2 py-0.5">Dirty</span> : <span className="glass-success rounded-full px-2 py-0.5">Synced</span>}
                              {hasMentionTokens(shot) ? <span className="glass-chip px-2 py-0.5">Mentioned</span> : null}
                            </div>
                          </td>
                          <td className="line-clamp-2 px-3 py-2">{prompt}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                className="glass-btn-base glass-btn-ghost rounded-md px-2 py-1 text-[11px]"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  generateShotImage(shot)
                                }}
                              >
                                Generate
                              </button>
                              <button
                                type="button"
                                className="glass-btn-base glass-btn-ghost rounded-md px-2 py-1 text-[11px]"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedShotId(shot.id)
                                  setIsMentionPickerOpen(true)
                                }}
                              >
                                Mention
                              </button>
                              <button
                                type="button"
                                className="glass-btn-base glass-btn-ghost rounded-md px-2 py-1 text-[11px]"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedShotId(shot.id)
                                  setIsAiModalOpen(true)
                                }}
                              >
                                AI
                              </button>
                              <button
                                type="button"
                                className="glass-btn-base glass-btn-ghost rounded-md px-2 py-1 text-[11px]"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedShotId(shot.id)
                                }}
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {visibleShots.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-sm text-[var(--glass-text-tertiary)]">No shots match the current filter.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {selectedShot ? (
            <SectionCard className="grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">Shot Prompt Editor</h3>
                  <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Shot {selectedShot.order} | Source: {selectedShot.source}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setIsMentionPickerOpen(true)}>Mention</Button>
                  <Button type="button" variant="secondary" onClick={() => setIsAiModalOpen(true)}>AI Modify</Button>
                  <Button type="button" variant="secondary" onClick={handleCopySelected}>Copy Prompt</Button>
                  <Button type="button" variant="secondary" onClick={() => updatePrompt(selectedShot.id, '')}>Clear</Button>
                </div>
              </div>

              <p className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-sm text-[var(--glass-text-secondary)]">{selectedShot.text}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={['rounded-full px-2 py-0.5', getPrompt(selectedShot).trim() ? 'glass-success' : 'glass-warning'].join(' ')}>
                  {getPrompt(selectedShot).trim() ? 'Prompt Ready' : 'Prompt Missing'}
                </span>
                {isShotDirty(selectedShot) ? <span className="glass-warning rounded-full px-2 py-0.5">Dirty</span> : <span className="glass-success rounded-full px-2 py-0.5">Synced</span>}
                {hasMentionTokens(selectedShot) ? <span className="glass-chip px-2 py-0.5">Mentioned</span> : null}
                <span className="text-[var(--glass-text-tertiary)]">{mentionSummary}</span>
              </div>
              {selectedAssetsForCurrentShot.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedAssetsForCurrentShot.map((asset) => (
                    <button
                      key={`editor-${asset.id}`}
                      type="button"
                      onClick={() => removeSelectedAsset(selectedShot.id, asset.id)}
                      className={[
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                        asset.type === 'character' ? 'bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]' : 'bg-[var(--glass-tone-warning-bg)] text-[var(--glass-tone-warning-fg)]',
                      ].join(' ')}
                      title="Remove selected asset mention"
                    >
                      <span>@{asset.name}</span>
                      <span>x</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <textarea
                className="glass-input min-h-[240px]"
                value={getPrompt(selectedShot)}
                onChange={(event) => updatePrompt(selectedShot.id, event.target.value)}
                placeholder="Describe composition, style, atmosphere, and camera language."
              />

              {selectedShot.panelId ? null : <p className="text-xs text-[var(--glass-text-tertiary)]">Episode fallback shot: local edits only. Generate storyboard to persist or run AI modify.</p>}
              {copyState === 'copied' ? <p className="text-xs text-[var(--glass-text-tertiary)]">Prompt copied.</p> : null}
              {copyState === 'failed' ? <p className="text-xs text-[var(--glass-text-tertiary)]">Copy failed.</p> : null}
            </SectionCard>
          ) : null}

          <SectionCard className="rounded-2xl border-2 border-dashed border-[var(--glass-stroke-strong)] bg-[var(--glass-bg-muted)]">
            <h3 className="text-base font-semibold">Append Prompt Source</h3>
            <textarea className="glass-input mt-3 min-h-40" value={appendContent} onChange={(event) => setAppendContent(event.target.value)} placeholder="Paste source content..." />
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--glass-text-tertiary)]">
              <span>{storyboardsQuery.data && storyboardsQuery.data.length > 0 ? 'Updates existing storyboard panels.' : 'Generate storyboard first to append source.'}</span>
              <button
                type="button"
                onClick={() => void submitAppend()}
                disabled={appendSourceMutation.isPending || !appendContent.trim()}
                className="glass-btn-base glass-btn-tone-success rounded-xl px-5 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {appendSourceMutation.isPending ? 'Appending...' : 'Append Prompt Source'}
              </button>
            </div>
          </SectionCard>
        </>
      )}

      <SectionCard className="grid gap-2">
        <h3 className="text-base font-semibold">Prompt Task Stream</h3>
        {tasksQuery.isLoading ? <LoadingState message="Loading tasks..." /> : null}
        {tasksQuery.isError ? <ErrorState message="Failed to load tasks." /> : null}
        {!tasksQuery.isLoading && !tasksQuery.isError && promptTasks.length === 0 ? <p className="text-sm text-[var(--glass-text-tertiary)]">No prompt-related tasks yet.</p> : null}
        {promptTasks.map((task) => (
          <article key={task.id} className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-[var(--glass-text-secondary)]">{task.task_type}</p>
              <span className={['rounded-full px-2 py-0.5 text-xs', statusClass(task.status)].join(' ')}>{task.status.replace(/_/g, ' ')}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Progress: {task.progress}% | Updated: {new Date(task.updated_at).toLocaleString()}</p>
          </article>
        ))}
      </SectionCard>

      <Link
        to={buildWorkspaceStagePath(projectId, episodeId, 'voice')}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        Enter Voice Generation
      </Link>

      {isAiModalOpen && selectedShot ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button type="button" className="glass-overlay absolute inset-0" onClick={() => setIsAiModalOpen(false)} />
          <section className="glass-modal-shell relative z-10 grid w-full max-w-4xl gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">AI Modify Prompt</h3>
              <button type="button" className="glass-btn-base glass-btn-ghost rounded-xl px-2 py-1.5 text-xs" onClick={() => setIsAiModalOpen(false)}>Close</button>
            </div>
            <p className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-sm text-[var(--glass-text-secondary)]">{selectedShot.text}</p>
            <div className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Referenced Assets</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedAssetsForCurrentShot.length === 0 ? <span className="text-xs text-[var(--glass-text-tertiary)]">No asset mentions selected for this shot.</span> : null}
                {selectedAssetsForCurrentShot.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={[
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                      asset.type === 'character' ? 'bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]' : 'bg-[var(--glass-tone-warning-bg)] text-[var(--glass-tone-warning-fg)]',
                    ].join(' ')}
                    onClick={() => removeSelectedAsset(selectedShot.id, asset.id)}
                    title="Remove selected asset mention"
                  >
                    <span>@{asset.name}</span>
                    <span>x</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={insertSelectedAssetsToAiInstruction} disabled={selectedAssetsForCurrentShot.length === 0}>
                  Insert @mentions to instruction
                </button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 p-2">
                <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Character Assets</p>
                <div className="mt-2 flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                  {assetLibrary.characterAssets.map((asset) => {
                    const selected = selectedAssetsForCurrentShot.some((item) => item.id === asset.id)
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggleAssetSelectionForShot(selectedShot.id, asset)}
                        className={[
                          'rounded-md border px-2 py-1 text-xs',
                          selected ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]' : 'border-[var(--glass-stroke-base)] bg-white text-[var(--glass-text-secondary)]',
                        ].join(' ')}
                      >
                        @{asset.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 p-2">
                <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Location Assets</p>
                <div className="mt-2 flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                  {assetLibrary.locationAssets.map((asset) => {
                    const selected = selectedAssetsForCurrentShot.some((item) => item.id === asset.id)
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggleAssetSelectionForShot(selectedShot.id, asset)}
                        className={[
                          'rounded-md border px-2 py-1 text-xs',
                          selected ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-warning-bg)] text-[var(--glass-tone-warning-fg)]' : 'border-[var(--glass-stroke-base)] bg-white text-[var(--glass-text-secondary)]',
                        ].join(' ')}
                      >
                        @{asset.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <textarea className="glass-input min-h-28" value={aiInstruction} onChange={(event) => setAiInstruction(event.target.value)} placeholder="Describe how AI should refine the prompt." />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsAiModalOpen(false)}>Cancel</Button>
              <Button type="button" onClick={() => void applyAiModify()} disabled={aiModifyMutation.isPending || !aiInstruction.trim()}>{aiModifyMutation.isPending ? 'Applying...' : 'Apply To Selected Prompt'}</Button>
            </div>
          </section>
        </div>
      ) : null}

      {isMentionPickerOpen && selectedShot ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button type="button" className="glass-overlay absolute inset-0" onClick={() => setIsMentionPickerOpen(false)} />
          <section className="glass-modal-shell relative z-10 grid w-full max-w-4xl gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Mention Picker</h3>
              <button type="button" className="glass-btn-base glass-btn-ghost rounded-xl px-2 py-1.5 text-xs" onClick={() => setIsMentionPickerOpen(false)}>Close</button>
            </div>

            <input className="glass-input" value={mentionSearch} onChange={(event) => setMentionSearch(event.target.value)} placeholder="Search mentions" />

            <div className="grid gap-2 lg:grid-cols-3">
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 p-2">
                <p className="mb-1 text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Character Options</p>
                {filteredCharacters.length === 0 ? <p className="text-xs text-[var(--glass-text-tertiary)]">No candidates.</p> : null}
                {filteredCharacters.map((item) => {
                  const selected = mentionedCharacters.includes(item)
                  const asset = filteredCharacterAssets.find((candidate) => candidate.name === item)
                  const assetSelected = asset ? selectedAssetsForCurrentShot.some((entry) => entry.id === asset.id) : false
                  return (
                    <button
                      key={`ch-${item}`}
                      type="button"
                      onClick={() => toggleMention('character', item)}
                      className={[
                        'w-full rounded-lg border px-2 py-1.5 text-left text-xs transition-colors',
                        selected ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]' : 'border-[var(--glass-stroke-base)] bg-white text-[var(--glass-text-secondary)] hover:bg-white/80',
                      ].join(' ')}
                    >
                      {selected ? 'Added | ' : ''}
                      {item}
                      {assetSelected ? ' | @Bound' : ''}
                    </button>
                  )
                })}
                <div className="mt-2 border-t border-[var(--glass-stroke-base)] pt-2">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-[var(--glass-text-tertiary)]">Bind As @asset</p>
                  <div className="flex flex-wrap gap-1">
                    {filteredCharacterAssets.map((asset) => {
                      const selected = selectedAssetsForCurrentShot.some((entry) => entry.id === asset.id)
                      return (
                        <button
                          key={`bind-${asset.id}`}
                          type="button"
                          onClick={() => toggleAssetSelectionForShot(selectedShot.id, asset)}
                          className={[
                            'rounded-md border px-2 py-1 text-[11px]',
                            selected ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]' : 'border-[var(--glass-stroke-base)] bg-white text-[var(--glass-text-secondary)]',
                          ].join(' ')}
                        >
                          @{asset.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 p-2">
                <p className="mb-1 text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Location Options</p>
                {filteredLocations.length === 0 ? <p className="text-xs text-[var(--glass-text-tertiary)]">No candidates.</p> : null}
                {filteredLocations.map((item) => {
                  const selected = mentionedLocations.includes(item)
                  const asset = filteredLocationAssets.find((candidate) => candidate.name === item)
                  const assetSelected = asset ? selectedAssetsForCurrentShot.some((entry) => entry.id === asset.id) : false
                  return (
                    <button
                      key={`loc-${item}`}
                      type="button"
                      onClick={() => toggleMention('location', item)}
                      className={[
                        'w-full rounded-lg border px-2 py-1.5 text-left text-xs transition-colors',
                        selected ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]' : 'border-[var(--glass-stroke-base)] bg-white text-[var(--glass-text-secondary)] hover:bg-white/80',
                      ].join(' ')}
                    >
                      {selected ? 'Added | ' : ''}
                      {item}
                      {assetSelected ? ' | @Bound' : ''}
                    </button>
                  )
                })}
                <div className="mt-2 border-t border-[var(--glass-stroke-base)] pt-2">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-[var(--glass-text-tertiary)]">Bind As @asset</p>
                  <div className="flex flex-wrap gap-1">
                    {filteredLocationAssets.map((asset) => {
                      const selected = selectedAssetsForCurrentShot.some((entry) => entry.id === asset.id)
                      return (
                        <button
                          key={`bind-${asset.id}`}
                          type="button"
                          onClick={() => toggleAssetSelectionForShot(selectedShot.id, asset)}
                          className={[
                            'rounded-md border px-2 py-1 text-[11px]',
                            selected ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-warning-bg)] text-[var(--glass-tone-warning-fg)]' : 'border-[var(--glass-stroke-base)] bg-white text-[var(--glass-text-secondary)]',
                          ].join(' ')}
                        >
                          @{asset.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 p-2">
                <p className="mb-1 text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Selected Asset Mentions</p>
                {selectedAssetsForCurrentShot.length === 0 ? <p className="text-xs text-[var(--glass-text-tertiary)]">No assets selected for this shot.</p> : null}
                <div className="flex flex-wrap gap-1.5">
                  {selectedAssetsForCurrentShot.map((asset) => (
                    <button
                      key={`selected-${asset.id}`}
                      type="button"
                      onClick={() => removeSelectedAsset(selectedShot.id, asset.id)}
                      className={[
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                        asset.type === 'character' ? 'bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]' : 'bg-[var(--glass-tone-warning-bg)] text-[var(--glass-tone-warning-fg)]',
                      ].join(' ')}
                    >
                      <span>@{asset.name}</span>
                      <span>x</span>
                    </button>
                  ))}
              </div>
            </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-3 py-1.5 text-xs" onClick={insertSelectedAssetsToAiInstruction} disabled={selectedAssetsForCurrentShot.length === 0}>
                Insert Selected @assets To AI Instruction
              </button>
              <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsMentionPickerOpen(false)}>Cancel</Button>
              <Button
                type="button"
                onClick={() => {
                  applyMentionsToSelected()
                  setIsMentionPickerOpen(false)
                }}
              >
                Apply Mentions
              </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
