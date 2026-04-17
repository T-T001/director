import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getEpisode } from '../../../services/api/episodes'
import { buildMediaUrl } from '../../../services/api/client'
import { generatePanelVideo, lipSyncPanelVideo, listStoryboards, updatePanel } from '../../../services/api/storyboards'
import { listTasks, type TaskItem } from '../../../services/api/tasks'
import { queryKeys } from '../../../services/queryKeys'
import { buildWorkspaceStagePath } from '../../../app/router/routes'
import { Button } from '../../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import { buildDraftPrompt, buildEpisodeStageLines, lineTimeLabel } from './episode-stage-content'
import type { StoryboardPanel } from '../../../types/project'
import type { WorkspaceStagePageProps } from './types'

type RenderMode = 'single-panel' | 'first-last-frame'
type ShotPreset = 'cinematic' | 'action' | 'dialogue'
type DurationHint = 'auto' | 'short' | 'medium' | 'long'

type ShotConfigDraft = {
  mode: RenderMode
  preset: ShotPreset
  motion: string
  camera: string
  durationHint: DurationHint
  enableLipSync: boolean
}

type RenderAction = 'generate' | 'model' | 'lip-sync'

type VideoShot = {
  id: string
  panelId: string
  order: number
  text: string
  promptDefault: string
  originPrompt: string
  imageMediaId: string | null
  videoMediaId: string | null
}

type LipSyncVoiceOption = {
  id: string
  speaker: string
  text: string
  timing: string | null
}

const runningStatuses = new Set(['queued', 'processing', 'running'])

function statusClass(status: string) {
  if (status === 'succeeded' || status === 'completed') return 'glass-success'
  if (status === 'failed' || status === 'canceled') return 'glass-danger'
  if (runningStatuses.has(status)) return 'glass-warning'
  return ''
}

function toVideoShots(panels: StoryboardPanel[]): VideoShot[] {
  return [...panels]
    .sort((left, right) => left.panel_index - right.panel_index)
    .map((panel, index) => ({
      id: `panel-${panel.id}`,
      panelId: panel.id,
      order: index + 1,
      text: panel.description?.trim() || `Panel #${panel.panel_index}`,
      promptDefault: panel.video_prompt?.trim() || buildDraftPrompt(panel.description?.trim() || `Panel #${panel.panel_index}`),
      originPrompt: panel.video_prompt?.trim() || '',
      imageMediaId: panel.image_media_id ?? null,
      videoMediaId: panel.video_media_id ?? null,
    }))
}

function pickEpisodeTasks(tasks: TaskItem[] | undefined, episodeId: string) {
  const safeTasks = tasks ?? []
  const scoped = safeTasks.filter((task) => task.episode_id === episodeId || task.target_id === episodeId)
  return scoped.slice(0, 10)
}

function defaultShotConfig(order: number): ShotConfigDraft {
  if (order % 3 === 0) {
    return {
      mode: 'first-last-frame',
      preset: 'action',
      motion: 'dynamic movement with directional momentum',
      camera: 'tracking shot, medium framing',
      durationHint: 'medium',
      enableLipSync: false,
    }
  }

  return {
    mode: 'single-panel',
    preset: order % 2 === 0 ? 'dialogue' : 'cinematic',
    motion: 'smooth cinematic motion and stable continuity',
    camera: 'gentle push-in, eye-level',
    durationHint: 'auto',
    enableLipSync: order % 2 === 0,
  }
}

function modeLabel(mode: RenderMode) {
  return mode === 'first-last-frame' ? 'First/Last Frame' : 'Single Panel'
}

function presetLabel(preset: ShotPreset) {
  if (preset === 'action') return 'Action'
  if (preset === 'dialogue') return 'Dialogue'
  return 'Cinematic'
}

