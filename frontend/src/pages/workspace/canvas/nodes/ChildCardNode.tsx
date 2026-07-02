import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { ImageOff } from 'lucide-react'

export type ChildCardNodeData = {
  title: string
  subtitle?: string
  imageUrl?: string | null
  /** 状态点颜色（如已出图绿色、缺图灰色） */
  dotColor?: string
  onClick?: () => void
}

export type ChildCardNodeType = Node<ChildCardNodeData, 'childCard'>

export function ChildCardNode({ data }: NodeProps<ChildCardNodeType>) {
  return (
    <button
      type="button"
      onClick={data.onClick}
      className="group w-[150px] overflow-hidden rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)] text-left shadow-[var(--glass-shadow-sm)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[var(--glass-stroke-strong)]"
    >
      <div className="relative aspect-[4/3] w-full bg-black/35">
        {data.imageUrl ? (
          <img src={data.imageUrl} alt={data.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--glass-text-tertiary)]">
            <ImageOff className="h-5 w-5" />
          </div>
        )}
        {data.dotColor ? (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.6)]"
            style={{ background: data.dotColor }}
          />
        ) : null}
      </div>
      <div className="px-2 py-1.5">
        <p className="truncate text-[11px] font-bold text-[var(--glass-text-primary)]">{data.title}</p>
        {data.subtitle ? <p className="truncate text-[10px] text-[var(--glass-text-tertiary)]">{data.subtitle}</p> : null}
      </div>
      <Handle type="target" position={Position.Top} isConnectable={false} className="!opacity-0" />
    </button>
  )
}
