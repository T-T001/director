import { type Node, type NodeProps } from '@xyflow/react'
import { Image as ImageIcon, X } from 'lucide-react'

export type ImageNodeData = {
  url: string
  onDelete: () => void
}

export type ImageNodeType = Node<ImageNodeData, 'imageNode'>

export function ImageNode({ data }: NodeProps<ImageNodeType>) {
  return (
    <div className="w-[220px] overflow-hidden rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)] shadow-[var(--glass-shadow-sm)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-[0.12em] text-[var(--glass-accent-cyan)]">
          <ImageIcon className="h-3 w-3" />
          参考图
        </span>
        <button
          type="button"
          onClick={data.onDelete}
          className="rounded-full p-0.5 text-[var(--glass-text-tertiary)] transition hover:text-[var(--glass-tone-danger-fg)]"
          aria-label="删除参考图"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <img src={data.url} alt="参考图" loading="lazy" className="block max-h-[260px] w-full bg-black/30 object-contain" />
    </div>
  )
}