export function VideoStage({ projectId, episodeId, episode }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({})
  const [lineConfigs, setLineConfigs] = useState<Record<string, ShotConfigDraft>>({})
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [isVoicePanelExpanded, setIsVoicePanelExpanded] = useState(false)
  const [showReadyOnly, setShowReadyOnly] = useState(false)
  const [showFirstLastOnly, setShowFirstLastOnly] = useState(false)
  const [shotSearch, setShotSearch] = useState('')
  const [isShotConfigOpen, setIsShotConfigOpen] = useState(false)
  const [renderFeedback, setRenderFeedback] = useState<string | null>(null)
  const [renderActionBusyKey, setRenderActionBusyKey] = useState<string | null>(null)
  const [batchPreset, setBatchPreset] = useState<ShotPreset>('cinematic')
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true)
  const [firstLastPromptDrafts, setFirstLastPromptDrafts] = useState<Record<string, string>>({})
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [promptModalShotId, setPromptModalShotId] = useState<string | null>(null)
  const [promptModalDraft, setPromptModalDraft] = useState('')
  const [isLipSyncModalOpen, setIsLipSyncModalOpen] = useState(false)
  const [pendingLipSyncLineId, setPendingLipSyncLineId] = useState<string | null>(null)
  const [selectedLipSyncVoiceId, setSelectedLipSyncVoiceId] = useState('')

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
    queryKey: [...queryKeys.tasks.byProject(projectId), 'video-stage', episodeId],
    queryFn: () => listTasks({ projectId, limit: 30 }),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const tasks = query.state.data as TaskItem[] | undefined
      const current = pickEpisodeTasks(tasks, episodeId)
      return current.some((task) => runningStatuses.has(task.status)) ? 2000 : false
    },
  })

  const currentEpisode = useMemo(() => episodeQuery.data ?? episode, [episodeQuery.data, episode])
  const storyboardPanels = useMemo(
    () => (storyboardsQuery.data ?? []).flatMap((storyboard) => storyboard.panels),
    [storyboardsQuery.data],
  )
  const stageLines = useMemo(() => toVideoShots(storyboardPanels), [storyboardPanels])

  useEffect(() => {
    setPromptDrafts((previous) => {
      const next: Record<string, string> = {}
      stageLines.forEach((line) => {
        next[line.id] = previous[line.id] ?? line.promptDefault
      })
      return next
    })
  }, [stageLines])

  useEffect(() => {
    setLineConfigs((previous) => {
      const next: Record<string, ShotConfigDraft> = {}
      stageLines.forEach((line) => {
        next[line.id] = previous[line.id] ?? defaultShotConfig(line.order)
      })
      return next
    })
  }, [stageLines])

  useEffect(() => {
    setFirstLastPromptDrafts((previous) => {
      const next: Record<string, string> = {}
      stageLines.forEach((line) => {
        if (previous[line.id]?.trim()) {
          next[line.id] = previous[line.id]
        }
      })
      return next
    })
  }, [stageLines])

  useEffect(() => {
    if (stageLines.length === 0) {
      setSelectedLineId(null)
      return
    }
    if (!selectedLineId || !stageLines.some((line) => line.id === selectedLineId)) {
      setSelectedLineId(stageLines[0].id)
    }
  }, [selectedLineId, stageLines])

  const selectedLine = useMemo(() => stageLines.find((line) => line.id === selectedLineId) ?? null, [selectedLineId, stageLines])

  useEffect(() => {
    if (selectedLine) return
    setIsShotConfigOpen(false)
    setIsPromptModalOpen(false)
  }, [selectedLine])

  const resolveConfig = (lineId: string, order: number) => lineConfigs[lineId] ?? defaultShotConfig(order)
  const getPrompt = (line: VideoShot) => promptDrafts[line.id] ?? line.promptDefault
  const getDefaultFirstLastPrompt = (line: VideoShot) => {
    const nextLine = stageLines.find((candidate) => candidate.order === line.order + 1) ?? null
    const firstPrompt = getPrompt(line).trim()
    const lastPrompt = nextLine ? getPrompt(nextLine).trim() : ''
    if (firstPrompt && lastPrompt) {
      return `First frame: ${firstPrompt}\nLast frame: ${lastPrompt}\nKeep visual continuity and smooth transition between these frames.`
    }
    if (firstPrompt) {
      return `${firstPrompt}\nPreserve continuity from first frame to final frame with coherent movement.`
    }
    return buildDraftPrompt(line.text)
  }
  const getFirstLastPrompt = (line: VideoShot) => firstLastPromptDrafts[line.id] ?? getDefaultFirstLastPrompt(line)
  const getRenderPrompt = (line: VideoShot) => {
    const config = resolveConfig(line.id, line.order)
    if (config.mode === 'first-last-frame') {
      return getFirstLastPrompt(line)
    }
    return getPrompt(line)
  }
  const isPromptReady = (line: VideoShot) => Boolean(getRenderPrompt(line).trim())
  const isDirty = (line: VideoShot) => getPrompt(line).trim() !== line.originPrompt.trim()
  const hasFirstLastPromptOverride = (line: VideoShot) => Boolean(firstLastPromptDrafts[line.id]?.trim())
  const getVideoUrl = (line: VideoShot) => (line.videoMediaId ? buildMediaUrl(line.videoMediaId) : null)

  const promptReadyCount = useMemo(
    () => stageLines.filter((line) => isPromptReady(line)).length,
    [firstLastPromptDrafts, lineConfigs, promptDrafts, stageLines],
  )

  const episodeTasks = useMemo(() => pickEpisodeTasks(tasksQuery.data, episodeId), [episodeId, tasksQuery.data])

  const renderTasks = useMemo(() => {
    const filtered = episodeTasks.filter((task) => /(video|storyboard|script)/i.test(task.task_type))
    return filtered.length > 0 ? filtered : episodeTasks
  }, [episodeTasks])

  const hasRunningRenderTasks = useMemo(
    () => renderTasks.some((task) => runningStatuses.has(task.status)),
    [renderTasks],
  )

  useEffect(() => {
    if (!hasRunningRenderTasks) return
    const timer = window.setInterval(() => {
      void storyboardsQuery.refetch()
    }, 2000)
    return () => window.clearInterval(timer)
  }, [hasRunningRenderTasks, storyboardsQuery])

  const runningRenderCount = useMemo(
    () => renderTasks.filter((task) => runningStatuses.has(task.status)).length,
    [renderTasks],
  )
  const failedCount = useMemo(
    () => renderTasks.filter((task) => task.status === 'failed' || task.status === 'canceled').length,
    [renderTasks],
  )
  const videosWithUrl = useMemo(
    () => stageLines.filter((line) => Boolean(line.videoMediaId)).length,
    [stageLines],
  )
  const isAnyTaskRunning = runningRenderCount > 0 || Boolean(renderActionBusyKey)
  const firstLastModeCount = useMemo(
    () => stageLines.filter((line) => (lineConfigs[line.id] ?? defaultShotConfig(line.order)).mode === 'first-last-frame').length,
    [lineConfigs, stageLines],
  )
  const singlePanelModeCount = Math.max(0, stageLines.length - firstLastModeCount)

  const selectedPrompt = selectedLine ? getPrompt(selectedLine) : ''
  const queueLines = useMemo(() => {
    const normalizedSearch = shotSearch.toLowerCase().trim()
    return stageLines.filter((line) => {
      const prompt = getRenderPrompt(line)
      const config = lineConfigs[line.id] ?? defaultShotConfig(line.order)
      if (showReadyOnly && !prompt.trim()) return false
      if (showFirstLastOnly && config.mode !== 'first-last-frame') return false
      if (!normalizedSearch) return true
      return [line.text, prompt, modeLabel(config.mode), presetLabel(config.preset), `${line.order}`]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [firstLastPromptDrafts, lineConfigs, promptDrafts, shotSearch, showFirstLastOnly, showReadyOnly, stageLines])

  const selectedConfig = selectedLine ? resolveConfig(selectedLine.id, selectedLine.order) : null
  const selectedNextLine = useMemo(
    () => (selectedLine ? stageLines.find((line) => line.order === selectedLine.order + 1) ?? null : null),
    [selectedLine, stageLines],
  )
  const selectedFirstLastPrompt = selectedLine ? getFirstLastPrompt(selectedLine) : ''
  const selectedFirstFrameUrl = selectedLine?.imageMediaId ? buildMediaUrl(selectedLine.imageMediaId) : null
  const selectedLastFrameUrl = selectedNextLine?.imageMediaId ? buildMediaUrl(selectedNextLine.imageMediaId) : null

  const promptModalShot = useMemo(
    () => (promptModalShotId ? stageLines.find((line) => line.id === promptModalShotId) ?? null : null),
    [promptModalShotId, stageLines],
  )
  const promptModalConfig = promptModalShot ? resolveConfig(promptModalShot.id, promptModalShot.order) : null
  const pendingLipSyncLine = useMemo(
    () => (pendingLipSyncLineId ? stageLines.find((line) => line.id === pendingLipSyncLineId) ?? null : null),
    [pendingLipSyncLineId, stageLines],
  )

  const lipSyncVoiceOptions = useMemo<LipSyncVoiceOption[]>(() => {
    const parsedLines = buildEpisodeStageLines({ novel_text: null, srt_content: currentEpisode.srt_content })
    return parsedLines.slice(0, 24).map((line, index) => {
      const trimmedText = line.text.trim()
      const match = trimmedText.match(/^([^:\uFF1A]{1,24})[:\uFF1A]\s*(.+)$/u)
      return {
        id: line.id || `voice-line-${index + 1}`,
        speaker: match ? match[1].trim() : 'Narrator',
        text: match ? match[2].trim() : trimmedText,
        timing: lineTimeLabel({ startTime: line.startTime ?? null, endTime: line.endTime ?? null }),
      }
    })
  }, [currentEpisode.srt_content])

  useEffect(() => {
    if (!promptModalShotId) return
    if (!stageLines.some((line) => line.id === promptModalShotId)) {
      setPromptModalShotId(null)
      setIsPromptModalOpen(false)
    }
  }, [promptModalShotId, stageLines])

  useEffect(() => {
    if (!pendingLipSyncLineId) return
    if (!stageLines.some((line) => line.id === pendingLipSyncLineId)) {
      setPendingLipSyncLineId(null)
      setIsLipSyncModalOpen(false)
    }
  }, [pendingLipSyncLineId, stageLines])

  const saveSelectedPromptMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLine) {
        throw new Error('Please select a shot first.')
      }
      const prompt = getPrompt(selectedLine).trim()
      await updatePanel(selectedLine.panelId, { video_prompt: prompt || null })
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      await storyboardsQuery.refetch()
      setRenderFeedback('Selected video prompt saved.')
    },
    onError: (error) => {
      setRenderFeedback(error instanceof Error ? error.message : 'Failed to save selected prompt.')
    },
  })

  const saveAllPromptsMutation = useMutation({
    mutationFn: async () => {
      const changed = stageLines.filter((line) => isDirty(line))
      for (const line of changed) {
        const prompt = getPrompt(line).trim()
        await updatePanel(line.panelId, { video_prompt: prompt || null })
      }
      return changed.length
    },
    onSuccess: async (count) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      await storyboardsQuery.refetch()
      setRenderFeedback(count > 0 ? `Saved ${count} video prompt(s).` : 'No video prompt changes to save.')
    },
    onError: (error) => {
      setRenderFeedback(error instanceof Error ? error.message : 'Failed to save video prompts.')
    },
  })

  const generateMutation = useMutation({
    mutationFn: async ({ line, config, action }: { line: VideoShot; config: ShotConfigDraft; action: RenderAction }) => {
      const basePrompt = getPrompt(line).trim()
      const prompt = getRenderPrompt(line).trim()
      await updatePanel(line.panelId, { video_prompt: basePrompt || null })
      const payload = {
        prompt,
        render_mode: config.mode,
        preset: config.preset,
        motion: config.motion,
        camera: config.camera,
        duration_hint: config.durationHint,
        enable_lip_sync: config.enableLipSync,
        audio_media_id: currentEpisode.audio_media_id,
      }
      if (action === 'lip-sync') {
        return lipSyncPanelVideo(line.panelId, payload)
      }
      return generatePanelVideo(line.panelId, payload)
    },
    onSuccess: async (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      await Promise.all([tasksQuery.refetch(), storyboardsQuery.refetch()])
      setRenderFeedback(
        variables.action === 'lip-sync'
          ? `Lip sync queued for shot #${variables.line.order}.`
          : `Render queued for shot #${variables.line.order}.`,
      )
    },
    onError: (error) => {
      setRenderFeedback(error instanceof Error ? error.message : 'Failed to start video render.')
    },
  })

  const updatePrompt = (lineId: string, value: string) => {
    setPromptDrafts((previous) => ({ ...previous, [lineId]: value }))
  }

  const updateFirstLastPrompt = (lineId: string, value: string) => {
    setFirstLastPromptDrafts((previous) => ({ ...previous, [lineId]: value }))
  }

  const resetFirstLastPrompt = (lineId: string) => {
    setFirstLastPromptDrafts((previous) => {
      const next = { ...previous }
      delete next[lineId]
      return next
    })
  }

  const openPromptModal = (line: VideoShot) => {
    setPromptModalShotId(line.id)
    setPromptModalDraft(getPrompt(line))
    setIsPromptModalOpen(true)
  }

  const savePromptModal = () => {
    if (!promptModalShotId) return
    updatePrompt(promptModalShotId, promptModalDraft)
    setIsPromptModalOpen(false)
    setRenderFeedback('Updated prompt draft in prompt modal (UI shell).')
  }

  const openLipSyncPicker = (line: VideoShot) => {
    if (!currentEpisode.audio_media_id) {
      setRenderFeedback('Episode audio is not ready. Generate audio in Voice stage before lip sync.')
      return
    }
    setPendingLipSyncLineId(line.id)
    setSelectedLipSyncVoiceId(lipSyncVoiceOptions[0]?.id ?? '')
    setIsLipSyncModalOpen(true)
  }

  const confirmLipSyncSelection = async () => {
    if (!pendingLipSyncLine) return
    const busyKey = `lip-sync-${pendingLipSyncLine.id}`
    setIsLipSyncModalOpen(false)
    setRenderActionBusyKey(busyKey)
    try {
      await generateMutation.mutateAsync({
        line: pendingLipSyncLine,
        config: resolveConfig(pendingLipSyncLine.id, pendingLipSyncLine.order),
        action: 'lip-sync',
      })
    } finally {
      setRenderActionBusyKey(null)
      setPendingLipSyncLineId(null)
    }
  }

  const fillAllPrompts = () => {
    setPromptDrafts((previous) => {
      const next = { ...previous }
      stageLines.forEach((line) => {
        if (!next[line.id] || !next[line.id].trim()) {
          next[line.id] = buildDraftPrompt(line.text)
        }
      })
      return next
    })
  }

  const copySelectedPrompt = async () => {
    if (!selectedLine) return
    try {
      await navigator.clipboard.writeText(selectedPrompt)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1200)
    } catch {
      setCopyState('failed')
      setTimeout(() => setCopyState('idle'), 1200)
    }
  }

  const patchConfig = (lineId: string, order: number, patch: Partial<ShotConfigDraft>) => {
    setLineConfigs((previous) => ({
      ...previous,
      [lineId]: {
        ...resolveConfig(lineId, order),
        ...patch,
      },
    }))
  }

  const applyBatchPreset = () => {
    setLineConfigs((previous) => {
      const next = { ...previous }
      stageLines.forEach((line) => {
        next[line.id] = { ...resolveConfig(line.id, line.order), preset: batchPreset }
      })
      return next
    })
    setRenderFeedback(`Applied ${presetLabel(batchPreset)} preset to ${stageLines.length} shot(s).`)
  }

  const runBatchRender = async () => {
    if (queueLines.length === 0) {
      setRenderFeedback('No shots in queue to render.')
      return
    }
    setRenderActionBusyKey('batch-render')
    try {
      for (const line of queueLines) {
        await generateMutation.mutateAsync({
          line,
          config: resolveConfig(line.id, line.order),
          action: 'generate',
        })
      }
      setRenderFeedback(`Batch render queued for ${queueLines.length} shot(s).`)
    } finally {
      setRenderActionBusyKey(null)
    }
  }

  const runRenderAction = async (action: RenderAction, lineId: string, order: number) => {
    if (action === 'model') {
      setSelectedLineId(lineId)
      setIsShotConfigOpen(true)
      return
    }
    const line = stageLines.find((item) => item.id === lineId)
    if (!line) return
    if (action === 'lip-sync') {
      openLipSyncPicker(line)
      return
    }
    const busyKey = `${action}-${lineId}`
    setRenderActionBusyKey(busyKey)
    try {
      await generateMutation.mutateAsync({
        line,
        config: resolveConfig(lineId, order),
        action,
      })
    } finally {
      setRenderActionBusyKey(null)
    }
  }

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Video Stage</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">Storyboard panel render queue with persisted prompts and media-backed outputs.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="glass-chip">Total {stageLines.length}</span>
              <span className={['rounded-full px-2 py-0.5', runningRenderCount > 0 || renderActionBusyKey ? 'glass-warning' : 'glass-success'].join(' ')}>
                Running {runningRenderCount + (renderActionBusyKey ? 1 : 0)}
              </span>
              <span className="glass-success rounded-full px-2 py-0.5">Completed {videosWithUrl}</span>
              <span className={['rounded-full px-2 py-0.5', failedCount > 0 ? 'glass-danger' : 'glass-chip'].join(' ')}>Failed {failedCount}</span>
              <span className="glass-chip">Single {singlePanelModeCount}</span>
              <span className="glass-chip">F/L {firstLastModeCount}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'voice')}>
              <Button variant="secondary">Back Voice</Button>
            </Link>
            <Button type="button" variant="secondary" onClick={fillAllPrompts}>Fill Empty Prompts</Button>
            <Button type="button" variant="secondary" onClick={() => saveSelectedPromptMutation.mutate()} disabled={!selectedLine || saveSelectedPromptMutation.isPending || saveAllPromptsMutation.isPending}>{saveSelectedPromptMutation.isPending ? 'Saving...' : 'Save Selected'}</Button>
            <Button type="button" variant="secondary" onClick={() => saveAllPromptsMutation.mutate()} disabled={saveSelectedPromptMutation.isPending || saveAllPromptsMutation.isPending}>{saveAllPromptsMutation.isPending ? 'Saving All...' : 'Save All'}</Button>
            <Button type="button" variant="secondary" onClick={() => tasksQuery.refetch()} disabled={tasksQuery.isFetching}>{tasksQuery.isFetching ? 'Refreshing...' : 'Refresh Tasks'}</Button>
            <Button type="button" onClick={() => void runBatchRender()} disabled={isAnyTaskRunning || queueLines.length === 0}>{renderActionBusyKey === 'batch-render' ? 'Queueing...' : 'Batch Render'}</Button>
            <Link to={`/editor/${episodeId}`}>
              <Button variant="secondary">Open Editor</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Shots</p>
            <p className="mt-1 text-2xl font-semibold">{stageLines.length}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Prompts Ready</p>
            <p className="mt-1 text-2xl font-semibold">{promptReadyCount}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Rendered Videos</p>
            <p className="mt-1 text-2xl font-semibold">{videosWithUrl}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Runtime Tasks</p>
            <p className="mt-1 text-2xl font-semibold">{runningRenderCount}</p>
          </article>
        </div>
      </SectionCard>

      {renderFeedback ? <SectionCard className="glass-success rounded-2xl p-4 text-sm">{renderFeedback}</SectionCard> : null}
      {episodeQuery.isLoading || storyboardsQuery.isLoading ? <LoadingState message="Loading storyboard source..." /> : null}
      {episodeQuery.isError || storyboardsQuery.isError ? <ErrorState message="Failed to load storyboard source." /> : null}

      {stageLines.length === 0 ? (
        <EmptyState title="No storyboard panels available" description="Generate storyboard content first, then continue to video queue." />
      ) : (
        <>
          <SectionCard className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">Video Timeline</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Quick navigation shell across all shots and render states.</p>
              </div>
              <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-3 py-1.5 text-xs" onClick={() => setIsTimelineExpanded((value) => !value)}>
                {isTimelineExpanded ? 'Collapse Timeline' : 'Expand Timeline'}
              </button>
            </div>

            {isTimelineExpanded ? (
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-center gap-2 pb-1">
                  {stageLines.map((line, index) => {
                    const config = resolveConfig(line.id, line.order)
                    const active = selectedLineId === line.id
                    const ready = isPromptReady(line)
                    const videoReady = Boolean(getVideoUrl(line))
                    const running = renderActionBusyKey === `generate-${line.id}` || renderActionBusyKey === `lip-sync-${line.id}`
                    return (
                      <div key={`timeline-${line.id}`} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedLineId(line.id)}
                          className={[
                            'rounded-xl border px-3 py-2 text-left text-xs transition-colors',
                            active
                              ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]'
                              : 'border-[var(--glass-stroke-base)] bg-white/80 text-[var(--glass-text-secondary)] hover:bg-white',
                          ].join(' ')}
                        >
                          <p className="font-semibold">Shot {line.order}</p>
                          <p className="mt-1">{modeLabel(config.mode)}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className={['rounded-full px-2 py-0.5', ready ? 'glass-success' : 'glass-warning'].join(' ')}>
                              {ready ? 'Prompt' : 'Missing'}
                            </span>
                            {videoReady ? <span className="glass-success rounded-full px-2 py-0.5">Video</span> : null}
                            {running ? <span className="glass-chip px-2 py-0.5">Running</span> : null}
                          </div>
                        </button>
                        {index < stageLines.length - 1 ? <span className="h-px w-8 bg-[var(--glass-stroke-base)]" /> : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">Render Queue Snapshot</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">
                  Visible {queueLines.length} / {stageLines.length} · First/Last {firstLastModeCount} · Single {singlePanelModeCount}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  className="glass-input w-64"
                  value={shotSearch}
                  onChange={(event) => setShotSearch(event.target.value)}
                  placeholder="Search shot text / prompt / mode"
                />
                <button type="button" onClick={() => setShowReadyOnly((current) => !current)} className={['glass-btn-base rounded-xl px-3 py-2 text-xs', showReadyOnly ? 'glass-btn-tone-info text-white' : 'glass-btn-ghost'].join(' ')}>
                  {showReadyOnly ? 'Prompt Ready Only' : 'Show Prompt Ready'}
                </button>
                <button type="button" onClick={() => setShowFirstLastOnly((current) => !current)} className={['glass-btn-base rounded-xl px-3 py-2 text-xs', showFirstLastOnly ? 'glass-btn-tone-info text-white' : 'glass-btn-ghost'].join(' ')}>
                  {showFirstLastOnly ? 'First/Last Only' : 'Show First/Last'}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {queueLines.map((line) => {
                const prompt = getRenderPrompt(line)
                const ready = Boolean(prompt.trim())
                const config = resolveConfig(line.id, line.order)
                const active = selectedLineId === line.id
                const isGenerating = renderActionBusyKey === `generate-${line.id}`
                const isLipSyncing = renderActionBusyKey === `lip-sync-${line.id}`
                const firstLastMode = config.mode === 'first-last-frame'
                const hasCustomFirstLastPrompt = firstLastMode && hasFirstLastPromptOverride(line)
                const prevLine = line.order > 1 ? stageLines[line.order - 2] : null
                const nextLine = line.order < stageLines.length ? stageLines[line.order] : null
                const videoUrl = getVideoUrl(line)
                return (
                  <article
                    key={line.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedLineId(line.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedLineId(line.id)
                      }
                    }}
                    className={[
                      'card-base rounded-xl p-0 text-sm cursor-pointer transition-colors overflow-hidden',
                      active ? 'border-[var(--glass-accent-from)] bg-[var(--glass-bg-muted)]' : '',
                    ].join(' ')}
                  >
                    <div className={['px-3 py-2 flex items-center justify-between gap-2', ready ? 'bg-[var(--glass-tone-success-bg)]/60' : 'bg-[var(--glass-tone-warning-bg)]/60'].join(' ')}>
                      <p className="font-medium text-[var(--glass-text-secondary)]">Shot {line.order}</p>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className={['rounded-full px-2 py-0.5', ready ? 'glass-success' : 'glass-warning'].join(' ')}>{ready ? 'Prompt Ready' : 'Prompt Missing'}</span>
                        {firstLastMode ? <span className="glass-chip px-2 py-0.5">First/Last</span> : <span className="glass-chip px-2 py-0.5">Single</span>}
                        {videoUrl ? <span className="glass-success rounded-full px-2 py-0.5">Video Ready</span> : null}
                        {isGenerating || isLipSyncing ? <span className="glass-chip px-2 py-0.5">Running</span> : null}
                      </div>
                    </div>
                    <div className="px-3 py-3">
                      {videoUrl ? (
                        <video src={videoUrl} className="aspect-video w-full rounded-lg border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)]" controls preload="metadata" />
                      ) : (
                        <div className="aspect-video rounded-lg border border-dashed border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)]" />
                      )}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--glass-text-tertiary)]">
                        <span>{modeLabel(config.mode)} · {presetLabel(config.preset)}</span>
                        <span>{lineTimeLabel({ startTime: null, endTime: null }) || 'Storyboard Panel'}</span>
                      </div>
                      {firstLastMode ? (
                        <p className="mt-1 text-[11px] text-[var(--glass-text-tertiary)]">
                          Flow: {prevLine ? `#${prevLine.order}` : 'Start'} {' -> '}#{line.order} {' -> '} {nextLine ? `#${nextLine.order}` : 'End'}
                        </p>
                      ) : null}
                      {hasCustomFirstLastPrompt ? <p className="mt-1 text-[11px] text-[var(--glass-tone-info-fg)]">Custom first/last prompt configured.</p> : null}
                      <p className="mt-1 line-clamp-2 text-[var(--glass-text-tertiary)]">{line.text}</p>

                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void runRenderAction('generate', line.id, line.order)
                          }}
                          disabled={isGenerating || generateMutation.isPending}
                          className="glass-btn-base rounded-lg border border-[var(--glass-stroke-base)] bg-white px-2 py-1 text-[11px] text-[var(--glass-text-secondary)] disabled:opacity-60"
                        >
                          {isGenerating ? '...' : 'Generate'}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void runRenderAction('model', line.id, line.order)
                          }}
                          className="glass-btn-base rounded-lg border border-[var(--glass-stroke-base)] bg-white px-2 py-1 text-[11px] text-[var(--glass-text-secondary)]"
                        >
                          Config
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openPromptModal(line)
                          }}
                          className="glass-btn-base rounded-lg border border-[var(--glass-stroke-base)] bg-white px-2 py-1 text-[11px] text-[var(--glass-text-secondary)]"
                        >
                          Prompt Modal
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void runRenderAction('lip-sync', line.id, line.order)
                          }}
                          disabled={isLipSyncing || generateMutation.isPending || !currentEpisode.audio_media_id}
                          className="glass-btn-base rounded-lg border border-[var(--glass-stroke-base)] bg-white px-2 py-1 text-[11px] text-[var(--glass-text-secondary)] disabled:opacity-60"
                        >
                          {isLipSyncing ? '...' : 'Lip Sync'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
              {queueLines.length === 0 ? <p className="text-sm text-[var(--glass-text-tertiary)]">No shots in current queue filter.</p> : null}
            </div>
          </SectionCard>

          {selectedLine ? (
            <SectionCard className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">Selected Shot</h3>
                  <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Shot {selectedLine.order} | Panel target</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => saveSelectedPromptMutation.mutate()} disabled={saveSelectedPromptMutation.isPending}>
                    {saveSelectedPromptMutation.isPending ? 'Saving...' : 'Save Prompt'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void runRenderAction('generate', selectedLine.id, selectedLine.order)}>
                    {renderActionBusyKey === `generate-${selectedLine.id}` ? 'Generating...' : 'Generate Shot'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void runRenderAction('lip-sync', selectedLine.id, selectedLine.order)} disabled={!currentEpisode.audio_media_id}>
                    {renderActionBusyKey === `lip-sync-${selectedLine.id}` ? 'Lip Sync...' : 'Lip Sync'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={copySelectedPrompt}>Copy Prompt</Button>
                  <Button type="button" variant="secondary" onClick={() => openPromptModal(selectedLine)}>Prompt Modal</Button>
                  <Button type="button" variant="secondary" onClick={() => setIsShotConfigOpen(true)}>Shot Config</Button>
                  <Button type="button" variant="secondary" onClick={() => updatePrompt(selectedLine.id, '')}>Clear</Button>
                </div>
              </div>

              <p className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-sm text-[var(--glass-text-tertiary)]">{selectedLine.text}</p>
              {selectedConfig?.mode === 'first-last-frame' ? (
                <div className="grid gap-3 rounded-xl border border-[var(--glass-stroke-focus)]/50 bg-[var(--glass-tone-info-bg)]/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--glass-tone-info-fg)]">First/Last Frame Panel</p>
                    <span className="text-xs text-[var(--glass-tone-info-fg)]">
                      Shot #{selectedLine.order} {' -> '} {selectedNextLine ? `#${selectedNextLine.order}` : 'No next shot'}
                    </span>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--glass-text-tertiary)]">First Frame</p>
                      {selectedFirstFrameUrl ? (
                        <img src={selectedFirstFrameUrl} alt={`Shot ${selectedLine.order} first frame`} className="aspect-video w-full rounded-lg border border-[var(--glass-stroke-base)] object-cover" />
                      ) : (
                        <div className="aspect-video rounded-lg border border-dashed border-[var(--glass-stroke-base)] bg-white/70" />
                      )}
                    </div>
                    <span className="text-center text-xs text-[var(--glass-text-tertiary)]">{'->'}</span>
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--glass-text-tertiary)]">Last Frame</p>
                      {selectedLastFrameUrl ? (
                        <img src={selectedLastFrameUrl} alt={`Shot ${selectedNextLine?.order ?? selectedLine.order} last frame`} className="aspect-video w-full rounded-lg border border-[var(--glass-stroke-base)] object-cover" />
                      ) : (
                        <div className="aspect-video rounded-lg border border-dashed border-[var(--glass-stroke-base)] bg-white/70" />
                      )}
                    </div>
                  </div>

                  <label className="grid gap-1">
                    <span className="text-xs text-[var(--glass-tone-info-fg)]">Custom first/last prompt</span>
                    <textarea
                      className="glass-input min-h-24 text-sm"
                      value={selectedFirstLastPrompt}
                      onChange={(event) => updateFirstLastPrompt(selectedLine.id, event.target.value)}
                      placeholder="Describe continuity constraints and transition behavior between first and last frame."
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      className="glass-btn-base glass-btn-ghost rounded-lg px-3 py-1.5 text-xs"
                      onClick={() => resetFirstLastPrompt(selectedLine.id)}
                      disabled={!hasFirstLastPromptOverride(selectedLine)}
                    >
                      Use Default Prompt
                    </button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void runRenderAction('generate', selectedLine.id, selectedLine.order)}
                      disabled={renderActionBusyKey === `generate-${selectedLine.id}` || !selectedNextLine}
                    >
                      {renderActionBusyKey === `generate-${selectedLine.id}` ? 'Generating...' : 'Generate First/Last'}
                    </Button>
                  </div>
                </div>
              ) : null}
              <textarea className="glass-input min-h-44" value={selectedPrompt} onChange={(event) => updatePrompt(selectedLine.id, event.target.value)} placeholder="Describe visual composition, motion style, and camera language." />

              {getVideoUrl(selectedLine) ? (
                <div className="space-y-2">
                  <video src={getVideoUrl(selectedLine) ?? undefined} className="aspect-video w-full rounded-lg border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)]" controls preload="metadata" />
                  <div className="text-xs text-[var(--glass-text-tertiary)]">
                    <a className="underline" href={getVideoUrl(selectedLine) ?? '#'} target="_blank" rel="noreferrer">Open latest rendered video</a>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--glass-text-tertiary)]">
                <span>{isDirty(selectedLine) ? 'Unsaved prompt changes' : 'Prompt synced with server'}</span>
                <span>{copyState === 'copied' ? 'Prompt copied.' : copyState === 'failed' ? 'Copy failed.' : ''}</span>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">Runtime Tasks</h3>
                <p className="text-xs text-[var(--glass-text-tertiary)]">
                  Running {runningRenderCount} · Ready {videosWithUrl} · Failed {failedCount}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select className="glass-input w-44" value={batchPreset} onChange={(event) => setBatchPreset(event.target.value as ShotPreset)}>
                  <option value="cinematic">Cinematic</option>
                  <option value="action">Action</option>
                  <option value="dialogue">Dialogue</option>
                </select>
                <Button type="button" variant="secondary" onClick={applyBatchPreset}>Apply Batch Preset</Button>
              </div>
            </div>

            <button type="button" onClick={() => setIsVoicePanelExpanded((value) => !value)} className="glass-btn-base glass-btn-ghost rounded-lg px-3 py-1.5 text-xs w-fit">
              {isVoicePanelExpanded ? 'Hide Voice Context' : 'Show Voice Context'}
            </button>
            {isVoicePanelExpanded ? (
              <p className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-xs text-[var(--glass-text-tertiary)]">{currentEpisode.srt_content?.trim() || 'No voice transcript bound to this episode yet.'}</p>
            ) : null}

            {currentEpisode.audio_media_id ? (
              <p className="text-xs text-[var(--glass-text-tertiary)]">Episode audio available for lip sync.</p>
            ) : (
              <p className="text-xs text-[var(--glass-text-tertiary)]">Generate episode audio in Voice stage to enable lip sync.</p>
            )}

            {tasksQuery.isLoading ? <LoadingState message="Loading runtime tasks..." /> : null}
            {tasksQuery.isError ? <ErrorState message="Failed to load runtime tasks." /> : null}
            {!tasksQuery.isLoading && !tasksQuery.isError && renderTasks.length === 0 ? <p className="text-sm text-[var(--glass-text-tertiary)]">No runtime tasks for this episode yet.</p> : null}
            {renderTasks.map((task) => (
              <article key={task.id} className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--glass-text-secondary)]">{task.task_type}</p>
                  <span className={['rounded-full px-2 py-0.5 text-xs', statusClass(task.status)].join(' ')}>{task.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Progress: {task.progress}% | Updated: {new Date(task.updated_at).toLocaleString()}</p>
              </article>
            ))}
          </SectionCard>
        </>
      )}

      <Link
        to={`/editor/${episodeId}`}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        Enter Editor
      </Link>

      {isShotConfigOpen && selectedLine && selectedConfig ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button type="button" className="glass-overlay absolute inset-0" onClick={() => setIsShotConfigOpen(false)} />
          <section className="glass-modal-shell relative z-10 grid w-full max-w-2xl gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Shot Model Config</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Shot {selectedLine.order}</p>
              </div>
              <button type="button" className="glass-btn-base glass-btn-ghost rounded-xl px-2 py-1.5 text-xs" onClick={() => setIsShotConfigOpen(false)}>Close</button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs text-[var(--glass-text-tertiary)]">Render Mode</span>
                <select className="glass-input" value={selectedConfig.mode} onChange={(event) => patchConfig(selectedLine.id, selectedLine.order, { mode: event.target.value as RenderMode })}>
                  <option value="single-panel">Single Panel</option>
                  <option value="first-last-frame">First/Last Frame</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--glass-text-tertiary)]">Shot Preset</span>
                <select className="glass-input" value={selectedConfig.preset} onChange={(event) => patchConfig(selectedLine.id, selectedLine.order, { preset: event.target.value as ShotPreset })}>
                  <option value="cinematic">Cinematic</option>
                  <option value="action">Action</option>
                  <option value="dialogue">Dialogue</option>
                </select>
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs text-[var(--glass-text-tertiary)]">Camera Direction</span>
                <input type="text" className="glass-input" value={selectedConfig.camera} onChange={(event) => patchConfig(selectedLine.id, selectedLine.order, { camera: event.target.value })} placeholder="e.g. slow push-in, eye-level" />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs text-[var(--glass-text-tertiary)]">Motion Direction</span>
                <input type="text" className="glass-input" value={selectedConfig.motion} onChange={(event) => patchConfig(selectedLine.id, selectedLine.order, { motion: event.target.value })} placeholder="e.g. smooth continuity and camera drift" />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--glass-text-tertiary)]">Duration Hint</span>
                <select className="glass-input" value={selectedConfig.durationHint} onChange={(event) => patchConfig(selectedLine.id, selectedLine.order, { durationHint: event.target.value as DurationHint })}>
                  <option value="auto">Auto</option>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2">
                <input type="checkbox" checked={selectedConfig.enableLipSync} onChange={(event) => patchConfig(selectedLine.id, selectedLine.order, { enableLipSync: event.target.checked })} />
                <span className="text-sm text-[var(--glass-text-secondary)]">Enable Lip Sync</span>
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsShotConfigOpen(false)}>Cancel</Button>
              <Button
                type="button"
                onClick={() => {
                  setIsShotConfigOpen(false)
                  setRenderFeedback(`Shot #${selectedLine.order} config updated: ${modeLabel(selectedConfig.mode)} / ${presetLabel(selectedConfig.preset)}.`)
                }}
              >
                Apply Config
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {isPromptModalOpen && promptModalShot && promptModalConfig ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button type="button" className="glass-overlay absolute inset-0" onClick={() => setIsPromptModalOpen(false)} />
          <section className="glass-modal-shell relative z-10 grid w-full max-w-3xl gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Video Prompt Modal</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Shot {promptModalShot.order} prompt shell editor</p>
              </div>
              <button type="button" className="glass-btn-base glass-btn-ghost rounded-xl px-2 py-1.5 text-xs" onClick={() => setIsPromptModalOpen(false)}>
                Close
              </button>
            </div>

            <div className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-xs text-[var(--glass-text-tertiary)]">
              <p>Mode: {modeLabel(promptModalConfig.mode)} | Preset: {presetLabel(promptModalConfig.preset)}</p>
              <p className="mt-1">Shot text: {promptModalShot.text}</p>
            </div>

            <textarea
              className="glass-input min-h-44"
              value={promptModalDraft}
              onChange={(event) => setPromptModalDraft(event.target.value)}
              placeholder="Describe composition, movement, and cinematic continuity..."
            />

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsPromptModalOpen(false)}>Cancel</Button>
              <Button type="button" onClick={savePromptModal}>Save Prompt Draft</Button>
            </div>
          </section>
        </div>
      ) : null}

      {isLipSyncModalOpen && pendingLipSyncLine ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button type="button" className="glass-overlay absolute inset-0" onClick={() => setIsLipSyncModalOpen(false)} />
          <section className="glass-modal-shell relative z-10 grid w-full max-w-xl gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Lip Sync Voice Picker</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Shot {pendingLipSyncLine.order} · choose a voice line reference before lip sync.</p>
              </div>
              <button type="button" className="glass-btn-base glass-btn-ghost rounded-xl px-2 py-1.5 text-xs" onClick={() => setIsLipSyncModalOpen(false)}>
                Close
              </button>
            </div>

            {lipSyncVoiceOptions.length === 0 ? (
              <p className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-sm text-[var(--glass-text-tertiary)]">
                No transcript voice lines found. This is still a UI shell; lip sync can continue with default episode audio.
              </p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 p-2">
                {lipSyncVoiceOptions.map((voiceLine) => {
                  const selected = selectedLipSyncVoiceId === voiceLine.id
                  return (
                    <button
                      key={voiceLine.id}
                      type="button"
                      onClick={() => setSelectedLipSyncVoiceId(voiceLine.id)}
                      className={[
                        'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                        selected
                          ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]'
                          : 'border-[var(--glass-stroke-base)] bg-white text-[var(--glass-text-secondary)] hover:bg-white/80',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{voiceLine.speaker}</span>
                        <span className="text-[11px] opacity-80">{voiceLine.timing || 'No timing'}</span>
                      </div>
                      <p className="mt-1 text-xs line-clamp-2">{voiceLine.text}</p>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsLipSyncModalOpen(false)}>Cancel</Button>
              <Button
                type="button"
                onClick={() => void confirmLipSyncSelection()}
                disabled={generateMutation.isPending || lipSyncVoiceOptions.length > 0 && !selectedLipSyncVoiceId}
              >
                {generateMutation.isPending ? 'Queueing...' : 'Confirm Lip Sync'}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
