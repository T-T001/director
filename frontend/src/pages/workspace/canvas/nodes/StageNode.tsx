import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Check, ChevronDown, ExternalLink, Loader2, Play } from 'lucide-react'

import type { WorkspaceStageSignal } from '../../stage-signals'
import type { CanvasNodeDef } from '../canvas-graph'
import type { StageSummaryRow } from '../useStageSummaries'

export type StageNodeData = {
  def: CanvasNodeDef
  signal: WorkspaceStageSignal
  summaries: StageSummaryRow[]
  actionLabel?: string
  actionBlockedReason?: string | null
  actionBusy?: boolean
  /** 该节点正在运行任务的进度（0-100），无运行任务时为 null */
  progress?: number | null
  /** 节点产出媒体缩略图（资产立绘 / 分镜首图 / 成片封面） */
  thumbnails?: string[]
  /** 可展开的子节点数量与开关（素材→角色卡，分镜→镜头面板） */
  childCount?: number
  childLabel?: string
  expanded?: boolean
  onToggleExpand?: () => void
  pipelineNote?: string
  pipelineError?: string
  isPipelineCurrent?: boolean
  onOpenStage: () => void
  onRunAction?: () => void
}

export type StageNodeType = Node<StageNodeData, 'stageNode'>

const statusText: Record<WorkspaceStageSignal['status'], string> = {
  empty: '待准备',
  active: '制作中',
  processing: '任务中',
  ready: '已就绪',
}

export function StageNode({ data }: NodeProps<StageNodeType>) {
  const { def, signal, summaries } = data
  const Icon = def.icon
  const isReady = signal.status === 'ready'
  const isProcessing = signal.status === 'processing' || data.actionBusy
  const isActive = signal.status === 'active'

  return (
    <div
      className={[
        'relative w-[268px] overflow-hidden rounded-2xl border p-4 backdrop-blur-xl transition-all',
        data.isPipelineCurrent || isProcessing
          ? 'animate-capsule-glow border-[var(--glass-accent-from)]/40 bg-[rgba(25,22,14,0.92)]'
          : data.pipelineError
            ? 'border-[var(--glass-tone-danger-fg)]/45 bg-[var(--glass-tone-danger-bg)]'
            : isReady
              ? 'border-[var(--glass-tone-success-fg)]/30 bg-[rgba(14,22,18,0.9)]'
              : 'border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)]',
        'shadow-[var(--glass-shadow-md)]',
      ].join(' ')}
    >
      <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="flex items-center gap-2.5">
        <span
          className={[
            'inline-flex h-9 w-9 items-center justify-center rounded-xl border',
            isProcessing
              ? 'border-[var(--glass-accent-from)]/30 bg-[var(--glass-accent-from)] text-stone-950'
              : isReady
                ? 'border-[var(--glass-tone-success-fg)]/30 bg-[var(--glass-tone-success-fg)] text-stone-950'
                : isActive
                  ? 'border-amber-200/30 bg-gradient-to-br from-amber-300 to-orange-500 text-stone-950'
                  : 'border-[var(--glass-stroke-base)] bg-black/25 text-[var(--glass-text-tertiary)]',
          ].join(' ')}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={3} />
          ) : isReady ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : (
            <Icon className="h-4 w-4" strokeWidth={2.4} />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-wide text-[var(--glass-text-primary)]">{def.label}</p>
          <span
            className={[
              'mt-0.5 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-black tracking-[0.1em]',
              isProcessing
                ? 'border-[var(--glass-accent-from)]/24 bg-black/18 text-[var(--glass-accent-from)]'
                : isReady
                  ? 'border-[var(--glass-tone-success-fg)]/24 bg-black/18 text-[var(--glass-tone-success-fg)]'
                  : 'border-[var(--glass-stroke-soft)] bg-black/16 text-[var(--glass-text-tertiary)]',
            ].join(' ')}
          >
            {isProcessing ? '任务中' : statusText[signal.status]}
          </span>
        </div>
      </div>

      <p className="mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--glass-text-tertiary)]" title={signal.detail}>
        {signal.detail}
      </p>

      {data.thumbnails && data.thumbnails.length > 0 ? (
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          {data.thumbnails.map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt=""
              loading="lazy"
              className="aspect-square w-full rounded-lg border border-[var(--glass-stroke-soft)] bg-black/30 object-cover"
            />
          ))}
        </div>
      ) : null}

      {summaries.length > 0 ? (
        <div className="mt-2.5 grid gap-1.5 rounded-xl border border-[var(--glass-stroke-soft)] bg-black/22 px-2.5 py-2">
          {summaries.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-[var(--glass-text-tertiary)]">{row.label}</span>
              <span className="font-bold text-[var(--glass-text-secondary)]">{row.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {isProcessing && typeof data.progress === 'number' ? (
        <div className="mt-2.5 grid gap-1">
          <div className="flex items-center justify-between text-[10px] text-[var(--glass-text-tertiary)]">
            <span>任务进度</span>
            <span className="font-bold text-[var(--glass-accent-from)]">{Math.round(data.progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full border border-[var(--glass-stroke-soft)] bg-black/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] transition-[width] duration-700"
              style={{ width: `${Math.min(100, Math.max(2, data.progress))}%` }}
            />
          </div>
        </div>
      ) : null}

      {data.pipelineError ? (
        <p className="mt-2 rounded-lg border border-[var(--glass-tone-danger-fg)]/30 bg-black/24 px-2 py-1.5 text-[10px] leading-relaxed text-[var(--glass-tone-danger-fg)]">
          {data.pipelineError}
        </p>
      ) : data.pipelineNote ? (
        <p className="mt-2 text-[10px] text-[var(--glass-text-tertiary)]">{data.pipelineNote}</p>
      ) : null}

      {data.childCount && data.childCount > 0 && data.onToggleExpand ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            data.onToggleExpand?.()
          }}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--glass-stroke-soft)] bg-black/20 px-2 py-1.5 text-[10px] font-bold text-[var(--glass-text-secondary)] transition hover:border-[var(--glass-stroke-strong)] hover:text-[var(--glass-text-primary)]"
        >
          <ChevronDown className={['h-3 w-3 transition-transform', data.expanded ? 'rotate-180' : ''].join(' ')} />
          {data.expanded ? `收起${data.childLabel ?? '子节点'}` : `展开 ${data.childCount} 张${data.childLabel ?? '子节点'}`}
        </button>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={data.onOpenStage}
          className="glass-btn-base glass-btn-secondary flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold"
        >
          <ExternalLink className="h-3 w-3" />
          打开工位
        </button>
        {data.actionLabel && data.onRunAction ? (
          <button
            type="button"
            disabled={Boolean(data.actionBlockedReason) || isProcessing}
            onClick={data.onRunAction}
            title={data.actionBlockedReason ?? undefined}
            className="glass-btn-base glass-btn-primary flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold"
          >
            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {isProcessing ? '执行中' : data.actionLabel}
          </button>
        ) : null}
      </div>

      {def.id !== 'source' ? <Handle type="target" position={Position.Left} isConnectable={false} /> : null}
      {def.id !== 'video' ? <Handle type="source" position={Position.Right} isConnectable={false} /> : null}
    </div>
  )
}
