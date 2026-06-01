import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles, Wand2, Users, MapPin, MessageSquare, Mic2, Activity,
  Loader2, ArrowLeft, ChevronRight, FolderHeart, Tag, Clapperboard, Gauge, BookOpen,
  Flame, Quote, Layers,
} from 'lucide-react'

import type { NPTaskQueued, NovelIntakeAnalysis, NovelIntakePreview } from '../../../types/novel-promotion'
import { type SplitEpisode } from '../../../lib/episode-marker-detector'
import { countWords } from '../../../lib/word-count'
import { getTaskDetail } from '../../../services/api/tasks'

const RATIOS = [
  { value: '9:16', label: '9:16 · 竖屏短视频', tag: '推荐' },
  { value: '16:9', label: '16:9 · 横屏院线', tag: '' },
  { value: '1:1', label: '1:1 · 方形社媒', tag: '' },
  { value: '4:3', label: '4:3 · 复古剧集', tag: '' },
]

const STYLES = [
  { value: 'anime-realism', label: '电影级二次元写实', tag: '推荐' },
  { value: 'comic', label: '美式漫画', tag: '' },
  { value: 'ink-wash', label: '水墨国风', tag: '' },
  { value: 'cyberpunk', label: '赛博朋克', tag: '' },
  { value: 'oil-painting', label: '油画质感', tag: '' },
]

const ANALYZING_MESSAGES = [
  '任务已创建，等待后端开始分析...',
  '正在连接分析模型...',
  '正在整理正文并构建提示词...',
]

const TASK_STAGE_LABEL: Record<string, string> = {
  queued: '任务已排队',
  created: '任务已创建',
  started: '任务已开始执行',
  running: '任务执行中',
  'resolve-model': '正在解析模型配置',
  'prepare-input': '正在整理正文内容',
  'llm-call': '正在调用分析模型',
  'parse-output': '正在解析模型结果',
  'normalize-preview': '正在整理分析结果',
  completed: '分析完成',
  failed: '分析失败',
  canceled: '任务已取消',
}

type ViewState = 'input' | 'analyzing' | 'results'
type SplitMode = 'markers' | 'wordcount' | 'single'

type AnalyzeTaskProgress = {
  taskId: string | null
  progress: number
  stage: string
  message: string
  status: string
}

export type IntakeSubmitProgress = {
  stage: 'create' | 'analyze' | 'screenplay'
  current: number
  total: number
}

const SUBMIT_STAGE_LABEL: Record<IntakeSubmitProgress['stage'], string> = {
  create: '创建剧集',
  analyze: 'AI 分析剧情',
  screenplay: '生成剧本',
}

type Props = {
  projectName: string
  hasEpisodes: boolean
  episodeCount: number
  enableNarration: boolean
  onEnableNarrationChange: (value: boolean) => void
  onAnalyzePreview: (payload: { content: string }) => Promise<NPTaskQueued>
  onCreateEpisodes: (
    episodes: SplitEpisode[],
  ) => Promise<{ created: number; failed: number; analyzeFailed: number; screenplayFailed: number }>
  onOpenAssetHub: () => void
  submitProgress: IntakeSubmitProgress | null
}

