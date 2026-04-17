import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { SectionCard } from '../../components/common/PageState'
import { useEditorStore } from '../../app/store/editor.store'

type MockClip = {
  id: string
  title: string
  durationMs: number
  startMs: number
  lane: 'video' | 'audio'
  status: 'ready' | 'rendering' | 'draft'
}

const mockClips: MockClip[] = [
  { id: 'clip-1', title: 'Opening Wide Shot', durationMs: 5600, startMs: 0, lane: 'video', status: 'ready' },
  { id: 'clip-2', title: 'Dialogue Closeup', durationMs: 4200, startMs: 5800, lane: 'video', status: 'rendering' },
  { id: 'clip-3', title: 'Rain Transition', durationMs: 2600, startMs: 10300, lane: 'video', status: 'draft' },
  { id: 'clip-4', title: 'Ambient Music Bed', durationMs: 12200, startMs: 0, lane: 'audio', status: 'ready' },
  { id: 'clip-5', title: 'Narration VO', durationMs: 6200, startMs: 5400, lane: 'audio', status: 'draft' },
]

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function statusTone(status: MockClip['status']) {
  if (status === 'ready') return 'glass-success'
  if (status === 'rendering') return 'glass-warning'
  return 'glass-muted'
}

export function EditorPage() {
  const { episodeId = '' } = useParams()

  const playing = useEditorStore((state) => state.playing)
  const zoom = useEditorStore((state) => state.zoom)
  const currentTimeMs = useEditorStore((state) => state.currentTimeMs)
  const selectedClipId = useEditorStore((state) => state.selectedClipId)
  const setPlaying = useEditorStore((state) => state.setPlaying)
  const setZoom = useEditorStore((state) => state.setZoom)
  const setCurrentTimeMs = useEditorStore((state) => state.setCurrentTimeMs)
  const setSelectedClipId = useEditorStore((state) => state.setSelectedClipId)

  const [clipSearch, setClipSearch] = useState('')
  const [laneFilter, setLaneFilter] = useState<'all' | 'video' | 'audio'>('all')
  const [editorNotice, setEditorNotice] = useState<string | null>(null)
  const [isClipModalOpen, setIsClipModalOpen] = useState(false)
  const [clipNotes, setClipNotes] = useState<Record<string, string>>({})

  const totalDurationMs = useMemo(
    () => mockClips.reduce((max, clip) => Math.max(max, clip.startMs + clip.durationMs), 0) + 1200,
    [],
  )

  const timelineLabel = useMemo(() => `${zoom.toFixed(1)}x`, [zoom])
  const timeLabel = useMemo(() => formatDuration(currentTimeMs), [currentTimeMs])
  const totalDurationLabel = useMemo(() => formatDuration(totalDurationMs), [totalDurationMs])

  const selectedClip = useMemo(
    () => mockClips.find((clip) => clip.id === selectedClipId) ?? null,
    [selectedClipId],
  )

  const visibleClips = useMemo(() => {
    const keyword = clipSearch.trim().toLowerCase()
    return mockClips.filter((clip) => {
      if (laneFilter !== 'all' && clip.lane !== laneFilter) return false
      if (!keyword) return true
      return `${clip.title} ${clip.lane}`.toLowerCase().includes(keyword)
    })
  }, [clipSearch, laneFilter])

  const progress = Math.min(100, Math.max(0, Math.round((currentTimeMs / totalDurationMs) * 100)))
  const readyClipCount = useMemo(() => mockClips.filter((clip) => clip.status === 'ready').length, [])
  const renderClipCount = useMemo(() => mockClips.filter((clip) => clip.status === 'rendering').length, [])

  const timelineTicks = useMemo(() => {
    const count = Math.max(6, Math.round(8 * zoom))
    return Array.from({ length: count + 1 }, (_, index) => {
      const ms = Math.round((totalDurationMs / count) * index)
      return { id: `tick-${index}`, label: formatDuration(ms), left: (index / count) * 100 }
    })
  }, [totalDurationMs, zoom])

  const laneGroups = useMemo(
    () => ({
      video: visibleClips.filter((clip) => clip.lane === 'video'),
      audio: visibleClips.filter((clip) => clip.lane === 'audio'),
    }),
    [visibleClips],
  )

  const handleQuickAction = (action: 'auto-arrange' | 'smart-trim' | 'export-plan') => {
    const label =
      action === 'auto-arrange'
        ? 'Auto Arrange'
        : action === 'smart-trim'
          ? 'Smart Trim'
          : 'Export Plan'
    setEditorNotice(`${label} queued (UI shell placeholder).`)
  }

  const handleOpenClipModal = (clipId: string) => {
    setSelectedClipId(clipId)
    setIsClipModalOpen(true)
  }

  const selectedClipNote = selectedClip ? clipNotes[selectedClip.id] ?? '' : ''

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Episode Editor Console</h1>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              Episode ID: {episodeId} | Timeline shell with lane editing and render package control.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/projects">
              <Button variant="secondary">Back to Projects</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="secondary">Dashboard</Button>
            </Link>
            <Button type="button" onClick={() => handleQuickAction('export-plan')}>
              Export Package
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Playback</p>
            <p className="mt-1 text-lg font-semibold">{playing ? 'Playing' : 'Paused'}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Timeline Zoom</p>
            <p className="mt-1 text-lg font-semibold">{timelineLabel}</p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Ready / Rendering</p>
            <p className="mt-1 text-lg font-semibold">
              {readyClipCount} / {renderClipCount}
            </p>
          </article>
          <article className="card-base px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Current / Total</p>
            <p className="mt-1 text-lg font-semibold">
              {timeLabel} / {totalDurationLabel}
            </p>
          </article>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPlaying(!playing)}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button variant="secondary" onClick={() => setCurrentTimeMs(Math.max(0, currentTimeMs - 1000))}>
            -1s
          </Button>
          <Button variant="secondary" onClick={() => setCurrentTimeMs(Math.min(totalDurationMs, currentTimeMs + 1000))}>
            +1s
          </Button>
          <Button variant="secondary" onClick={() => setZoom(Math.max(0.5, Number((zoom - 0.1).toFixed(1))))}>
            Zoom Out
          </Button>
          <Button variant="secondary" onClick={() => setZoom(Math.min(3, Number((zoom + 0.1).toFixed(1))))}>
            Zoom In
          </Button>
          <Button variant="secondary" onClick={() => handleQuickAction('auto-arrange')}>
            Auto Arrange
          </Button>
          <Button variant="secondary" onClick={() => handleQuickAction('smart-trim')}>
            Smart Trim
          </Button>
        </div>

        <input
          type="range"
          min={0}
          max={totalDurationMs}
          step={100}
          value={currentTimeMs}
          onChange={(event) => setCurrentTimeMs(Number(event.target.value))}
          className="w-full"
        />
        <p className="text-xs text-[var(--glass-text-tertiary)]">
          Progress: {progress}% ({timeLabel} / {totalDurationLabel})
        </p>
      </SectionCard>

      {editorNotice ? <SectionCard className="glass-warning rounded-2xl p-4 text-sm">{editorNotice}</SectionCard> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <SectionCard className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Timeline Lanes</h2>
            <div className="flex flex-wrap gap-2">
              <input
                className="glass-input w-44"
                value={clipSearch}
                onChange={(event) => setClipSearch(event.target.value)}
                placeholder="Search clips"
              />
              <select className="glass-input w-32" value={laneFilter} onChange={(event) => setLaneFilter(event.target.value as 'all' | 'video' | 'audio')}>
                <option value="all">All Lanes</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 p-3">
            <div className="relative h-6">
              {timelineTicks.map((tick) => (
                <div key={tick.id} className="absolute top-0" style={{ left: `${tick.left}%` }}>
                  <div className="h-2 w-px bg-[var(--glass-stroke-base)]" />
                  <p className="-translate-x-1/2 pt-1 text-[10px] text-[var(--glass-text-tertiary)]">{tick.label}</p>
                </div>
              ))}
            </div>

            {(['video', 'audio'] as const).map((lane) => (
              <div key={lane} className="mt-4 grid gap-2">
                <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">{lane} lane</p>
                <div className="relative h-20 rounded-lg border border-dashed border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-1">
                  {laneGroups[lane].map((clip) => {
                    const left = (clip.startMs / totalDurationMs) * 100
                    const width = Math.max(12, (clip.durationMs / totalDurationMs) * 100)
                    return (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => setSelectedClipId(clip.id)}
                        className={[
                          'absolute top-2 h-16 rounded-md border px-2 py-1 text-left',
                          selectedClipId === clip.id
                            ? 'border-[var(--glass-accent-from)] bg-[var(--glass-accent-from)] text-white'
                            : 'border-[var(--glass-stroke-base)] bg-white/90 text-[var(--glass-text-secondary)]',
                        ].join(' ')}
                        style={{ left: `${left}%`, width: `${Math.min(width, 96 - left)}%` }}
                        title={clip.title}
                      >
                        <p className="line-clamp-1 text-xs font-semibold">{clip.title}</p>
                        <p className="text-[10px]">{formatDuration(clip.durationMs)}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {visibleClips.map((clip) => (
              <article key={clip.id} className="card-base rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" className="text-left" onClick={() => setSelectedClipId(clip.id)}>
                    <p className="text-sm font-semibold text-[var(--glass-text-secondary)]">{clip.title}</p>
                  </button>
                  <span className={['rounded-full px-2 py-0.5 text-xs', statusTone(clip.status)].join(' ')}>
                    {clip.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">
                  Lane: {clip.lane} | Start {formatDuration(clip.startMs)} | Duration {formatDuration(clip.durationMs)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={() => handleOpenClipModal(clip.id)}>
                    Edit Clip
                  </button>
                  <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={() => setCurrentTimeMs(clip.startMs)}>
                    Jump
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="h-fit xl:sticky xl:top-24">
          <h2 className="text-base font-semibold">Inspector</h2>
          {selectedClip ? (
            <div className="mt-3 grid gap-2 text-sm">
              <article className="card-base px-3 py-2">
                <p className="text-xs text-[var(--glass-text-tertiary)]">Clip</p>
                <p className="mt-1 font-medium">{selectedClip.title}</p>
              </article>
              <article className="card-base px-3 py-2">
                <p className="text-xs text-[var(--glass-text-tertiary)]">Lane / Status</p>
                <p className="mt-1 font-medium">
                  {selectedClip.lane} / {selectedClip.status}
                </p>
              </article>
              <article className="card-base px-3 py-2">
                <p className="text-xs text-[var(--glass-text-tertiary)]">Timing</p>
                <p className="mt-1 font-medium">
                  {formatDuration(selectedClip.startMs)}
                  {' -> '}
                  {formatDuration(selectedClip.startMs + selectedClip.durationMs)}
                </p>
              </article>
              <div className="mt-1 grid gap-2">
                <Button type="button" onClick={() => setIsClipModalOpen(true)} block>
                  Open Clip Modal
                </Button>
                <Button type="button" variant="secondary" onClick={() => setCurrentTimeMs(selectedClip.startMs)} block>
                  Jump To Clip
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--glass-text-tertiary)]">No clip selected yet.</p>
          )}
        </SectionCard>
      </div>

      <Link
        to="/projects"
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        Back To Projects
      </Link>

      {isClipModalOpen && selectedClip ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button type="button" className="glass-overlay absolute inset-0" onClick={() => setIsClipModalOpen(false)} />
          <section className="glass-surface-elevated relative z-10 grid w-full max-w-xl gap-4 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Clip Edit Modal (UI Replica)</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{selectedClip.title}</p>
              </div>
              <button
                type="button"
                className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-1.5 text-xs"
                onClick={() => setIsClipModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <article className="card-base px-3 py-2">
                <p className="text-xs text-[var(--glass-text-tertiary)]">Start</p>
                <p className="mt-1 text-sm font-medium">{formatDuration(selectedClip.startMs)}</p>
              </article>
              <article className="card-base px-3 py-2">
                <p className="text-xs text-[var(--glass-text-tertiary)]">Duration</p>
                <p className="mt-1 text-sm font-medium">{formatDuration(selectedClip.durationMs)}</p>
              </article>
            </div>

            <textarea
              className="glass-input min-h-28"
              value={selectedClipNote}
              onChange={(event) =>
                setClipNotes((previous) => ({
                  ...previous,
                  [selectedClip.id]: event.target.value,
                }))
              }
              placeholder="Director notes, transitions, keyframes..."
            />

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsClipModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsClipModalOpen(false)
                  setEditorNotice(`Clip note saved for "${selectedClip.title}" (UI shell).`)
                }}
              >
                Apply Note
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
