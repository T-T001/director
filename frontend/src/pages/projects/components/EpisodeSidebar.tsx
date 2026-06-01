import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChevronRight, Pencil, Trash2, Plus, Monitor, FolderHeart, GripVertical } from 'lucide-react'

export type EpisodeListItem = {
  id: string
  episodeNumber: number
  name: string
}

type Props = {
  projectName: string
  episodes: EpisodeListItem[]
  currentEpisodeId: string | null
  onEpisodeSelect: (id: string) => void
  onEpisodeCreate: (name: string) => Promise<void>
  onEpisodeRename: (id: string, name: string) => Promise<void>
  onEpisodeDelete: (id: string) => Promise<void>
  onGlobalAssetsClick: () => void
}

export function EpisodeSidebar({
  projectName,
  episodes,
  currentEpisodeId,
  onEpisodeSelect,
  onEpisodeCreate,
  onEpisodeRename,
  onEpisodeDelete,
  onGlobalAssetsClick,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [posY, setPosY] = useState(200)
  const [dragging, setDragging] = useState(false)
  const dragStartY = useRef(0)
  const dragStartPos = useRef(0)

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const delta = e.clientY - dragStartY.current
      setPosY(Math.max(100, Math.min(window.innerHeight - 220, dragStartPos.current + delta)))
    }
    const onUp = () => setDragging(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    dragStartY.current = e.clientY
    dragStartPos.current = posY
  }

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    await onEpisodeCreate(newName.trim())
    setNewName('')
    setCreating(false)
  }

  const handleRenameSubmit = async (id: string, e: FormEvent) => {
    e.preventDefault()
    if (!editingName.trim()) return
    await onEpisodeRename(id, editingName.trim())
    setEditingId(null)
    setEditingName('')
  }

  const confirmDelete = async (id: string) => {
    await onEpisodeDelete(id)
    setDeleteId(null)
  }

  return (
    <>
      <div className="fixed left-0 z-40" style={{ top: posY }}>
        <div className="flex flex-col items-center">
          <button
            type="button"
            onMouseDown={handleDragStart}
            className="flex h-5 w-7 cursor-ns-resize items-center justify-center rounded-t-md bg-[var(--glass-bg-muted)] text-[var(--glass-text-tertiary)] transition-colors hover:bg-[var(--glass-bg-surface-strong)]"
            title="拖动调整位置"
          >
            <GripVertical className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={[
              'flex items-center gap-1.5 rounded-r-2xl border-y border-r px-2.5 py-3 text-xs font-medium transition-all',
              expanded
                ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]'
                : 'border-[var(--glass-stroke-base)] bg-white/[0.04] text-[var(--glass-text-secondary)] hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/[0.08]',
            ].join(' ')}
          >
            <ChevronRight className={['h-3.5 w-3.5 transition-transform', expanded ? 'rotate-180' : ''].join(' ')} />
            剧集
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="glass-overlay fixed inset-0 z-40" onClick={() => setExpanded(false)} />

          <div
            className="glass-modal-shell fixed left-[52px] z-50 flex max-h-[70vh] w-72 flex-col overflow-hidden rounded-r-2xl"
            style={{ top: Math.max(40, posY - 50) }}
          >
            <div className="border-b border-[var(--glass-stroke-base)] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--glass-text-primary)]">
                    <Monitor className="h-4 w-4 text-[var(--glass-tone-info-fg)]" />
                    剧集列表
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-[var(--glass-text-tertiary)]" title={projectName}>
                    {projectName}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--glass-bg-muted)] px-2 py-0.5 text-xs text-[var(--glass-text-tertiary)]">
                  {episodes.length} 集
                </span>
              </div>
            </div>

            <div className="border-b border-[var(--glass-stroke-base)] px-3 py-2">
              <button
                type="button"
                onClick={() => { onGlobalAssetsClick(); setExpanded(false) }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--glass-text-secondary)] transition-colors hover:bg-[var(--glass-bg-muted)]"
              >
                <FolderHeart className="h-4 w-4" />
                全局资产
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {episodes.length === 0 ? (
                <div className="py-6 text-center text-sm text-[var(--glass-text-tertiary)]">
                  还没有剧集
                </div>
              ) : (
                episodes.map((ep) => (
                  <div key={ep.id} className="group relative">
                    {editingId === ep.id ? (
                      <form className="flex gap-1" onSubmit={(e) => handleRenameSubmit(ep.id, e)}>
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null) }}
                          className="glass-input flex-1 px-2 py-1 text-sm"
                        />
                        <button type="submit" className="glass-btn-base glass-btn-primary rounded-lg px-2 py-1 text-xs">
                          保存
                        </button>
                      </form>
                    ) : deleteId === ep.id ? (
                      <div className="rounded-lg bg-[var(--glass-tone-danger-bg)]/60 p-2">
                        <p className="mb-2 text-xs text-[var(--glass-tone-danger-fg)]">确定删除「{ep.name}」？</p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => void confirmDelete(ep.id)}
                            className="flex-1 rounded-md bg-[var(--glass-tone-danger-fg)] py-1 text-xs font-semibold text-white"
                          >
                            删除
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(null)}
                            className="flex-1 rounded-md border border-[var(--glass-stroke-base)] bg-white/[0.05] py-1 text-xs text-[var(--glass-text-secondary)] transition-colors hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/10"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { onEpisodeSelect(ep.id); setExpanded(false) }}
                        className={[
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                          currentEpisodeId === ep.id
                            ? 'bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-white shadow-[var(--glass-shadow-sm)]'
                            : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]',
                        ].join(' ')}
                      >
                        <span className={[
                          'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                          currentEpisodeId === ep.id ? 'bg-white/30 text-white' : 'bg-[var(--glass-bg-muted)] text-[var(--glass-text-tertiary)]',
                        ].join(' ')}>
                          {ep.episodeNumber}
                        </span>
                        <span className="flex-1 truncate">{ep.name}</span>
                        <span className={[
                          'flex gap-1 opacity-0 transition-opacity group-hover:opacity-100',
                          currentEpisodeId === ep.id ? 'text-white/85' : 'text-[var(--glass-text-tertiary)]',
                        ].join(' ')}>
                          <span
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer rounded p-0.5 transition-transform hover:scale-110"
                            onClick={(e) => { e.stopPropagation(); setEditingId(ep.id); setEditingName(ep.name) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setEditingId(ep.id); setEditingName(ep.name) } }}
                            title="重命名"
                          >
                            <Pencil className="h-3 w-3" />
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer rounded p-0.5 transition-transform hover:scale-110"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(ep.id) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDeleteId(ep.id) } }}
                            title="删除"
                          >
                            <Trash2 className="h-3 w-3" />
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[var(--glass-stroke-base)] bg-white/[0.03] p-3">
              {creating ? (
                <form className="grid gap-2" onSubmit={handleCreateSubmit}>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
                    placeholder="新剧集名称"
                    className="glass-input px-3 py-1.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={!newName.trim()}
                      className="glass-btn-base glass-btn-primary flex-1 py-1.5 text-xs disabled:opacity-50"
                    >
                      创建
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCreating(false); setNewName('') }}
                      className="glass-btn-base glass-btn-secondary flex-1 py-1.5 text-xs"
                    >
                      取消
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-[var(--glass-tone-success-bg)] to-white py-2 text-sm font-semibold text-[var(--glass-tone-success-fg)] transition hover:brightness-105"
                >
                  <Plus className="h-4 w-4" />
                  添加剧集
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