export function NovelIntakeStage({
  projectName,
  hasEpisodes,
  episodeCount,
  enableNarration,
  onEnableNarrationChange,
  onAnalyzePreview,
  onCreateEpisodes,
  onOpenAssetHub,
  submitProgress,
}: Props) {
  const [view, setView] = useState<ViewState>('input')
  const [novelText, setNovelText] = useState('')
  const [ratio, setRatio] = useState('9:16')
  const [artStyle, setArtStyle] = useState('anime-realism')
  const [analysis, setAnalysis] = useState<NovelIntakeAnalysis | null>(null)
  const [splitEpisodes, setSplitEpisodes] = useState<SplitEpisode[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('markers')
  const [analyzeTask, setAnalyzeTask] = useState<AnalyzeTaskProgress>({
    taskId: null,
    progress: 0,
    stage: 'queued',
    message: ANALYZING_MESSAGES[0],
    status: 'idle',
  })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const wordCount = useMemo(() => countWords(novelText), [novelText])
  const charCount = novelText.length

  const ratioLabel = RATIOS.find((r) => r.value === ratio)?.label ?? ratio
  const styleLabel = STYLES.find((s) => s.value === artStyle)?.label ?? artStyle

  useEffect(() => {
    if (view !== 'analyzing' || analyzeTask.progress > 0 || analyzeTask.status === 'failed') return undefined
    const timer = window.setInterval(() => {
      setAnalyzeTask((current) => {
        if (current.progress > 0 || current.status === 'failed') return current
        const currentIndex = ANALYZING_MESSAGES.indexOf(current.message)
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % ANALYZING_MESSAGES.length : 0
        return { ...current, message: ANALYZING_MESSAGES[nextIndex] }
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [analyzeTask.progress, analyzeTask.message, analyzeTask.status, view])

  const handleStart = async () => {
    const trimmed = novelText.trim()
    if (!trimmed) {
      setError('请先粘贴或输入正文内容。')
      return
    }
    if (trimmed.length < 80) {
      setError('正文过短（至少 80 字），请补充更多内容后再开始分析。')
      return
    }

    setError(null)
    setFeedback(null)
    setView('analyzing')
    setAnalyzeTask({
      taskId: null,
      progress: 0,
      stage: 'queued',
      message: ANALYZING_MESSAGES[0],
      status: 'queued',
    })

    try {
      const queued = await onAnalyzePreview({ content: trimmed })
      const taskId = queued.task_id
      setAnalyzeTask({
        taskId,
        progress: 0,
        stage: queued.status || 'queued',
        message: TASK_STAGE_LABEL[queued.status || 'queued'] || ANALYZING_MESSAGES[0],
        status: queued.status || 'queued',
      })

      for (;;) {
        const detail = await getTaskDetail(taskId, true)
        const task = detail.task
        const events = detail.events ?? []
        const lastEvent = events[events.length - 1]?.payload_json
        const stage = typeof lastEvent?.stage === 'string' ? lastEvent.stage : task.status
        const message = typeof lastEvent?.message === 'string' && lastEvent.message.trim()
          ? lastEvent.message.trim()
          : (TASK_STAGE_LABEL[stage] || TASK_STAGE_LABEL[task.status] || '正在分析中')
        const progress = typeof lastEvent?.progress === 'number'
          ? lastEvent.progress
          : task.progress

        setAnalyzeTask({
          taskId,
          progress: Math.max(0, Math.min(100, progress || 0)),
          stage,
          message,
          status: task.status,
        })

        if (task.status === 'completed') {
          const preview = task.result_json as NovelIntakePreview | null
          if (!preview?.analysis || !Array.isArray(preview.split_episodes)) {
            throw new Error('分析任务已完成，但未返回预览结果。')
          }
          setAnalysis(preview.analysis)
          setSplitEpisodes(preview.split_episodes)
          setSplitMode(preview.split_episodes.length > 1 ? 'markers' : 'single')
          setView('results')
          return
        }

        if (task.status === 'failed' || task.status === 'canceled') {
          const failureMessage = task.error_message || (task.status === 'canceled' ? '分析任务已取消。' : '智能分析失败。')
          setAnalyzeTask((current) => ({
            ...current,
            stage: task.status,
            message: failureMessage,
            status: task.status,
          }))
          setError(failureMessage)
          return
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1200))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '智能分析失败。'
      setAnalyzeTask((current) => ({
        ...current,
        stage: 'failed',
        message,
        status: 'failed',
      }))
      setError(message)
    }
  }

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode)
  }

  const handleConfirm = async () => {
    if (splitEpisodes.length === 0) {
      setError('没有可创建的剧集。')
      return
    }
    setError(null)
    try {
      const result = await onCreateEpisodes(splitEpisodes)
      if (result.failed > 0) {
        setError(`成功 ${result.created} 集，失败 ${result.failed} 集`)
        return
      }
      const warnings: string[] = []
      if (result.analyzeFailed > 0) warnings.push(`${result.analyzeFailed} 集分析失败`)
      if (result.screenplayFailed > 0) warnings.push(`${result.screenplayFailed} 集剧本生成失败`)
      const suffix = warnings.length ? `（${warnings.join('，')}，可在「剧本」阶段重试）` : ''
      setFeedback(`已成功创建 ${result.created} 集并完成智能分析${suffix}。`)
      setNovelText('')
      setAnalysis(null)
      setSplitEpisodes([])
      setView('input')
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败。')
    }
  }

  const handleReset = () => {
    setView('input')
    setAnalysis(null)
    setSplitEpisodes([])
    setAnalyzeTask({
      taskId: null,
      progress: 0,
      stage: 'queued',
      message: ANALYZING_MESSAGES[0],
      status: 'idle',
    })
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {view === 'input' && (
        <InputView
          projectName={projectName}
          hasEpisodes={hasEpisodes}
          episodeCount={episodeCount}
          novelText={novelText}
          onChangeNovelText={setNovelText}
          ratio={ratio}
          onChangeRatio={setRatio}
          artStyle={artStyle}
          onChangeArtStyle={setArtStyle}
          enableNarration={enableNarration}
          onEnableNarrationChange={onEnableNarrationChange}
          charCount={charCount}
          wordCount={wordCount}
          ratioLabel={ratioLabel}
          styleLabel={styleLabel}
          onStart={() => void handleStart()}
          onOpenAssetHub={onOpenAssetHub}
          error={error}
          feedback={feedback}
        />
      )}

      {view === 'analyzing' && (
        <AnalyzingView
          taskId={analyzeTask.taskId}
          progress={analyzeTask.progress}
          stage={analyzeTask.stage}
          message={analyzeTask.message}
          status={analyzeTask.status}
          wordCount={wordCount}
          onBack={handleReset}
        />
      )}

      {view === 'results' && analysis && (
        <ResultsView
          analysis={analysis}
          splitMode={splitMode}
          onSplitModeChange={handleSplitModeChange}
          splitEpisodes={splitEpisodes}
          onConfirm={() => void handleConfirm()}
          onBack={handleReset}
          submitProgress={submitProgress}
          ratioLabel={ratioLabel}
          styleLabel={styleLabel}
          enableNarration={enableNarration}
          error={error}
        />
      )}
    </div>
  )
}

function InputView(props: {
  projectName: string
  hasEpisodes: boolean
  episodeCount: number
  novelText: string
  onChangeNovelText: (v: string) => void
  ratio: string
  onChangeRatio: (v: string) => void
  artStyle: string
  onChangeArtStyle: (v: string) => void
  enableNarration: boolean
  onEnableNarrationChange: (v: boolean) => void
  charCount: number
  wordCount: number
  ratioLabel: string
  styleLabel: string
  onStart: () => void
  onOpenAssetHub: () => void
  error: string | null
  feedback: string | null
}) {
  return (
    <div className="grid gap-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-stroke-base)] bg-white/[0.07] px-3 py-1 text-xs text-[var(--glass-text-secondary)] shadow-[var(--glass-shadow-sm)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--glass-accent-from)]" />
          {props.hasEpisodes ? `「${props.projectName}」· 共 ${props.episodeCount} 集` : `新项目：${props.projectName}`}
        </div>
        <h1 className="mt-3 text-[28px] font-bold leading-tight text-[var(--glass-text-primary)]">
          粘贴小说正文，<span className="bg-gradient-to-r from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] bg-clip-text text-transparent">AI 为你拆解整个剧本</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--glass-text-secondary)]">
          识别角色与对白 · 提取场景切换 · 分析情绪曲线 · 自动拆集 —— 一步到位
        </p>
      </div>

      <div className="glass-surface-elevated overflow-hidden rounded-3xl">
        <div className="relative px-6 pb-0 pt-5">
          <div className="mb-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[var(--glass-text-tertiary)]">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--glass-accent-from)]" />
              实时识别模型已就绪
            </div>
            <span className="glass-chip">
              <Gauge className="h-3 w-3" />
              字数 {props.wordCount.toLocaleString()} · 字符 {props.charCount.toLocaleString()}
            </span>
          </div>

          <textarea
            value={props.novelText}
            onChange={(e) => props.onChangeNovelText(e.target.value)}
            placeholder={`请输入您的剧本或小说内容...\n\n• 自动识别章节（第X集 / 第X章 / Episode X）\n• 识别角色、对白与场景\n• 分析情绪与节奏，生成制作骨架\n\n示例：\n清晨，阳光透过窗帘洒进房间。小明揉着惺忪的睡眼从床上坐起，看了一眼床头的闹钟——已经八点了！他猛地跳下床，手忙脚乱地开始穿衣服......`}
            className="glass-input min-h-[340px] resize-none text-[15px] leading-relaxed"
          />

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[var(--glass-bg-muted)]/70 via-[var(--glass-bg-surface)]/28 to-transparent" />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-muted)]/70 px-6 py-3.5 backdrop-blur-xl">
          <SelectField label="比例" value={props.ratio} onChange={props.onChangeRatio} options={RATIOS} />
          <SelectField label="画风" value={props.artStyle} onChange={props.onChangeArtStyle} options={STYLES} />

          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--glass-text-secondary)]">
            <span className="flex items-center gap-1"><Mic2 className="h-3 w-3" />旁白</span>
            <button
              type="button"
              onClick={() => props.onEnableNarrationChange(!props.enableNarration)}
              aria-pressed={props.enableNarration}
              className={[
                'relative h-5 w-9 rounded-full transition-colors',
                props.enableNarration ? 'bg-[var(--glass-accent-from)]' : 'bg-[var(--glass-stroke-base)]',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  props.enableNarration ? 'left-4' : 'left-0.5',
                ].join(' ')}
              />
            </button>
          </label>

          <button
            type="button"
            onClick={props.onStart}
            disabled={!props.novelText.trim()}
            className="glass-btn-base glass-btn-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold shadow-[0_10px_30px_-12px_rgba(47,123,255,0.7)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> 开始智能分析
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-[var(--glass-stroke-soft)] bg-gradient-to-r from-[var(--glass-bg-muted)]/80 to-[var(--glass-bg-surface)]/50 px-6 py-2.5 text-center">
          <p className="text-[11px] text-[var(--glass-text-tertiary)]">
            当前配置 · <strong className="text-[var(--glass-text-secondary)]">{props.ratioLabel}</strong> · <strong className="text-[var(--glass-text-secondary)]">{props.styleLabel}</strong>
          </p>
        </div>

        {props.feedback ? (
          <div className="border-t border-[var(--glass-stroke-soft)] bg-[var(--glass-tone-success-bg)]/40 px-6 py-2.5 text-xs text-[var(--glass-tone-success-fg)]">
            ✓ {props.feedback}
          </div>
        ) : null}
        {props.error ? (
          <div className="border-t border-[var(--glass-stroke-soft)] bg-[var(--glass-tone-danger-bg)]/50 px-6 py-2.5 text-xs text-[var(--glass-tone-danger-fg)]">
            {props.error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <CapabilityCard icon={Users} title="角色识别" desc="提取发言者、对白与出场频次" tone="from-[var(--glass-tone-info-bg)]" />
        <CapabilityCard icon={MapPin} title="场景解析" desc="识别地点切换与时空推进" tone="from-[var(--glass-tone-warning-bg)]" />
        <CapabilityCard icon={Flame} title="情绪与节奏" desc="自动评估情绪曲线与画面节奏" tone="from-[var(--glass-tone-success-bg)]" />
      </div>

      <button
        type="button"
        onClick={props.onOpenAssetHub}
        className="glass-surface group flex items-center gap-3 rounded-2xl px-5 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow-md)]"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--glass-tone-info-bg)] to-white text-[var(--glass-tone-info-fg)]">
          <FolderHeart className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--glass-text-primary)]">提前准备全局资产</p>
          <p className="text-xs text-[var(--glass-text-tertiary)]">在资产中心提前建立角色 / 场景，分析结果会自动关联。</p>
        </div>
        <ChevronRight className="h-4 w-4 text-[var(--glass-text-tertiary)] transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  )
}

