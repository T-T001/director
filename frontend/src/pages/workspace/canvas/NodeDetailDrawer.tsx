import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Loader2, Play, Save, X } from 'lucide-react'

import { buildMediaUrl } from '../../../services/api/client'
import { updatePanel } from '../../../services/api/storyboards'
import { queryKeys } from '../../../services/queryKeys'
import { pushToast } from '../../../components/ui/toast.store'
import type { AssetItem, Episode, StoryboardPanel, WorkspaceTask } from '../../../types/project'
import type { CanvasNodeDef, CanvasNodeId } from './canvas-graph'
import { TaskLogViewer } from './TaskLogViewer'

function PanelPromptEditor({ panel, episodeId }: { panel: StoryboardPanel; episodeId: string }) {
  const queryClient = useQueryClient()
  const [imagePrompt, setImagePrompt] = useState(panel.image_prompt ?? '')
  const [videoPrompt, setVideoPrompt] = useState(panel.video_prompt ?? '')
  const dirty = imagePrompt !== (panel.image_prompt ?? '') || videoPrompt !== (panel.video_prompt ?? '')

  const saveMutation = useMutation({
    mutationFn: () => updatePanel(panel.id, { image_prompt: imagePrompt, video_prompt: videoPrompt }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      pushToast(`镜头 ${panel.panel_index} 提示词已保存`, 'success')
    },
    onError: (error) => {
      pushToast(error instanceof Error ? `保存失败：${error.message}` : '保存失败', 'error')
    },
  })

  return (
    <div className="grid gap-1.5 rounded-xl border border-[var(--glass-stroke-soft)] bg-black/22 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-[var(--glass-text-secondary)]">镜头 {panel.panel_index}</p>
        <button
          type="button"
          disabled={!dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="glass-btn-base glass-btn-secondary rounded-lg px-2 py-1 text-[10px] font-bold"
        >
          {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          保存
        </button>
      </div>
      <label className="grid gap-1 text-[10px] text-[var(--glass-text-tertiary)]">
        图像提示词
        <textarea
          value={imagePrompt}
          onChange={(event) => setImagePrompt(event.target.value)}
          rows={2}
          className="glass-input resize-y px-2 py-1.5 text-[11px] leading-relaxed"
        />
      </label>
      <label className="grid gap-1 text-[10px] text-[var(--glass-text-tertiary)]">
        视频提示词
        <textarea
          value={videoPrompt}
          onChange={(event) => setVideoPrompt(event.target.value)}
          rows={2}
          className="glass-input resize-y px-2 py-1.5 text-[11px] leading-relaxed"
        />
      </label>
    </div>
  )
}

export function NodeDetailDrawer({
  def,
  episode,
  assets,
  panels,
  runningTasks,
  actionLabel,
  actionBlockedReason,
  onRunAction,
  onOpenStage,
  onEditNovel,
  onClose,
}: {
  def: CanvasNodeDef
  episode: Episode
  assets: AssetItem[]
  panels: StoryboardPanel[]
  runningTasks: WorkspaceTask[]
  actionLabel?: string
  actionBlockedReason?: string | null
  onRunAction?: () => void
  onOpenStage: () => void
  onEditNovel: () => void
  onClose: () => void
}) {
  const nodeId: CanvasNodeId = def.id

  return (
    <aside className="glass-modal-shell absolute bottom-4 right-4 top-4 z-20 flex w-[360px] flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--glass-stroke-soft)] bg-white/[0.03] px-4 py-3">
        <div className="min-w-0">
          <p className="field-label text-[var(--glass-accent-cyan)]">Node detail</p>
          <h3 className="truncate text-sm font-black text-[var(--glass-text-primary)]">{def.label}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[var(--glass-stroke-soft)] bg-white/[0.04] p-1.5 text-[var(--glass-text-tertiary)] transition hover:text-[var(--glass-text-primary)]"
          aria-label="关闭详情"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="grid gap-3">
          {runningTasks.length > 0 ? (
            <section className="grid gap-2">
              <p className="text-[11px] font-black tracking-wide text-[var(--glass-accent-from)]">运行中任务日志</p>
              {runningTasks.map((task) =>
                task.run_id ? (
                  <TaskLogViewer key={task.id} runId={task.run_id} taskType={`${task.task_type} · ${task.progress}%`} />
                ) : (
                  <p key={task.id} className="text-[11px] text-[var(--glass-text-tertiary)]">
                    {task.task_type} · {task.progress}%（无日志流）
                  </p>
                ),
              )}
            </section>
          ) : null}

          {nodeId === 'source' || nodeId === 'script' ? (
            <section className="grid gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black tracking-wide text-[var(--glass-text-secondary)]">本集原文</p>
                <button type="button" onClick={onEditNovel} className="glass-btn-base glass-btn-secondary rounded-lg px-2 py-1 text-[10px] font-bold">
                  {episode.novel_text?.trim() ? '编辑原文' : '导入原文'}
                </button>
              </div>
              {episode.novel_text?.trim() ? (
                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--glass-stroke-soft)] bg-black/22 px-3 py-2.5 font-sans text-[11px] leading-relaxed text-[var(--glass-text-secondary)]">
                  {episode.novel_text.slice(0, 4000)}
                  {episode.novel_text.length > 4000 ? '\n...（更多内容请打开工位查看）' : ''}
                </pre>
              ) : (
                <p className="rounded-xl border border-[var(--glass-stroke-soft)] bg-black/22 px-3 py-2.5 text-[11px] text-[var(--glass-text-tertiary)]">
                  还没有原文，导入后可逐节点生成或一键自动制作。
                </p>
              )}
            </section>
          ) : null}

          {nodeId === 'assets' ? (
            <section className="grid gap-2">
              <p className="text-[11px] font-black tracking-wide text-[var(--glass-text-secondary)]">资产（{assets.length}）</p>
              {assets.length === 0 ? (
                <p className="text-[11px] text-[var(--glass-text-tertiary)]">尚无资产，先拆解剧本识别角色与场景。</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {assets.map((asset) => (
                    <div key={asset.id} className="overflow-hidden rounded-xl border border-[var(--glass-stroke-soft)] bg-black/22">
                      <div className="aspect-[4/3] bg-black/30">
                        {asset.image_url ? (
                          <img src={asset.image_url} alt={asset.name} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-[var(--glass-text-tertiary)]">未出图</div>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="truncate text-[11px] font-bold text-[var(--glass-text-primary)]">{asset.name}</p>
                        <p className="text-[10px] text-[var(--glass-text-tertiary)]">
                          {asset.kind === 'character' ? '角色' : asset.kind === 'location' ? '场景' : asset.kind === 'prop' ? '道具' : asset.kind}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {nodeId === 'storyboard' ? (
            <section className="grid gap-2">
              <p className="text-[11px] font-black tracking-wide text-[var(--glass-text-secondary)]">镜头面板（{panels.length}）</p>
              {panels.length === 0 ? (
                <p className="text-[11px] text-[var(--glass-text-tertiary)]">尚无分镜，先由剧本生成分镜。</p>
              ) : (
                panels.map((panel) => (
                  <div key={panel.id} className="flex gap-2 rounded-xl border border-[var(--glass-stroke-soft)] bg-black/22 p-2">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-black/30">
                      {panel.image_media_id ? (
                        <img src={buildMediaUrl(panel.image_media_id)} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-[var(--glass-text-tertiary)]">镜头 {panel.panel_index}</p>
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--glass-text-secondary)]">{panel.description}</p>
                    </div>
                  </div>
                ))
              )}
            </section>
          ) : null}

          {nodeId === 'prompts' ? (
            <section className="grid gap-2">
              <p className="text-[11px] font-black tracking-wide text-[var(--glass-text-secondary)]">镜头提示词（可直接修改）</p>
              {panels.length === 0 ? (
                <p className="text-[11px] text-[var(--glass-text-tertiary)]">尚无分镜面板。</p>
              ) : (
                panels.map((panel) => <PanelPromptEditor key={panel.id} panel={panel} episodeId={episode.id} />)
              )}
            </section>
          ) : null}

          {nodeId === 'voice' ? (
            <section className="grid gap-2">
              <p className="text-[11px] font-black tracking-wide text-[var(--glass-text-secondary)]">整集音频</p>
              {episode.audio_media_id ? (
                <audio controls preload="none" src={buildMediaUrl(episode.audio_media_id)} className="w-full" />
              ) : (
                <p className="text-[11px] text-[var(--glass-text-tertiary)]">尚未生成整集配音。</p>
              )}
              {episode.srt_content?.trim() ? (
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--glass-stroke-soft)] bg-black/22 px-3 py-2.5 font-sans text-[10px] leading-relaxed text-[var(--glass-text-tertiary)]">
                  {episode.srt_content.slice(0, 2000)}
                </pre>
              ) : null}
            </section>
          ) : null}

          {nodeId === 'video' ? (
            <section className="grid gap-2">
              <p className="text-[11px] font-black tracking-wide text-[var(--glass-text-secondary)]">
                镜头视频（{panels.filter((panel) => panel.video_media_id).length} / {panels.length}）
              </p>
              {panels.filter((panel) => panel.video_media_id).length === 0 ? (
                <p className="text-[11px] text-[var(--glass-text-tertiary)]">尚无镜头视频。</p>
              ) : (
                panels
                  .filter((panel) => panel.video_media_id)
                  .map((panel) => (
                    <div key={panel.id} className="grid gap-1 rounded-xl border border-[var(--glass-stroke-soft)] bg-black/22 p-2">
                      <p className="text-[10px] font-bold text-[var(--glass-text-tertiary)]">镜头 {panel.panel_index}</p>
                      <video
                        controls
                        preload="none"
                        src={buildMediaUrl(panel.video_media_id as string)}
                        poster={panel.image_media_id ? buildMediaUrl(panel.image_media_id) : undefined}
                        className="w-full rounded-lg bg-black/40"
                      />
                    </div>
                  ))
              )}
            </section>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 border-t border-[var(--glass-stroke-soft)] bg-white/[0.03] px-4 py-3">
        <button type="button" onClick={onOpenStage} className="glass-btn-base glass-btn-secondary flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold">
          <ExternalLink className="h-3 w-3" />
          打开工位
        </button>
        {actionLabel && onRunAction ? (
          <button
            type="button"
            disabled={Boolean(actionBlockedReason)}
            title={actionBlockedReason ?? undefined}
            onClick={onRunAction}
            className="glass-btn-base glass-btn-primary flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold"
          >
            <Play className="h-3 w-3" />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </aside>
  )
}
