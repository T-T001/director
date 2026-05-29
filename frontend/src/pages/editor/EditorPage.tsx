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
  { id: 'clip-1', title: '开场大全景', durationMs: 5600, startMs: 0, lane: 'video', status: 'ready' },
  { id: 'clip-2', title: '对白特写', durationMs: 4200, startMs: 5800, lane: 'video', status: 'rendering' },
  { id: 'clip-3', title: '雨幕转场', durationMs: 2600, startMs: 10300, lane: 'video', status: 'draft' },
  { id: 'clip-4', title: '氛围配乐床', durationMs: 12200, startMs: 0, lane: 'audio', status: 'ready' },
  { id: 'clip-5', title: '旁白配音', durationMs: 6200, startMs: 5400, lane: 'audio', status: 'draft' },
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

function statusLabel(status: MockClip['status']) {
  if (status === 'ready') return '就绪'
  if (status === 'rendering') return '渲染中'
  return '草稿'
}

function laneLabel(lane: 'video' | 'audio') {
  return lane === 'video' ? '视频轨' : '音频轨'
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
        ? '自动排轨'
        : action === 'smart-trim'
          ? '智能剪裁'
          : '导出计划'
    setEditorNotice(`已排队：${label}（UI 外壳占位）。`)
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
            <h1 className="text-xl font-semibold">剧集剪辑台</h1>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              剧集 ID：{episodeId} · 多轨时间线、片段编辑与渲染包控制。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/projects">
              <Button variant="secondary">返回项目</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="secondary">工作区总览</Button>
            </Link>
            <Button type="button" onClick={() => handleQuickAction('export-plan')}>
              导出成片包
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="metric-card p-4">
            <p className="field-label">Playback</p>
            <p className="mt-2 text-lg font-black">{playing ? '播放中' : '已暂停'}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">Timeline zoom</p>
            <p className="mt-2 text-lg font-black text-[var(--glass-accent-cyan)]">{timelineLabel}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">Ready / render</p>
            <p className="mt-2 text-lg font-black">
              {readyClipCount} / {renderClipCount}
            </p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">Timecode</p>
            <p className="mt-2 text-lg font-black">
              {timeLabel} / {totalDurationLabel}
            </p>
          </article>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPlaying(!playing)}>
            {playing ? '暂停' : '播放'}
          </Button>
          <Button variant="secondary" onClick={() => setCurrentTimeMs(Math.max(0, currentTimeMs - 1000))}>
            -1 秒
          </Button>
          <Button variant="secondary" onClick={() => setCurrentTimeMs(Math.min(totalDurationMs, currentTimeMs + 1000))}>
            +1 秒
          </Button>
          <Button variant="secondary" onClick={() => setZoom(Math.max(0.5, Number((zoom - 0.1).toFixed(1))))}>
            缩小
          </Button>
          <Button variant="secondary" onClick={() => setZoom(Math.min(3, Number((zoom + 0.1).toFixed(1))))}>
            放大
          </Button>
          <Button variant="secondary" onClick={() => handleQuickAction('auto-arrange')}>
            自动排轨
          </Button>
          <Button variant="secondary" onClick={() => handleQuickAction('smart-trim')}>
            智能剪裁
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
          进度：{progress}%（{timeLabel} / {totalDurationLabel}）
        </p>
      </SectionCard>

      {editorNotice ? <SectionCard className="glass-warning rounded-2xl p-4 text-sm">{editorNotice}</SectionCard> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <SectionCard className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">多轨时间线</h2>
            <div className="flex flex-wrap gap-2">
              <input
                className="glass-input w-44"
                value={clipSearch}
                onChange={(event) => setClipSearch(event.target.value)}
                placeholder="搜索片段"
              />
              <select className="glass-input w-32" value={laneFilter} onChange={(event) => setLaneFilter(event.target.value as 'all' | 'video' | 'audio')}>
                <option value="all">全部轨道</option>
                <option value="video">视频轨</option>
                <option value="audio">音频轨</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--glass-stroke-base)] bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
                <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">{laneLabel(lane)}</p>
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
                            ? 'border-amber-200/30 bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-stone-950 shadow-[0_10px_24px_rgba(255,179,71,0.22)]'
                            : 'border-[var(--glass-stroke-base)] bg-white/[0.06] text-[var(--glass-text-secondary)] hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/10',
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
                    {statusLabel(clip.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">
                  {laneLabel(clip.lane)} · 起始 {formatDuration(clip.startMs)} · 时长 {formatDuration(clip.durationMs)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={() => handleOpenClipModal(clip.id)}>
                    编辑片段
                  </button>
                  <button type="button" className="glass-btn-base glass-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={() => setCurrentTimeMs(clip.startMs)}>
                    跳转
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="h-fit xl:sticky xl:top-24">
          <h2 className="text-base font-semibold">属性检查器</h2>
          {selectedClip ? (
            <div className="mt-3 grid gap-2 text-sm">
              <article className="card-base px-3 py-2">
                <p className="text-xs text-[var(--glass-text-tertiary)]">片段</p>
                <p className="mt-1 font-medium">{selectedClip.title}</p>
              </article>
              <article className="card-base px-3 py-2">
                <p className="text-xs text-[var(--glass-text-tertiary)]">轨道 / 状态</p>
                <p className="mt-1 font-medium">
                  {laneLabel(selectedClip.lane)} · {statusLabel(selectedClip.status)}
                </p>
              </article>
              <article className="card-base px-3 py-2">
                <p className="text-xs text-[var(--glass-text-tertiary)]">时间</p>
                <p className="mt-1 font-medium">
                  {formatDuration(selectedClip.startMs)}
                  {' → '}
                  {formatDuration(selectedClip.startMs + selectedClip.durationMs)}
                </p>
              </article>
              <div className="mt-1 grid gap-2">
                <Button type="button" onClick={() => setIsClipModalOpen(true)} block>
                  打开片段详情
                </Button>
                <Button type="button" variant="secondary" onClick={() => setCurrentTimeMs(selectedClip.startMs)} block>
                  跳转到片段
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--glass-text-tertiary)]">尚未选中任何片段。</p>
          )}
        </SectionCard>
      </div>

      <Link
        to="/projects"
        className="page-command fixed bottom-6 right-6 z-40 px-6 py-3 text-sm font-black text-[var(--glass-text-primary)] transition hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/10"
      >
        返回项目中心
      </Link>

      {isClipModalOpen && selectedClip ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button type="button" className="glass-overlay absolute inset-0" onClick={() => setIsClipModalOpen(false)} />
          <section className="glass-surface-elevated relative z-10 grid w-full max-w-xl gap-4 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">片段编辑</h3>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">{selectedClip.title}</p>
              </div>
              <button
                type="button"
                className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-1.5 text-xs"
                onClick={() => setIsClipModalOpen(false)}
              >
                关闭
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <article className="card-base px-3 py-2">
                <p className="text-xs text-[var(--glass-text-tertiary)]">起始</p>
                <p className="mt-1 text-sm font-medium">{formatDuration(selectedClip.startMs)}</p>
              </article>
              <article className="card-base px-3 py-2">
                <p className="text-xs text-[var(--glass-text-tertiary)]">时长</p>
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
              placeholder="导演笔记、转场、关键帧..."
            />

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsClipModalOpen(false)}>
                取消
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsClipModalOpen(false)
                  setEditorNotice(`已为「${selectedClip.title}」保存笔记（UI 外壳）。`)
                }}
              >
                应用笔记
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