function SelectField(props: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string; tag?: string }> }) {
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState({ left: 0, top: 0, width: 220 })
  const rootRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const current = props.options.find((option) => option.value === props.value) ?? props.options[0]

  const syncMenuPosition = () => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.max(220, rect.width + 28)
    const left = Math.min(Math.max(12, rect.left + 28), window.innerWidth - width - 12)
    setMenuRect({ left, top: rect.bottom + 8, width })
  }

  useEffect(() => {
    if (!open) return
    syncMenuPosition()

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const handleViewportChange = () => syncMenuPosition()

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [open])

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          role="listbox"
          className="fixed z-[9999] overflow-hidden rounded-2xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)]/95 p-1.5 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
          style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
        >
          <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          {props.options.map((option) => {
            const selected = option.value === props.value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  props.onChange(option.value)
                  setOpen(false)
                }}
                className={[
                  'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition-all',
                  selected
                    ? 'bg-gradient-to-r from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-stone-950 shadow-[var(--glass-shadow-sm)]'
                    : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-text-primary)]',
                ].join(' ')}
              >
                <span className="truncate font-semibold">{option.label}</span>
                {option.tag ? (
                  <span className={['rounded-full px-1.5 py-0.5 text-[10px] font-black', selected ? 'bg-stone-950/12 text-stone-950' : 'glass-chip'].join(' ')}>
                    {option.tag}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>,
        document.body,
      )
    : null

  return (
    <div ref={rootRef} className="relative flex items-center gap-1.5 text-xs text-[var(--glass-text-tertiary)]">
      <span>{props.label}</span>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          'group inline-flex min-w-[154px] items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-left text-xs font-semibold transition-all',
          open
            ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.45)]'
            : 'border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)]/72 text-[var(--glass-text-primary)] hover:border-[var(--glass-stroke-strong)] hover:bg-[var(--glass-bg-surface-strong)]',
        ].join(' ')}
      >
        <span className="truncate">{current?.label ?? props.value}</span>
        <ChevronRight className={['h-3.5 w-3.5 transition-transform', open ? 'rotate-90' : ''].join(' ')} />
      </button>
      {menu}
    </div>
  )
}

