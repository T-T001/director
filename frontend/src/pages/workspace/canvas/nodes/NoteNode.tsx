import { type Node, type NodeProps } from '@xyflow/react'
import { StickyNote, X } from 'lucide-react'

export type NoteNodeData = {
  text: string
  onChange: (text: string) => void
  onDelete: () => void
}

export type NoteNodeType = Node<NoteNodeData, 'noteNode'>

export function NoteNode({ data }: NodeProps<NoteNodeType>) {
  return (
    <div className="w-[220px] rounded-xl border border-amber-200/35 bg-gradient-to-br from-amber-200/22 to-amber-400/10 p-2.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-xl">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-[0.12em] text-[var(--glass-accent-from)]">
          <StickyNote className="h-3 w-3" />
          便签
        </span>
        <button
          type="button"
          onClick={data.onDelete}
          className="rounded-full p-0.5 text-[var(--glass-text-tertiary)] transition hover:text-[var(--glass-tone-danger-fg)]"
          aria-label="删除便签"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <textarea
        value={data.text}
        onChange={(event) => data.onChange(event.target.value)}
        placeholder="记录创作想法、画风备注、镜头提醒..."
        rows={4}
        className="nodrag w-full resize-none rounded-lg border border-transparent bg-black/18 px-2 py-1.5 text-[11px] leading-relaxed text-[var(--glass-text-primary)] outline-none transition placeholder:text-[var(--glass-text-tertiary)] focus:border-[var(--glass-stroke-focus)]"
      />
    </div>
  )
}
