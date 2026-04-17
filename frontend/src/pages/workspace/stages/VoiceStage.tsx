import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { buildWorkspaceStagePath } from '../../../app/router/routes'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import { Button } from '../../../components/ui/Button'
import { buildMediaUrl } from '../../../services/api/client'
import { getEpisode, updateEpisode, voiceGenerate } from '../../../services/api/episodes'
import { storyToScript } from '../../../services/api/storyboards'
import { listTasks, type TaskItem } from '../../../services/api/tasks'
import { queryKeys } from '../../../services/queryKeys'
import { buildEpisodeStageLines, inferSpeaker, lineTimeLabel, type StageLine } from './episode-stage-content'
import type { WorkspaceStagePageProps } from './types'

type VoiceLineDraft = {
  id: string
  order: number
  source: 'srt' | 'novel'
  startTime: string
  endTime: string
  speaker: string
  text: string
}

type VoiceProfile = {
  id: string
  name: string
  style: string
  gender: 'female' | 'male' | 'neutral'
}

type EmotionDraft = {
  prompt: string
  strength: number
}

type LineAction = 'generate' | 'play' | 'download' | 'delete'

const runningStatuses = new Set(['queued', 'processing', 'running'])
const defaultVoiceProfiles: VoiceProfile[] = [
  { id: 'vp-calm-narrator', name: 'Calm Narrator', style: 'warm storytelling', gender: 'neutral' },
  { id: 'vp-young-female', name: 'Bright Lead', style: 'energetic and youthful', gender: 'female' },
  { id: 'vp-deep-male', name: 'Deep Anchor', style: 'steady and confident', gender: 'male' },
  { id: 'vp-soft-female', name: 'Soft Companion', style: 'gentle and intimate', gender: 'female' },
]

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeTimestamp(value: string) {
  return value.trim().replace('.', ',')
}

function statusClass(status: string) {
  if (status === 'succeeded' || status === 'completed') return 'glass-success'
  if (status === 'failed' || status === 'canceled') return 'glass-danger'
  if (runningStatuses.has(status)) return 'glass-warning'
  return ''
}

function splitSpeakerAndText(rawText: string) {
  const match = rawText.match(/^([^:\uFF1A]{1,24})[:\uFF1A]\s*(.+)$/u)
  if (!match) {
    return {
      speaker: inferSpeaker(rawText) ?? '',
      text: rawText.trim(),
    }
  }

  return {
    speaker: normalizeInlineText(match[1]),
    text: match[2].trim(),
  }
}

function toVoiceLineDrafts(lines: StageLine[]): VoiceLineDraft[] {
  return lines.map((line, index) => {
    const parsed = splitSpeakerAndText(line.text)
    return {
      id: line.id,
      order: index + 1,
      source: line.source,
      startTime: line.startTime ?? '',
      endTime: line.endTime ?? '',
      speaker: parsed.speaker,
      text: parsed.text,
    }
  })
}

function reindexVoiceLines(lines: VoiceLineDraft[]) {
  return lines.map((line, index) => ({ ...line, order: index + 1 }))
}

function createVoiceLineId() {
  return `voice-${Math.random().toString(36).slice(2, 10)}`
}

function composeDialogue(line: Pick<VoiceLineDraft, 'speaker' | 'text'>) {
  const speaker = normalizeInlineText(line.speaker)
  const text = line.text.trim()
  if (speaker && text) return `${speaker}: ${text}`
  return text || speaker
}

function serializeVoiceLines(lines: VoiceLineDraft[]) {
  const cleaned = lines
    .map((line) => ({
      ...line,
      text: line.text.trim(),
      speaker: normalizeInlineText(line.speaker),
      startTime: normalizeTimestamp(line.startTime),
      endTime: normalizeTimestamp(line.endTime),
    }))
    .filter((line) => Boolean(line.text || line.speaker))

  if (cleaned.length === 0) return ''

  const allTimed = cleaned.every((line) => line.startTime && line.endTime)
  if (allTimed) {
    return cleaned
      .map((line, index) => `${index + 1}\n${line.startTime} --> ${line.endTime}\n${composeDialogue(line)}`)
      .join('\n\n')
  }

  return cleaned.map((line) => composeDialogue(line)).join('\n')
}