function CapabilityCard({ icon: Icon, title, desc, tone }: { icon: typeof Users; title: string; desc: string; tone: string }) {
  return (
    <div className="glass-surface rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tone} to-white text-[var(--glass-text-secondary)]`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--glass-text-primary)]">{title}</p>
          <p className="mt-0.5 text-xs text-[var(--glass-text-tertiary)]">{desc}</p>
        </div>
      </div>
    </div>
  )
}

function AnalyzingView(props: {
  taskId: string | null
  progress: number
  stage: string
  message: string
  status: string
  wordCount: number
  onBack: () => void
}) {
  const taskSuffix = props.taskId ? props.taskId.slice(-6) : null
  const isFailed = props.status === 'failed' || props.status === 'canceled'
  const stageLabel = TASK_STAGE_LABEL[props.stage] || TASK_STAGE_LABEL[props.status] || '正在分析中'

  return (
    <div className="glass-surface-elevated rounded-3xl p-10">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="relative h-24 w-24">
          {!isFailed ? <div className="absolute inset-0 animate-ping rounded-full bg-[var(--glass-accent-from)]/20" /> : null}
          <div className={[
            'absolute inset-2 rounded-full shadow-[var(--glass-shadow-lg)]',
            isFailed
              ? 'bg-gradient-to-br from-[var(--glass-tone-danger-bg)] to-[var(--glass-tone-danger-fg)]'
              : 'bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)]',
          ].join(' ')} />
          <div className="absolute inset-0 flex items-center justify-center text-white">
            {isFailed ? <Wand2 className="h-10 w-10" /> : <Sparkles className="h-10 w-10 animate-spin-slow" />}
          </div>
        </div>

        <h2 className="mt-6 text-xl font-bold text-[var(--glass-text-primary)]">
          {isFailed ? '智能分析未完成' : '正在智能分析中'}
        </h2>
        <p className="mt-1 text-sm text-[var(--glass-text-secondary)]">
          分析约 {props.wordCount.toLocaleString()} 字内容 · {stageLabel}
        </p>

        <div className="mt-5 w-full">
          <div className="flex items-center justify-between text-xs text-[var(--glass-text-secondary)]">
            <span>{stageLabel}</span>
            <span>{props.progress}%</span>
          </div>
          <div className="mt-2 overflow-hidden rounded-full bg-[var(--glass-bg-muted)]">
            <div
              className={[
                'h-2 rounded-full transition-all duration-500',
                isFailed
                  ? 'bg-[var(--glass-tone-danger-fg)]'
                  : 'bg-gradient-to-r from-[var(--glass-accent-from)] to-[var(--glass-accent-to)]',
              ].join(' ')}
              style={{ width: `${Math.max(0, props.progress)}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[var(--glass-stroke-soft)] bg-white/[0.03] px-4 py-3 text-xs text-[var(--glass-text-secondary)]">
          {!isFailed ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          <span>{props.message}</span>
          {taskSuffix ? <span className="glass-chip text-[10px]">任务 #{taskSuffix}</span> : null}
        </div>

        {isFailed ? (
          <button
            type="button"
            onClick={props.onBack}
            className="glass-btn-base glass-btn-ghost mt-5 inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 返回编辑
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ResultsView(props: {
  analysis: NovelIntakeAnalysis
  splitMode: SplitMode
  onSplitModeChange: (mode: SplitMode) => void
  splitEpisodes: SplitEpisode[]
  onConfirm: () => void
  onBack: () => void
  submitProgress: IntakeSubmitProgress | null
  ratioLabel: string
  styleLabel: string
  enableNarration: boolean
  error: string | null
}) {
  const { analysis, splitEpisodes, splitMode, onSplitModeChange } = props
  const sentimentPercent = Math.round(((analysis.sentimentScore + 1) / 2) * 100)
  const totalDialogueRatio = Math.round(analysis.dialogue.ratioOfTotalText * 100)
  const paceLabel = analysis.pace === 'fast' ? '紧凑快节奏' : analysis.pace === 'steady' ? '沉稳平衡' : '舒缓从容'
  const submitting = props.submitProgress !== null
  const submitStageLabel = props.submitProgress ? SUBMIT_STAGE_LABEL[props.submitProgress.stage] : ''

  return (
    <div className="grid gap-5">
      <div className="glass-surface-elevated overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--glass-stroke-soft)] bg-gradient-to-br from-[var(--glass-bg-muted)] to-white/[0.04] px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-xs text-[var(--glass-text-secondary)] shadow-[var(--glass-shadow-sm)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--glass-accent-from)]" /> 分析完成
            </div>
            <h1 className="mt-2.5 text-2xl font-bold text-[var(--glass-text-primary)]">AI 已完成剧本拆解</h1>
            <p className="mt-1 text-sm text-[var(--glass-text-secondary)]">
              已识别到 {analysis.characters.length} 位角色、{analysis.scenes.length} 个场景切换，共计 {analysis.dialogue.totalLines} 条对白，推断为 <strong className="text-[var(--glass-text-primary)]">{analysis.genre}</strong> 题材。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={props.onBack}
              disabled={submitting}
              className="glass-btn-base glass-btn-ghost inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> 返回编辑
            </button>
            <button
              type="button"
              onClick={props.onConfirm}
              disabled={submitting || splitEpisodes.length === 0}
              className="glass-btn-base glass-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-[0_10px_30px_-12px_rgba(47,123,255,0.7)] disabled:opacity-50"
            >
              {submitting && props.submitProgress ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{submitStageLabel} {props.submitProgress.current}/{props.submitProgress.total}</>
              ) : (
                <><Clapperboard className="h-4 w-4" />确认并创建 {splitEpisodes.length} 集</>
              )}
            </button>
          </div>
        </div>

        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={BookOpen} label="总字数" value={analysis.totalWords.toLocaleString()} sub={`${analysis.paragraphCount} 段 · ${analysis.sentenceCount} 句`} tone="from-[#48d1cc]" />
          <StatCard icon={Users} label="角色" value={analysis.characters.length.toString()} sub={`主角：${analysis.characters[0]?.name ?? '—'}`} tone="from-[#a871ff]" />
          <StatCard icon={MapPin} label="场景切换" value={analysis.scenes.length.toString()} sub={analysis.scenes[0]?.location ? `首场：${analysis.scenes[0].location}` : '未识别'} tone="from-[#ffb347]" />
          <StatCard icon={MessageSquare} label="对白条数" value={analysis.dialogue.totalLines.toString()} sub={`约占正文 ${totalDialogueRatio}%`} tone="from-[#4fd18f]" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-surface-elevated rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--glass-tone-info-fg)]" />
            <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">主要角色</h3>
            <span className="ml-auto glass-chip text-[10px]">按出场频次排序</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {analysis.characters.length === 0 ? (
              <EmptyHint text="未识别到明确角色，请在拆集后手动补充。" />
            ) : (
              analysis.characters.slice(0, 6).map((ch, idx) => (
                <div key={ch.name} className="card-base rounded-2xl p-3">
                  <div className="flex items-center gap-3">
                    <span className={[
                      'inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-[var(--glass-shadow-sm)]',
                      idx === 0 ? 'bg-gradient-to-br from-rose-400 to-pink-500'
                        : idx === 1 ? 'bg-gradient-to-br from-violet-400 to-fuchsia-500'
                        : idx === 2 ? 'bg-gradient-to-br from-sky-400 to-cyan-500'
                        : idx === 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                        : 'bg-gradient-to-br from-emerald-400 to-teal-500',
                    ].join(' ')}>
                      {ch.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--glass-text-primary)]">{ch.name}</p>
                        {idx === 0 ? <span className="rounded-full bg-[var(--glass-tone-warning-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--glass-tone-warning-fg)]">主角</span> : null}
                      </div>
                      <p className="text-[11px] text-[var(--glass-text-tertiary)]">发言 {ch.lineCount} 次 · 首出 {Math.round(ch.firstAppearanceRatio * 100)}%</p>
                    </div>
                  </div>
                  {ch.sampleQuote ? (
                    <p className="mt-2.5 line-clamp-2 rounded-lg bg-[var(--glass-bg-muted)] px-2.5 py-1.5 text-[11px] text-[var(--glass-text-secondary)]">
                      <Quote className="mr-1 inline h-2.5 w-2.5 text-[var(--glass-text-tertiary)]" />
                      {ch.sampleQuote}
                    </p>
                  ) : (
                    <p className="mt-2.5 rounded-lg bg-[var(--glass-bg-muted)] px-2.5 py-1.5 text-[11px] text-[var(--glass-text-tertiary)]">通过动作/称谓识别</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="glass-surface-elevated rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--glass-tone-success-fg)]" />
              <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">情绪与节奏</h3>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--glass-text-tertiary)]">情绪倾向</span>
                  <span className="font-semibold text-[var(--glass-text-primary)]">
                    {analysis.sentimentScore > 0.15 ? '偏积极' : analysis.sentimentScore < -0.15 ? '偏沉重' : '中性'}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--glass-bg-muted)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 transition-all"
                    style={{ width: `${sentimentPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--glass-bg-muted)] px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 text-[var(--glass-text-tertiary)]"><Gauge className="h-3 w-3" />画面节奏</span>
                <span className="font-semibold text-[var(--glass-text-primary)]">{paceLabel}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {analysis.emotions.length === 0 ? (
                  <span className="text-[11px] text-[var(--glass-text-tertiary)]">暂无明显情绪信号</span>
                ) : (
                  analysis.emotions.map((emotion) => (
                    <span
                      key={emotion.key}
                      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[var(--glass-tone-info-bg)] to-white px-2 py-0.5 text-[11px] font-medium text-[var(--glass-tone-info-fg)]"
                    >
                      {emotion.label} · {emotion.count}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="glass-surface-elevated rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-[var(--glass-tone-warning-fg)]" />
              <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">关键词云</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {analysis.keywords.length === 0 ? (
                <span className="text-[11px] text-[var(--glass-text-tertiary)]">未提取到高频词</span>
              ) : (
                analysis.keywords.slice(0, 10).map((kw, idx) => (
                  <span
                    key={kw.word}
                    className="glass-chip text-[11px]"
                    style={{ fontSize: `${11 + Math.min(3, Math.floor(kw.frequency / 3))}px`, opacity: 1 - idx * 0.04 }}
                  >
                    {kw.word}
                    <span className="text-[var(--glass-text-tertiary)]">·{kw.frequency}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-surface-elevated rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[var(--glass-tone-warning-fg)]" />
          <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">场景切换时间线</h3>
          <span className="ml-auto text-[11px] text-[var(--glass-text-tertiary)]">按在全文中的相对位置排序</span>
        </div>

        {analysis.scenes.length === 0 ? (
          <div className="mt-4"><EmptyHint text="未能识别到场景切换，可在「素材」阶段手动标注。" /></div>
        ) : (
          <div className="mt-4 grid gap-3">
            <div className="relative h-2 overflow-hidden rounded-full bg-[var(--glass-bg-muted)]">
              {analysis.scenes.map((scene) => (
                <span
                  key={scene.index}
                  className="absolute top-0 h-full w-2 rounded-full bg-gradient-to-b from-[var(--glass-accent-from)] to-[var(--glass-accent-to)]"
                  style={{ left: `${Math.min(98, scene.positionRatio * 100)}%` }}
                  title={scene.location}
                />
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {analysis.scenes.map((scene) => (
                <div key={scene.index} className="card-base flex items-start gap-2 rounded-xl p-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-[10px] font-bold text-white">
                    {scene.index}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--glass-text-primary)]">{scene.location}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--glass-text-tertiary)]">{scene.preview}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass-surface-elevated rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--glass-accent-from)]" />
          <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">剧集拆分方案</h3>
          <span className="ml-auto text-[11px] text-[var(--glass-text-tertiary)]">共 {splitEpisodes.length} 集 · 总 {splitEpisodes.reduce((s, e) => s + e.wordCount, 0).toLocaleString()} 字</span>
        </div>

        <div className="mt-3 inline-flex flex-wrap gap-1 rounded-xl bg-[var(--glass-bg-muted)] p-1">
          <SplitModeButton label="按章节标记" active={splitMode === 'markers'} onClick={() => onSplitModeChange('markers')} />
          <SplitModeButton label="按字数均分" active={splitMode === 'wordcount'} onClick={() => onSplitModeChange('wordcount')} />
          <SplitModeButton label="单集一整集" active={splitMode === 'single'} onClick={() => onSplitModeChange('single')} />
        </div>

        <div className="mt-4 space-y-2">
          {splitEpisodes.length === 0 ? (
            <EmptyHint text="当前方案下未能生成剧集。" />
          ) : (
            splitEpisodes.slice(0, 8).map((ep) => (
              <div key={ep.number} className="flex items-center gap-3 rounded-xl border border-[var(--glass-stroke-base)] bg-white/[0.07] px-3 py-2">
                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-[11px] font-bold text-white">
                  {ep.number}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--glass-text-primary)]">{ep.title}</p>
                <span className="text-[11px] text-[var(--glass-text-tertiary)]">{ep.wordCount.toLocaleString()} 字</span>
              </div>
            ))
          )}
          {splitEpisodes.length > 8 && (
            <div className="text-center text-[11px] text-[var(--glass-text-tertiary)]">...余下 {splitEpisodes.length - 8} 集未展示</div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetaCard label="画面比例" value={props.ratioLabel} />
        <MetaCard label="画风" value={props.styleLabel} />
        <MetaCard label="旁白" value={props.enableNarration ? '启用' : '关闭'} />
      </div>

      {props.submitProgress ? (
        <div className="glass-surface-elevated rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[var(--glass-text-secondary)]">
            <span>正在{submitStageLabel}...</span>
            <span>{props.submitProgress.current} / {props.submitProgress.total}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--glass-bg-muted)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] transition-all"
              style={{ width: `${Math.round((props.submitProgress.current / Math.max(1, props.submitProgress.total)) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {props.error ? (
        <div className="glass-danger rounded-2xl px-4 py-3 text-sm">{props.error}</div>
      ) : null}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: typeof Users; label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="metric-card relative overflow-hidden p-4">
      <span
        className={`pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-gradient-to-br ${tone} to-transparent opacity-70 blur-2xl`}
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <Icon className="h-4 w-4 text-[var(--glass-text-secondary)]" />
        <span className="text-[10px] uppercase tracking-wide text-[var(--glass-text-tertiary)]">{label}</span>
      </div>
      <p className="relative mt-2 text-2xl font-bold text-[var(--glass-text-primary)]">{value}</p>
      <p className="relative mt-1 line-clamp-1 text-[11px] text-[var(--glass-text-tertiary)]">{sub}</p>
    </div>
  )
}

function SplitModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
        active
          ? 'bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-white shadow-[var(--glass-shadow-sm)]'
              : 'text-[var(--glass-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--glass-text-primary)]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-surface flex items-center justify-between rounded-xl px-4 py-2.5">
      <span className="text-[11px] uppercase tracking-wide text-[var(--glass-text-tertiary)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--glass-text-primary)]">{value}</span>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)]/60 px-4 py-6 text-center text-xs text-[var(--glass-text-tertiary)]">
      {text}
    </div>
  )
}