function filterVoiceTasks(tasks: TaskItem[] | undefined, episodeId: string) {
  const scoped = (tasks ?? []).filter((task) => task.episode_id === episodeId || task.target_id === episodeId)
  const focused = scoped.filter((task) => /(voice|audio|script|srt)/i.test(task.task_type))
  return (focused.length > 0 ? focused : scoped).slice(0, 8)
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function VoiceStage({ projectId, episodeId, episode }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [transcriptDraft, setTranscriptDraft] = useState(episode.srt_content ?? '')
  const [voiceLines, setVoiceLines] = useState<VoiceLineDraft[]>([])
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [speakerFilter, setSpeakerFilter] = useState<string>('all')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [lineActionInfo, setLineActionInfo] = useState<string | null>(null)
  const [lineActionBusyKey, setLineActionBusyKey] = useState<string | null>(null)
  const [isLineModalOpen, setIsLineModalOpen] = useState(false)
  const [lineSearch, setLineSearch] = useState('')
  const [showNeedsSpeakerOnly, setShowNeedsSpeakerOnly] = useState(false)
  const [emotionByLine, setEmotionByLine] = useState<Record<string, EmotionDraft>>({})
  const [expandedEmotionLineId, setExpandedEmotionLineId] = useState<string | null>(null)
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>(defaultVoiceProfiles)
  const [speakerVoiceBindings, setSpeakerVoiceBindings] = useState<Record<string, string>>({})
  const [isSpeakerBindingOpen, setIsSpeakerBindingOpen] = useState(false)
  const [bindingSpeaker, setBindingSpeaker] = useState<string>('')
  const [voiceSearch, setVoiceSearch] = useState('')
  const [selectedVoiceProfileId, setSelectedVoiceProfileId] = useState<string>('')
  const [isVoiceDesignOpen, setIsVoiceDesignOpen] = useState(false)
  const [voiceDesignName, setVoiceDesignName] = useState('')
  const [voiceDesignStyle, setVoiceDesignStyle] = useState('')
  const [voiceDesignGender, setVoiceDesignGender] = useState<'female' | 'male' | 'neutral'>('neutral')

  const episodeQuery = useQuery({
    queryKey: queryKeys.episodes.detail(episodeId),
    queryFn: () => getEpisode(episodeId),
    enabled: Boolean(episodeId),
  })

  const tasksQuery = useQuery({
    queryKey: [...queryKeys.tasks.byProject(projectId), 'voice-stage', episodeId],
    queryFn: () => listTasks({ projectId, limit: 30 }),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const tasks = query.state.data as TaskItem[] | undefined
      return filterVoiceTasks(tasks, episodeId).some((task) => runningStatuses.has(task.status)) ? 2000 : false
    },
  })

  const currentEpisode = useMemo(() => episodeQuery.data ?? episode, [episodeQuery.data, episode])

  const stageLines = useMemo(
    () =>
      buildEpisodeStageLines({
        novel_text: currentEpisode.novel_text,
        srt_content: currentEpisode.srt_content,
      }),
    [currentEpisode.novel_text, currentEpisode.srt_content],
  )

  useEffect(() => {
    setTranscriptDraft(currentEpisode.srt_content ?? '')
    setVoiceLines(toVoiceLineDrafts(stageLines))
    setSpeakerFilter('all')
  }, [currentEpisode.srt_content, stageLines])

  useEffect(() => {
    setEmotionByLine((previous) => {
      const next: Record<string, EmotionDraft> = {}
      voiceLines.forEach((line) => {
        next[line.id] = previous[line.id] ?? { prompt: '', strength: 0.4 }
      })
      return next
    })
  }, [voiceLines])

  useEffect(() => {
    if (!expandedEmotionLineId) return
    if (!voiceLines.some((line) => line.id === expandedEmotionLineId)) {
      setExpandedEmotionLineId(null)
    }
  }, [expandedEmotionLineId, voiceLines])

  const speakerOptions = useMemo(() => {
    const set = new Set<string>()
    voiceLines.forEach((line) => {
      const speaker = normalizeInlineText(line.speaker)
      if (speaker) set.add(speaker)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [voiceLines])

  useEffect(() => {
    setSpeakerVoiceBindings((previous) => {
      const next: Record<string, string> = {}
      speakerOptions.forEach((speaker) => {
        if (previous[speaker]) {
          next[speaker] = previous[speaker]
        }
      })
      return next
    })
  }, [speakerOptions])

  const filteredVoiceLines = useMemo(() => {
    if (speakerFilter === 'all') return voiceLines
    return voiceLines.filter((line) => normalizeInlineText(line.speaker) === speakerFilter)
  }, [speakerFilter, voiceLines])

  useEffect(() => {
    if (filteredVoiceLines.length === 0) {
      setSelectedLineId(null)
      return
    }
    if (!selectedLineId || !filteredVoiceLines.some((line) => line.id === selectedLineId)) {
      setSelectedLineId(filteredVoiceLines[0].id)
    }
  }, [filteredVoiceLines, selectedLineId])

  const selectedLine = useMemo(() => voiceLines.find((line) => line.id === selectedLineId) ?? null, [selectedLineId, voiceLines])

  useEffect(() => {
    if (selectedLine) return
    setIsLineModalOpen(false)
  }, [selectedLine])

  const voiceTasks = useMemo(() => filterVoiceTasks(tasksQuery.data, episodeId), [episodeId, tasksQuery.data])
  const runningTaskCount = useMemo(() => voiceTasks.filter((task) => runningStatuses.has(task.status)).length, [voiceTasks])
  const hasRunningVoiceTasks = useMemo(
    () => voiceTasks.some((task) => runningStatuses.has(task.status)),
    [voiceTasks],
  )

  useEffect(() => {
    if (!hasRunningVoiceTasks) return
    const timer = window.setInterval(() => {
      void episodeQuery.refetch()
    }, 2000)
    return () => window.clearInterval(timer)
  }, [episodeQuery, hasRunningVoiceTasks])

  const timedLineCount = useMemo(
    () => voiceLines.filter((line) => line.startTime && line.endTime).length,
    [voiceLines],
  )

  const speakerLineCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    voiceLines.forEach((line) => {
      const speaker = normalizeInlineText(line.speaker)
      if (!speaker) return
      counts[speaker] = (counts[speaker] ?? 0) + 1
    })
    return counts
  }, [voiceLines])

  const lineDraftTranscript = useMemo(() => serializeVoiceLines(voiceLines), [voiceLines])
  const lineEditsApplied = lineDraftTranscript.trim() === transcriptDraft.trim()
  const transcriptDirty = transcriptDraft !== (currentEpisode.srt_content ?? '')
  const linesWithVoice = useMemo(
    () => voiceLines.filter((line) => Boolean(normalizeInlineText(line.speaker))).length,
    [voiceLines],
  )
  const linesWithBoundVoice = useMemo(
    () =>
      voiceLines.filter((line) => {
        const speaker = normalizeInlineText(line.speaker)
        if (!speaker) return false
        return Boolean(speakerVoiceBindings[speaker])
      }).length,
    [speakerVoiceBindings, voiceLines],
  )
  const missingSpeakerCount = useMemo(
    () => voiceLines.filter((line) => !normalizeInlineText(line.speaker)).length,
    [voiceLines],
  )
  const missingVoiceBindingCount = useMemo(
    () =>
      voiceLines.filter((line) => {
        const speaker = normalizeInlineText(line.speaker)
        if (!speaker) return false
        return !speakerVoiceBindings[speaker]
      }).length,
    [speakerVoiceBindings, voiceLines],
  )
  const episodeAudioUrl = useMemo(
    () => (currentEpisode.audio_media_id ? buildMediaUrl(currentEpisode.audio_media_id) : null),
    [currentEpisode.audio_media_id],
  )
  const linesWithAudio = useMemo(
    () => (episodeAudioUrl ? voiceLines.length : 0),
    [episodeAudioUrl, voiceLines.length],
  )
  const allSpeakersHaveVoice = voiceLines.length > 0 && linesWithBoundVoice === voiceLines.length && missingSpeakerCount === 0
  const visibleVoiceLines = useMemo(() => {
    const normalizedSearch = lineSearch.toLowerCase().trim()
    return filteredVoiceLines.filter((line) => {
      const missingSpeaker = !normalizeInlineText(line.speaker)
      if (showNeedsSpeakerOnly && !missingSpeaker) return false
      if (!normalizedSearch) return true
      return [line.text, line.speaker, line.startTime, line.endTime, `${line.order}`]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [filteredVoiceLines, lineSearch, showNeedsSpeakerOnly])
  const visibleSpeakers = useMemo(() => {
    const set = new Set<string>()
    visibleVoiceLines.forEach((line) => {
      const speaker = normalizeInlineText(line.speaker)
      if (speaker) set.add(speaker)
    })
    return Array.from(set)
  }, [visibleVoiceLines])
  const filteredVoiceProfiles = useMemo(() => {
    const keyword = voiceSearch.toLowerCase().trim()
    if (!keyword) return voiceProfiles
    return voiceProfiles.filter((profile) => `${profile.name} ${profile.style} ${profile.gender}`.toLowerCase().includes(keyword))
  }, [voiceProfiles, voiceSearch])

  const saveTranscriptMutation = useMutation({
    mutationFn: () => updateEpisode(episodeId, { srt_content: transcriptDraft.trim() ? transcriptDraft : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.detail(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      setFeedback('Transcript saved.')
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Failed to save transcript.')
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: () =>
      storyToScript(episodeId, {
        content: transcriptDraft.trim() || lineDraftTranscript.trim() || currentEpisode.srt_content || currentEpisode.novel_text || '',
        episode_name: currentEpisode.name,
      }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      await tasksQuery.refetch()
      setFeedback('Story-to-script analysis queued.')
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Failed to start story-to-script analysis.')
    },
  })

  const voiceGenerateMutation = useMutation({
    mutationFn: async (input: { line?: VoiceLineDraft | null; transcript?: string; message: string }) =>
      voiceGenerate(episodeId, {
        transcript: input.transcript ?? transcriptDraft.trim() ?? lineDraftTranscript.trim() ?? currentEpisode.srt_content ?? currentEpisode.novel_text ?? '',
        line_text: input.line ? composeDialogue(input.line) : undefined,
        line_order: input.line?.order,
        speaker: input.line ? normalizeInlineText(input.line.speaker) || null : null,
      }),
    onSuccess: async (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.detail(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      await Promise.all([episodeQuery.refetch(), tasksQuery.refetch()])
      setFeedback(variables.message)
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Failed to start voice generation.')
    },
  })

  const updateLine = (lineId: string, patch: Partial<VoiceLineDraft>) => {
    setVoiceLines((previous) => previous.map((line) => (line.id === lineId ? { ...line, ...patch } : line)))
  }

  const addLineAfterSelected = () => {
    const lineId = createVoiceLineId()
    setVoiceLines((previous) => {
      const insertAt = selectedLineId ? previous.findIndex((line) => line.id === selectedLineId) + 1 : previous.length
      const next = [...previous]
      const nextSpeaker = speakerFilter === 'all' ? '' : speakerFilter
      next.splice(Math.max(insertAt, 0), 0, {
        id: lineId,
        order: 0,
        source: 'srt',
        startTime: '',
        endTime: '',
        speaker: nextSpeaker,
        text: '',
      })
      return reindexVoiceLines(next)
    })
    setSelectedLineId(lineId)
    setIsLineModalOpen(true)
  }

  const deleteLine = (lineId: string) => {
    setVoiceLines((previous) => reindexVoiceLines(previous.filter((line) => line.id !== lineId)))
    setLineActionInfo('Line removed from local draft.')
  }

  const deleteSelected = () => {
    if (!selectedLineId) return
    deleteLine(selectedLineId)
  }

  const applyLineEdits = () => {
    setTranscriptDraft(lineDraftTranscript)
    setFeedback('Line edits applied to transcript draft. Save transcript to persist.')
  }

  const resetLineDrafts = () => {
    setVoiceLines(toVoiceLineDrafts(stageLines))
    setFeedback('Line editor reset from latest episode content.')
  }

  const reparseTranscript = () => {
    const reparsed = buildEpisodeStageLines({ novel_text: null, srt_content: transcriptDraft })
    setVoiceLines(toVoiceLineDrafts(reparsed))
    setSpeakerFilter('all')
    setFeedback(reparsed.length > 0 ? 'Transcript draft reparsed into line editor.' : 'No parsable lines in transcript draft.')
  }

  const fillMissingSpeaker = () => {
    setVoiceLines((previous) =>
      previous.map((line) => ({
        ...line,
        speaker: line.speaker.trim() ? line.speaker : 'Narrator',
      })),
    )
  }

  const openSpeakerBinding = (speaker: string) => {
    setBindingSpeaker(speaker)
    setSelectedVoiceProfileId(speakerVoiceBindings[speaker] ?? '')
    setVoiceSearch('')
    setIsSpeakerBindingOpen(true)
  }

  const saveSpeakerBinding = () => {
    if (!bindingSpeaker || !selectedVoiceProfileId) return
    setSpeakerVoiceBindings((previous) => ({
      ...previous,
      [bindingSpeaker]: selectedVoiceProfileId,
    }))
    setIsSpeakerBindingOpen(false)
    setFeedback(`Bound speaker "${bindingSpeaker}" to selected voice profile.`)
  }

  const openVoiceDesignDialog = () => {
    setVoiceDesignName(`${bindingSpeaker || 'Speaker'} Custom Voice`)
    setVoiceDesignStyle('expressive and natural with clear articulation')
    setVoiceDesignGender('neutral')
    setIsVoiceDesignOpen(true)
  }

  const createVoiceProfile = () => {
    const name = voiceDesignName.trim()
    if (!name) return
    const created: VoiceProfile = {
      id: `vp-custom-${Math.random().toString(36).slice(2, 10)}`,
      name,
      style: voiceDesignStyle.trim() || 'custom designed voice profile',
      gender: voiceDesignGender,
    }
    setVoiceProfiles((previous) => [created, ...previous])
    if (bindingSpeaker) {
      setSpeakerVoiceBindings((previous) => ({
        ...previous,
        [bindingSpeaker]: created.id,
      }))
      setSelectedVoiceProfileId(created.id)
    }
    setIsVoiceDesignOpen(false)
    setIsSpeakerBindingOpen(false)
    setFeedback(`Created voice profile "${created.name}" and applied binding.`)
  }

  const saveEmotionSettings = (lineId: string) => {
    const settings = emotionByLine[lineId]
    if (!settings) return
    setFeedback(`Emotion settings saved for line #${voiceLines.find((line) => line.id === lineId)?.order ?? '?'} (UI shell).`)
  }

  const openLineEditor = (lineId: string) => {
    setSelectedLineId(lineId)
    setIsLineModalOpen(true)
  }

  const runLineAction = async (action: LineAction, line: VoiceLineDraft) => {
    if (action === 'delete') {
      deleteLine(line.id)
      return
    }

    if (action === 'generate') {
      const busyKey = `${action}-${line.id}`
      setLineActionBusyKey(busyKey)
      try {
        await voiceGenerateMutation.mutateAsync({
          line,
          transcript: lineDraftTranscript.trim() || transcriptDraft.trim(),
          message: `Voice generation queued for line #${line.order}. Latest episode audio will refresh when the task completes.`,
        })
      } finally {
        setLineActionBusyKey(null)
      }
      return
    }

    if (!episodeAudioUrl) {
      setLineActionInfo('No generated episode audio yet. Run voice generate first.')
      return
    }

    const busyKey = `${action}-${line.id}`
    setLineActionBusyKey(busyKey)
    try {
      if (action === 'play') {
        audioRef.current?.pause()
        const audio = new Audio(episodeAudioUrl)
        audioRef.current = audio
        try {
          await audio.play()
          setLineActionInfo(`Playing latest episode audio for line #${line.order}.`)
        } catch {
          window.open(episodeAudioUrl, '_blank', 'noopener')
          setLineActionInfo(`Opened latest episode audio for line #${line.order}.`)
        }
      }

      if (action === 'download') {
        triggerDownload(episodeAudioUrl, `${currentEpisode.name || 'episode'}-voice.wav`)
        setLineActionInfo(`Downloaded latest episode audio for line #${line.order}.`)
      }
    } finally {
      setLineActionBusyKey(null)
    }
  }

  const analyzeLines = async () => {
    if (analyzeMutation.isPending) return
    await analyzeMutation.mutateAsync()
  }

  const generateAllLines = async () => {
    if (voiceGenerateMutation.isPending || visibleVoiceLines.length === 0) return
    await voiceGenerateMutation.mutateAsync({
      transcript: serializeVoiceLines(visibleVoiceLines) || lineDraftTranscript.trim() || transcriptDraft.trim(),
      message: `Batch voice generation queued for ${visibleVoiceLines.length} line(s). Latest episode audio will refresh when the task completes.`,
    })
  }

  const downloadAllAudio = async () => {
    if (!episodeAudioUrl) {
      setFeedback('No generated episode audio available to download yet.')
      return
    }
    triggerDownload(episodeAudioUrl, `${currentEpisode.name || 'episode'}-voice.wav`)
    setFeedback('Downloaded latest episode audio.')
  }

  const runningSummaryCount =
    runningTaskCount +
    (voiceGenerateMutation.isPending ? 1 : 0) +
    (analyzeMutation.isPending ? 1 : 0)

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Voice Stage</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">Editable voice-line workflow with transcript sync and persisted episode audio.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void analyzeLines()} disabled={analyzeMutation.isPending}>
              {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze'}
            </Button>
            <Button type="button" variant="secondary" onClick={addLineAfterSelected}>Add Line</Button>
            <Button
              type="button"
              onClick={() => void generateAllLines()}
              disabled={voiceGenerateMutation.isPending || !allSpeakersHaveVoice || visibleVoiceLines.length === 0}
            >
              {voiceGenerateMutation.isPending ? 'Generating...' : 'Generate All'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void downloadAllAudio()}
              disabled={!episodeAudioUrl}
            >
              Download All
            </Button>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'prompts')}>
              <Button variant="secondary">Back Prompts</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'video')}>
              <Button variant="secondary">Go Video</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Lines</p>
            <p className="mt-1 text-2xl font-semibold">{voiceLines.length}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Timed Lines</p>
            <p className="mt-1 text-2xl font-semibold">{timedLineCount}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Speakers</p>
            <p className="mt-1 text-2xl font-semibold">{speakerOptions.length}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Running Tasks</p>
            <p className="mt-1 text-2xl font-semibold">{runningSummaryCount}</p>
          </article>
        </div>
      </SectionCard>

      {feedback ? <SectionCard className="glass-success rounded-2xl p-4 text-sm">{feedback}</SectionCard> : null}
      {lineActionInfo ? <SectionCard className="glass-warning rounded-2xl p-4 text-sm">{lineActionInfo}</SectionCard> : null}

      {episodeQuery.isLoading ? <LoadingState message="Loading episode content..." /> : null}
      {episodeQuery.isError ? <ErrorState message="Failed to load episode details." /> : null}

      {speakerOptions.length > 0 ? (
        <SectionCard className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Speaker Voice Status</h3>
            <p className="text-xs text-[var(--glass-text-tertiary)]">
              Lines: {voiceLines.length} | Speaker Set: {linesWithVoice} | Voice Bound: {linesWithBoundVoice} | Missing Speaker: {missingSpeakerCount} | Missing Binding: {missingVoiceBindingCount} | Audio Ready: {linesWithAudio}
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {speakerOptions.map((speaker) => {
              const profileId = speakerVoiceBindings[speaker] ?? ''
              const profile = voiceProfiles.find((item) => item.id === profileId) ?? null
              return (
                <article key={speaker} className="card-base rounded-xl px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-[var(--glass-text-secondary)]">{speaker}</p>
                    <span className="text-xs text-[var(--glass-text-tertiary)]">{speakerLineCounts[speaker] ?? 0} line(s)</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">
                    {profile ? `Bound voice: ${profile.name}` : 'No voice binding yet'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={() => openSpeakerBinding(speaker)}>
                      {profile ? 'Rebind Voice' : 'Bind Voice'}
                    </button>
                    {profile ? <span className="glass-chip px-2 py-0.5">{profile.gender}</span> : <span className="glass-warning rounded-full px-2 py-0.5">Unbound</span>}
                  </div>
                </article>
              )
            })}
          </div>
          {!allSpeakersHaveVoice ? <p className="text-xs text-[var(--glass-tone-warning-fg)]">Some lines are missing speaker bindings. Use `Fill Missing Speakers` before batch generation.</p> : null}
          {episodeAudioUrl ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--glass-text-tertiary)]">
              <span className="glass-success rounded-full px-2 py-0.5">Episode Audio Ready</span>
              <a className="underline" href={episodeAudioUrl} target="_blank" rel="noreferrer">Open latest audio</a>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Voice Line Queue</h3>
            <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">
              Visible {visibleVoiceLines.length} / {filteredVoiceLines.length} · Visible speakers {visibleSpeakers.length} · Needs speaker {missingSpeakerCount}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="glass-input w-40" value={speakerFilter} onChange={(event) => setSpeakerFilter(event.target.value)}>
              <option value="all">All Speakers</option>
              {speakerOptions.map((speaker) => (
                <option key={speaker} value={speaker}>{speaker}</option>
              ))}
            </select>
            <input
              className="glass-input w-56"
              value={lineSearch}
              onChange={(event) => setLineSearch(event.target.value)}
              placeholder="Search line / speaker / timestamp"
            />
            <button
              type="button"
              className={[
                'glass-btn-base rounded-lg px-3 py-1.5 text-xs',
                showNeedsSpeakerOnly ? 'glass-btn-tone-info text-white' : 'glass-btn-ghost',
              ].join(' ')}
              onClick={() => setShowNeedsSpeakerOnly((current) => !current)}
            >
              {showNeedsSpeakerOnly ? 'Missing Speaker Only' : 'Show Missing Speaker'}
            </button>
            <Button type="button" variant="secondary" onClick={fillMissingSpeaker}>Fill Missing Speakers</Button>
            <Button type="button" variant="secondary" onClick={resetLineDrafts}>Reset Line Draft</Button>
          </div>
        </div>

        {visibleVoiceLines.length === 0 ? (
          <EmptyState title="No lines available" description="Adjust filters, or create/reparse transcript lines to continue." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleVoiceLines.map((line) => {
              const active = line.id === selectedLineId
              const timingLabel = lineTimeLabel({ startTime: line.startTime || null, endTime: line.endTime || null })
              const speaker = normalizeInlineText(line.speaker)
              const hasSpeaker = Boolean(speaker)
              const voiceProfileId = hasSpeaker ? speakerVoiceBindings[speaker] ?? '' : ''
              const boundProfile = voiceProfileId ? voiceProfiles.find((item) => item.id === voiceProfileId) ?? null : null
              const emotionSettings = emotionByLine[line.id] ?? { prompt: '', strength: 0.4 }
              const emotionExpanded = expandedEmotionLineId === line.id
              const hasAudio = Boolean(episodeAudioUrl)
              const generating = lineActionBusyKey === `generate-${line.id}`
              const playing = lineActionBusyKey === `play-${line.id}`
              const downloading = lineActionBusyKey === `download-${line.id}`
              return (
                <article
                  key={line.id}
                  className={[
                    'card-base rounded-xl p-0 overflow-hidden transition-colors',
                    active ? 'border-[var(--glass-accent-from)] bg-[var(--glass-bg-muted)]' : '',
                    hasSpeaker ? '' : 'ring-1 ring-[var(--glass-stroke-warning)]/80',
                  ].join(' ')}
                >
                  <div className={['flex items-center justify-between gap-2 px-3 py-2', hasAudio ? 'bg-[var(--glass-tone-success-bg)]/70' : 'bg-[var(--glass-bg-muted)]'].join(' ')}>
                    <button type="button" onClick={() => setSelectedLineId(line.id)} className="text-left">
                      <p className="text-xs text-[var(--glass-text-tertiary)]">Line {line.order}</p>
                    </button>
                    <div className="flex items-center gap-1 text-[11px]">
                      {hasAudio ? <span className="glass-success rounded-full px-2 py-0.5">Audio Ready</span> : <span className="glass-warning rounded-full px-2 py-0.5">Pending</span>}
                      {!hasSpeaker ? <span className="glass-warning rounded-full px-2 py-0.5">Speaker Missing</span> : null}
                      {hasSpeaker ? (
                        boundProfile ? <span className="glass-success rounded-full px-2 py-0.5">Voice Bound</span> : <span className="glass-warning rounded-full px-2 py-0.5">Voice Unbound</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-3 py-3">
                    <button type="button" onClick={() => setSelectedLineId(line.id)} className="w-full text-left">
                      <p className="line-clamp-3 text-sm text-[var(--glass-text-secondary)]">{line.text || '-'}</p>
                      {timingLabel ? <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{timingLabel}</p> : <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">No timing bound</p>}
                    </button>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <button type="button" onClick={() => void runLineAction('generate', line)} disabled={generating || voiceGenerateMutation.isPending} className="glass-btn-base rounded-lg border border-[var(--glass-stroke-base)] bg-white px-2 py-1 text-xs text-[var(--glass-text-secondary)] disabled:opacity-60">
                        {generating ? '...' : hasAudio ? 'Regenerate' : 'Generate'}
                      </button>
                      <button type="button" onClick={() => openLineEditor(line.id)} className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-xs">Edit</button>
                      <button type="button" onClick={() => void runLineAction('play', line)} disabled={playing || !episodeAudioUrl} className="glass-btn-base rounded-lg border border-[var(--glass-stroke-base)] bg-white px-2 py-1 text-xs text-[var(--glass-text-secondary)] disabled:opacity-60">
                        {playing ? '...' : 'Play'}
                      </button>
                      <button type="button" onClick={() => void runLineAction('download', line)} disabled={downloading || !episodeAudioUrl} className="glass-btn-base rounded-lg border border-[var(--glass-stroke-base)] bg-white px-2 py-1 text-xs text-[var(--glass-text-secondary)] disabled:opacity-60">
                        {downloading ? '...' : 'Download'}
                      </button>
                      <button type="button" onClick={() => void runLineAction('delete', line)} className="glass-btn-base col-span-2 rounded-lg border border-[var(--glass-tone-danger-fg)] bg-[var(--glass-tone-danger-bg)] px-2 py-1 text-xs text-[var(--glass-tone-danger-fg)]">Delete Line</button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {hasSpeaker ? (
                        <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={() => openSpeakerBinding(speaker)}>
                          {boundProfile ? `Rebind: ${boundProfile.name}` : 'Bind Voice'}
                        </button>
                      ) : (
                        <span className="glass-warning rounded-full px-2 py-0.5 text-[11px]">Set speaker before binding voice</span>
                      )}
                      <button
                        type="button"
                        className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-xs disabled:opacity-60"
                        onClick={() => setExpandedEmotionLineId((current) => (current === line.id ? null : line.id))}
                        disabled={!hasSpeaker || !boundProfile}
                      >
                        {emotionExpanded ? 'Hide Emotion' : boundProfile ? 'Emotion Settings' : 'Bind Voice First'}
                      </button>
                    </div>

                    {emotionExpanded ? (
                      <div className="mt-2 space-y-2 rounded-lg border border-[var(--glass-stroke-focus)]/40 bg-[var(--glass-tone-info-bg)]/80 p-2">
                        <label className="grid gap-1">
                          <span className="text-[11px] font-medium text-[var(--glass-tone-info-fg)]">Emotion Prompt</span>
                          <input
                            type="text"
                            className="glass-input h-9 text-xs"
                            value={emotionSettings.prompt}
                            onChange={(event) =>
                              setEmotionByLine((previous) => ({
                                ...previous,
                                [line.id]: {
                                  ...emotionSettings,
                                  prompt: event.target.value,
                                },
                              }))
                            }
                            placeholder="e.g. restrained sadness with soft trembling"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-[11px] font-medium text-[var(--glass-tone-info-fg)]">
                            Emotion Strength: {emotionSettings.strength.toFixed(1)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.1}
                            value={emotionSettings.strength}
                            onChange={(event) =>
                              setEmotionByLine((previous) => ({
                                ...previous,
                                [line.id]: {
                                  ...emotionSettings,
                                  strength: Number(event.target.value),
                                },
                              }))
                            }
                            className="accent-[var(--glass-accent-from)]"
                          />
                        </label>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={() => saveEmotionSettings(line.id)}>
                            Save Emotion
                          </button>
                          <button
                            type="button"
                            className="glass-btn-base rounded-lg border border-[var(--glass-stroke-base)] bg-white px-2 py-1 text-xs text-[var(--glass-text-secondary)] disabled:opacity-60"
                            onClick={() => {
                              saveEmotionSettings(line.id)
                              void runLineAction('generate', line)
                            }}
                            disabled={generating || voiceGenerateMutation.isPending || !boundProfile}
                          >
                            Save + Generate
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)]/70 px-3 py-2 text-xs">
                    <span className={hasSpeaker ? 'glass-chip px-2 py-0.5' : 'glass-warning rounded-full px-2 py-0.5'}>{speaker || 'Speaker ?'}</span>
                    <div className="flex items-center gap-1.5">
                      {boundProfile ? <span className="glass-chip px-2 py-0.5">{boundProfile.name}</span> : hasSpeaker ? <span className="glass-warning rounded-full px-2 py-0.5">Unbound</span> : null}
                      <span className="text-[var(--glass-text-tertiary)]">{line.source.toUpperCase()}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {selectedLine ? (
          <SectionCard className="grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">Voice Line Editor</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Line {selectedLine.order} | Source: {selectedLine.source.toUpperCase()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setIsLineModalOpen(true)}>Open Modal</Button>
                <Button type="button" variant="secondary" onClick={deleteSelected}>Delete</Button>
              </div>
            </div>

            <p className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-sm text-[var(--glass-text-tertiary)]">Preview: {composeDialogue(selectedLine) || '-'}</p>
            {lineTimeLabel({ startTime: selectedLine.startTime || null, endTime: selectedLine.endTime || null }) ? (
              <p className="text-xs text-[var(--glass-text-tertiary)]">Timing: {lineTimeLabel({ startTime: selectedLine.startTime || null, endTime: selectedLine.endTime || null })}</p>
            ) : null}
            {episodeAudioUrl ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--glass-text-tertiary)]">
                <a className="underline" href={episodeAudioUrl} target="_blank" rel="noreferrer">Open latest episode audio</a>
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        <SectionCard className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Transcript Draft</h3>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={reparseTranscript}>Reparse Draft</Button>
              <Button type="button" variant="secondary" onClick={applyLineEdits} disabled={lineEditsApplied}>Sync From Lines</Button>
            </div>
          </div>

          <textarea className="glass-input min-h-56" value={transcriptDraft} onChange={(event) => setTranscriptDraft(event.target.value)} placeholder="SRT or plain transcript text..." />

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => saveTranscriptMutation.mutate()} disabled={saveTranscriptMutation.isPending || !transcriptDirty}>
              {saveTranscriptMutation.isPending ? 'Saving...' : 'Save Transcript'}
            </Button>
            <Link className="underline" to={buildWorkspaceStagePath(projectId, episodeId, 'prompts')}>Back To Prompts</Link>
            <Link className="underline" to={buildWorkspaceStagePath(projectId, episodeId, 'video')}>Continue Video</Link>
          </div>
          <p className="text-xs text-[var(--glass-text-tertiary)]">Line edits applied: {lineEditsApplied ? 'Yes' : 'No'} | Transcript changed: {transcriptDirty ? 'Yes' : 'No'}</p>
        </SectionCard>
      </div>

      <SectionCard className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Voice Task Stream</h3>
          <Button type="button" variant="secondary" onClick={() => tasksQuery.refetch()} disabled={tasksQuery.isFetching}>{tasksQuery.isFetching ? 'Refreshing...' : 'Refresh Tasks'}</Button>
        </div>
        {tasksQuery.isLoading ? <LoadingState message="Loading tasks..." /> : null}
        {tasksQuery.isError ? <ErrorState message="Failed to load tasks." /> : null}
        {!tasksQuery.isLoading && !tasksQuery.isError && voiceTasks.length === 0 ? <p className="text-sm text-[var(--glass-text-tertiary)]">No voice-related tasks yet.</p> : null}
        {voiceTasks.map((task) => (
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
        to={buildWorkspaceStagePath(projectId, episodeId, 'video')}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        Enter Video Generation
      </Link>

      {isLineModalOpen && selectedLine ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button type="button" className="glass-overlay absolute inset-0" onClick={() => setIsLineModalOpen(false)} />
          <section className="glass-modal-shell relative z-10 grid w-full max-w-2xl gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Voice Line Editor</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Line {selectedLine.order} | Source: {selectedLine.source.toUpperCase()}</p>
              </div>
              <button type="button" className="glass-btn-base glass-btn-ghost rounded-xl px-2 py-1.5 text-xs" onClick={() => setIsLineModalOpen(false)}>Close</button>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <input type="text" className="glass-input" value={selectedLine.speaker} onChange={(event) => updateLine(selectedLine.id, { speaker: event.target.value })} placeholder="Speaker" />
              <input type="text" className="glass-input" value={selectedLine.startTime} onChange={(event) => updateLine(selectedLine.id, { startTime: event.target.value })} placeholder="Start (00:00:00,000)" />
              <input type="text" className="glass-input" value={selectedLine.endTime} onChange={(event) => updateLine(selectedLine.id, { endTime: event.target.value })} placeholder="End (00:00:00,000)" />
            </div>

            <textarea className="glass-input min-h-36" value={selectedLine.text} onChange={(event) => updateLine(selectedLine.id, { text: event.target.value })} placeholder="Dialogue text..." />

            <p className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-sm text-[var(--glass-text-tertiary)]">Preview: {composeDialogue(selectedLine) || '-'}</p>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsLineModalOpen(false)}>Cancel</Button>
              <Button
                type="button"
                onClick={() => {
                  setIsLineModalOpen(false)
                  setFeedback('Line draft updated in modal editor.')
                }}
              >
                Apply Draft
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {isSpeakerBindingOpen && bindingSpeaker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button type="button" className="glass-overlay absolute inset-0" onClick={() => setIsSpeakerBindingOpen(false)} />
          <section className="glass-modal-shell relative z-10 grid w-full max-w-4xl gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Speaker Voice Binding</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Select a voice profile for speaker "{bindingSpeaker}".</p>
              </div>
              <button type="button" className="glass-btn-base glass-btn-ghost rounded-xl px-2 py-1.5 text-xs" onClick={() => setIsSpeakerBindingOpen(false)}>
                Close
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="grid gap-2">
                <input
                  className="glass-input"
                  value={voiceSearch}
                  onChange={(event) => setVoiceSearch(event.target.value)}
                  placeholder="Search voice profile by name/style"
                />
                <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 p-2">
                  {filteredVoiceProfiles.length === 0 ? <p className="text-xs text-[var(--glass-text-tertiary)]">No profile matches the current search.</p> : null}
                  {filteredVoiceProfiles.map((profile) => {
                    const selected = selectedVoiceProfileId === profile.id
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => setSelectedVoiceProfileId(profile.id)}
                        className={[
                          'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                          selected
                            ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]'
                            : 'border-[var(--glass-stroke-base)] bg-white text-[var(--glass-text-secondary)] hover:bg-white/80',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{profile.name}</p>
                          <span className="glass-chip px-2 py-0.5 text-[11px]">{profile.gender}</span>
                        </div>
                        <p className="mt-1 text-xs opacity-90">{profile.style}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <aside className="space-y-2 rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Binding Summary</p>
                <p className="text-xs text-[var(--glass-text-tertiary)]">Speaker: <span className="font-medium text-[var(--glass-text-secondary)]">{bindingSpeaker}</span></p>
                <p className="text-xs text-[var(--glass-text-tertiary)]">
                  Selected: <span className="font-medium text-[var(--glass-text-secondary)]">{voiceProfiles.find((profile) => profile.id === selectedVoiceProfileId)?.name ?? 'None'}</span>
                </p>
                <button type="button" className="glass-btn-base glass-btn-ghost w-full rounded-lg px-2 py-1.5 text-xs" onClick={openVoiceDesignDialog}>
                  Create Custom Voice
                </button>
                {speakerVoiceBindings[bindingSpeaker] ? (
                  <button
                    type="button"
                    className="glass-btn-base w-full rounded-lg border border-[var(--glass-tone-danger-fg)] bg-[var(--glass-tone-danger-bg)] px-2 py-1.5 text-xs text-[var(--glass-tone-danger-fg)]"
                    onClick={() => {
                      setSpeakerVoiceBindings((previous) => {
                        const next = { ...previous }
                        delete next[bindingSpeaker]
                        return next
                      })
                      setSelectedVoiceProfileId('')
                      setFeedback(`Removed voice binding for "${bindingSpeaker}".`)
                    }}
                  >
                    Unbind Speaker
                  </button>
                ) : null}
              </aside>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsSpeakerBindingOpen(false)}>Cancel</Button>
              <Button type="button" onClick={saveSpeakerBinding} disabled={!selectedVoiceProfileId}>Bind Voice</Button>
            </div>
          </section>
        </div>
      ) : null}

      {isVoiceDesignOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
          <button type="button" className="glass-overlay absolute inset-0" onClick={() => setIsVoiceDesignOpen(false)} />
          <section className="glass-modal-shell relative z-10 grid w-full max-w-xl gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Voice Design</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">Create a custom voice profile shell and auto-bind to "{bindingSpeaker || 'speaker'}".</p>
              </div>
              <button type="button" className="glass-btn-base glass-btn-ghost rounded-xl px-2 py-1.5 text-xs" onClick={() => setIsVoiceDesignOpen(false)}>
                Close
              </button>
            </div>

            <label className="grid gap-1">
              <span className="text-xs text-[var(--glass-text-tertiary)]">Voice Name</span>
              <input type="text" className="glass-input" value={voiceDesignName} onChange={(event) => setVoiceDesignName(event.target.value)} placeholder="e.g. Midnight Storyteller" />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-[var(--glass-text-tertiary)]">Voice Style</span>
              <textarea
                className="glass-input min-h-24"
                value={voiceDesignStyle}
                onChange={(event) => setVoiceDesignStyle(event.target.value)}
                placeholder="Describe tone, texture, pacing, and articulation."
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-[var(--glass-text-tertiary)]">Gender Hint</span>
              <select className="glass-input" value={voiceDesignGender} onChange={(event) => setVoiceDesignGender(event.target.value as 'female' | 'male' | 'neutral')}>
                <option value="neutral">Neutral</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsVoiceDesignOpen(false)}>Cancel</Button>
              <Button type="button" onClick={createVoiceProfile} disabled={!voiceDesignName.trim()}>Create And Bind</Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
