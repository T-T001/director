import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ReactFlowProvider, type Edge, type Node } from '@xyflow/react'
import { LayoutList, Loader2, Sparkles, Square, ArrowRight, Check, CircleDashed, ImagePlus, ListChecks, SkipForward, StickyNote, TriangleAlert, X } from 'lucide-react'

import '@xyflow/react/dist/style.css'
import './canvas-theme.css'

import { useCanvasPipelineStore } from '../../../app/store/canvas-pipeline.store'
import { buildWorkspaceStagePath } from '../../../app/router/routes'
import { useWorkspaceStore } from '../../../app/store/workspace.store'
import { EmptyState, ErrorState, LoadingState } from '../../../components/common/PageState'
import { GlassSelect } from '../../../components/ui/GlassSelect'
import { Modal } from '../../../components/ui/Modal'
import { pushToast } from '../../../components/ui/toast.store'
import { buildMediaUrl } from '../../../services/api/client'
import { updateEpisode } from '../../../services/api/episodes'
import { uploadFile } from '../../../services/api/files'
import { getWorkspace } from '../../../services/api/projects'
import { listProjectTasks } from '../../../services/api/tasks'
import { queryKeys } from '../../../services/queryKeys'
import { useProjectTaskSSE } from '../../../services/sse/project-stream'
import { buildStageSignals, findRunningStageTasks, isRunningTask } from '../stage-signals'
import { canvasNodeDefs, pipelineNodeOrder, type CanvasNodeId } from './canvas-graph'
import { nodeActions } from './node-actions'
import { NodeDetailDrawer } from './NodeDetailDrawer'
import { ProductionCanvas } from './ProductionCanvas'
import type { StageNodeData } from './nodes/StageNode'
import { useCanvasAnnotations } from './useCanvasAnnotations'
import { useNodePositions } from './useNodePositions'
import { usePipelineRunner } from './usePipelineRunner'
import { useStageSummaries } from './useStageSummaries'

export function CanvasModePage() {
  const { projectId = '', episodeId = '' } = useParams()

  if (!projectId || !episodeId) {
    return <Navigate to="/projects" replace />
  }

  return <CanvasModeInner projectId={projectId} episodeId={episodeId} />
}

function CanvasModeInner({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const activeStage = useWorkspaceStore((state) => state.activeStage)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [autoStartAfterImport, setAutoStartAfterImport] = useState(false)
  const [busyNodes, setBusyNodes] = useState<Partial<Record<CanvasNodeId, boolean>>>({})
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<{ assets?: boolean; storyboard?: boolean }>({})
  const [detailNodeId, setDetailNodeId] = useState<CanvasNodeId | null>(null)
  const [refImageOpen, setRefImageOpen] = useState(false)
  const [refImageUrl, setRefImageUrl] = useState('')
  const [refImageUploading, setRefImageUploading] = useState(false)

  const pipeline = useCanvasPipelineStore()
  const { startPipeline, stopPipeline } = usePipelineRunner({ projectId, episodeId })

  const workspaceQuery = useQuery({
    queryKey: queryKeys.projects.workspace(projectId),
    queryFn: () => getWorkspace(projectId),
    enabled: Boolean(projectId),
  })

  useProjectTaskSSE(projectId, true)

  // 运行任务期间每 3 秒轮询任务进度，驱动节点进度条（SSE 只在状态切换时触发，不带进度心跳）
  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.byProject(projectId),
    queryFn: () => listProjectTasks(projectId),
    enabled: Boolean(projectId),
    refetchInterval: (query) => (query.state.data?.some((task) => isRunningTask(task.status)) ? 3000 : false),
  })
  const runningTasks = useMemo(
    () => (tasksQuery.data ?? []).filter((task) => isRunningTask(task.status)),
    [tasksQuery.data],
  )

  // 自动制作或有任务运行时，拦截刷新/关闭与应用内跳转，避免前端编排链路被打断
  const shouldGuardLeave = pipeline.running
  useEffect(() => {
    if (!shouldGuardLeave) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [shouldGuardLeave])

  const blocker = useBlocker(shouldGuardLeave)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const leave = window.confirm('自动制作正在运行，离开页面会中断后续阶段的自动触发（已提交的任务会继续）。确定离开吗？')
    if (leave) {
      useCanvasPipelineStore.getState().stop()
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker])

  const workspace = workspaceQuery.data
  const sortedEpisodes = useMemo(
    () => [...(workspace?.episodes ?? [])].sort((left, right) => left.episode_number - right.episode_number),
    [workspace?.episodes],
  )
  const episode = sortedEpisodes.find((item) => item.id === episodeId) ?? null

  const { positions, savePosition, resetLayout, arrangeLayout } = useNodePositions(projectId)
  const { annotations, addNote, addImage, updateText, move: moveAnnotation, remove: removeAnnotation } = useCanvasAnnotations(projectId)

  const importMutation = useMutation({
    mutationFn: (novelText: string) => updateEpisode(episodeId, { novel_text: novelText }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      setImportOpen(false)
      setImportText('')
      if (autoStartAfterImport) {
        setAutoStartAfterImport(false)
        setTimelineOpen(true)
        void startPipeline()
      }
    },
  })

  const summariesResult = useStageSummaries({
    projectId,
    episode: episode ?? {
      id: episodeId,
      project_id: projectId,
      episode_number: 0,
      name: '',
      description: null,
      novel_text: null,
      srt_content: null,
      audio_media_id: null,
      created_at: '',
      updated_at: '',
    },
    workspace: workspace ?? {
      project: { id: projectId, name: '', description: null, intake_novel_text: null, created_at: '', updated_at: '' },
      settings: null,
      episodes: [],
      latest_active_tasks: [],
    },
  })

  if (workspaceQuery.isLoading) {
    return <LoadingState message="正在加载画布模式..." />
  }

  if (workspaceQuery.isError || !workspace) {
    return <ErrorState message="加载工作区失败。" />
  }

  if (!episode) {
    return (
      <div className="grid gap-4">
        <EmptyState title="未找到剧集" description="请先创建剧集，再打开画布模式。" />
        <Link className="glass-btn-base glass-btn-secondary w-fit px-3 py-2 text-sm" to={`/projects/${projectId}`}>
          返回项目
        </Link>
      </div>
    )
  }

  const hasNovelText = Boolean(episode.novel_text?.trim())
  const signals = buildStageSignals({
    hasNovelText,
    hasSrt: Boolean(episode.srt_content?.trim()),
    hasAudio: Boolean(episode.audio_media_id),
    tasks: workspace.latest_active_tasks,
  })
  const activeTaskCount = workspace.latest_active_tasks.filter((task) => isRunningTask(task.status)).length

  const actionContext = { episode, assets: summariesResult.assets, panels: summariesResult.panels }

  const runNodeAction = async (nodeId: CanvasNodeId) => {
    const action = nodeActions[nodeId]
    if (!action || busyNodes[nodeId]) return
    setBusyNodes((current) => ({ ...current, [nodeId]: true }))
    try {
      const taskIds = await action.run(actionContext)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) }),
      ])
      pushToast(taskIds.length > 1 ? `已提交 ${taskIds.length} 个生成任务` : '生成任务已提交', 'success')
    } catch (error) {
      pushToast(error instanceof Error ? `触发失败：${error.message}` : '触发任务失败', 'error')
    } finally {
      setBusyNodes((current) => ({ ...current, [nodeId]: false }))
    }
  }

  const stepByNode = new Map(pipeline.steps.map((step) => [step.nodeId, step]))

  const nodeData = Object.fromEntries(
    canvasNodeDefs.map((def) => {
      const nodeId = def.id
      const action = nodeActions[nodeId]
      const step = stepByNode.get(nodeId)
      const signal =
        nodeId === 'source'
          ? {
              status: hasNovelText ? ('ready' as const) : ('active' as const),
              detail: hasNovelText ? '本集原文已就绪，可推进后续制作' : '先导入本集原文，或回项目页做智能分析拆集',
            }
          : signals[nodeId]

      const stageRunningTasks = nodeId === 'source' ? [] : findRunningStageTasks(runningTasks, nodeId)
      const progress =
        stageRunningTasks.length > 0
          ? stageRunningTasks.reduce((sum, task) => sum + (Number.isFinite(task.progress) ? task.progress : 0), 0) /
            stageRunningTasks.length
          : null

      const data: StageNodeData = {
        def,
        signal,
        summaries: summariesResult.summaries[nodeId] ?? [],
        actionLabel: nodeId === 'source' ? (hasNovelText ? undefined : '导入原文') : action?.label,
        actionBlockedReason: nodeId === 'source' ? null : action ? action.blockedReason(actionContext) : null,
        actionBusy: Boolean(busyNodes[nodeId]) || (pipeline.running && pipeline.currentNodeId === nodeId),
        progress,
        thumbnails: summariesResult.thumbnails[nodeId],
        childCount:
          nodeId === 'assets' ? summariesResult.assets.length : nodeId === 'storyboard' ? summariesResult.panels.length : undefined,
        childLabel: nodeId === 'assets' ? '资产卡' : nodeId === 'storyboard' ? '镜头面板' : undefined,
        expanded: nodeId === 'assets' || nodeId === 'storyboard' ? Boolean(expandedNodes[nodeId]) : undefined,
        onToggleExpand:
          nodeId === 'assets' || nodeId === 'storyboard'
            ? () => setExpandedNodes((current) => ({ ...current, [nodeId]: !current[nodeId] }))
            : undefined,
        pipelineNote: step?.status === 'skipped' ? step.note : undefined,
        pipelineError: step?.status === 'failed' ? step.error : undefined,
        isPipelineCurrent: pipeline.running && pipeline.currentNodeId === nodeId,
        onOpenStage: () =>
          nodeId === 'source'
            ? navigate(`/projects/${projectId}`)
            : navigate(buildWorkspaceStagePath(projectId, episodeId, nodeId)),
        onRunAction:
          nodeId === 'source'
            ? hasNovelText
              ? undefined
              : () => {
                  setAutoStartAfterImport(false)
                  setImportText('')
                  setImportOpen(true)
                }
            : action
              ? () => void runNodeAction(nodeId)
              : undefined,
      }
      return [nodeId, data]
    }),
  ) as Record<CanvasNodeId, StageNodeData>

  // 展开的子节点（素材→资产卡 / 分镜→镜头面板）+ 便签/参考图附加节点
  const CHILD_LIMIT = 12
  const extraNodes: Node[] = []
  const extraEdges: Edge[] = []
  const childEdgeStyle = { stroke: 'rgba(255, 229, 180, 0.18)', strokeDasharray: '4 4' }

  if (expandedNodes.assets) {
    const parent = positions.assets
    summariesResult.assets.slice(0, CHILD_LIMIT).forEach((asset, index) => {
      const id = `child:assets:${asset.id}`
      extraNodes.push({
        id,
        type: 'childCard',
        position: { x: parent.x - 80 + (index % 3) * 164, y: parent.y + 380 + Math.floor(index / 3) * 172 },
        draggable: false,
        selectable: false,
        data: {
          title: asset.name,
          subtitle: asset.kind === 'character' ? '角色' : asset.kind === 'location' ? '场景' : asset.kind === 'prop' ? '道具' : asset.kind,
          imageUrl: asset.image_url,
          dotColor: asset.image_url ? 'rgba(79, 209, 143, 0.95)' : 'rgba(255, 255, 255, 0.3)',
          onClick: () => setDetailNodeId('assets'),
        },
      })
      extraEdges.push({ id: `edge:${id}`, source: 'assets', target: id, type: 'smoothstep', style: childEdgeStyle })
    })
  }

  if (expandedNodes.storyboard) {
    const parent = positions.storyboard
    summariesResult.panels.slice(0, CHILD_LIMIT).forEach((panel, index) => {
      const id = `child:storyboard:${panel.id}`
      extraNodes.push({
        id,
        type: 'childCard',
        position: { x: parent.x - 80 + (index % 3) * 164, y: parent.y + 380 + Math.floor(index / 3) * 172 },
        draggable: false,
        selectable: false,
        data: {
          title: `镜头 ${panel.panel_index}`,
          subtitle: panel.description?.slice(0, 18),
          imageUrl: panel.image_media_id ? buildMediaUrl(panel.image_media_id) : null,
          dotColor: panel.video_media_id
            ? 'rgba(79, 209, 143, 0.95)'
            : panel.image_media_id
              ? 'rgba(255, 179, 71, 0.95)'
              : 'rgba(255, 255, 255, 0.3)',
          onClick: () => setDetailNodeId('storyboard'),
        },
      })
      extraEdges.push({ id: `edge:${id}`, source: 'storyboard', target: id, type: 'smoothstep', style: childEdgeStyle })
    })
  }

  for (const annotation of annotations) {
    extraNodes.push({
      id: `anno:${annotation.id}`,
      type: annotation.kind === 'note' ? 'noteNode' : 'imageNode',
      position: annotation.position,
      draggable: true,
      data:
        annotation.kind === 'note'
          ? {
              text: annotation.text ?? '',
              onChange: (text: string) => updateText(annotation.id, text),
              onDelete: () => removeAnnotation(annotation.id),
            }
          : {
              url: annotation.url ?? '',
              onDelete: () => removeAnnotation(annotation.id),
            },
    })
  }

  const handleMoveNode = (nodeId: string, position: { x: number; y: number }) => {
    if (nodeId.startsWith('anno:')) {
      moveAnnotation(nodeId.slice(5), position)
      return
    }
    if (canvasNodeDefs.some((def) => def.id === nodeId)) {
      savePosition(nodeId as CanvasNodeId, position)
    }
  }

  const handleNodeClick = (nodeId: string) => {
    if (canvasNodeDefs.some((def) => def.id === nodeId)) {
      setDetailNodeId(nodeId as CanvasNodeId)
    }
  }

  const annotationSpawnPosition = () => ({
    x: positions.source.x + 40 + (annotations.length % 5) * 48,
    y: positions.source.y - 240 + (annotations.length % 3) * 36,
  })

  const handleAddRefImage = async (file?: File) => {
    try {
      setRefImageUploading(true)
      let url = refImageUrl.trim()
      if (file) {
        const uploaded = await uploadFile(file, 'canvas-reference')
        url = uploaded.url ?? (uploaded.media_id ? buildMediaUrl(uploaded.media_id) : '')
      }
      if (!url) {
        pushToast('请填写图片链接或选择本地图片', 'error')
        return
      }
      addImage(url, annotationSpawnPosition())
      setRefImageOpen(false)
      setRefImageUrl('')
    } catch (error) {
      pushToast(error instanceof Error ? `添加参考图失败：${error.message}` : '添加参考图失败', 'error')
    } finally {
      setRefImageUploading(false)
    }
  }

  const detailDef = detailNodeId ? canvasNodeDefs.find((def) => def.id === detailNodeId) ?? null : null

  const doneSteps = pipeline.steps.filter((step) => step.status === 'done' || step.status === 'skipped').length
  const failedStep = pipeline.steps.find((step) => step.status === 'failed')

  const handleAutoRun = () => {
    if (pipeline.running) return
    if (!hasNovelText) {
      setAutoStartAfterImport(true)
      setImportText('')
      setImportOpen(true)
      return
    }
    setTimelineOpen(true)
    void startPipeline()
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[520px] flex-col gap-3">
      <header className="glass-surface flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="field-label text-[var(--glass-accent-cyan)]">Production canvas</p>
          <h1 className="truncate text-lg font-black tracking-tight">{workspace.project.name}</h1>
        </div>

        <GlassSelect
          className="min-w-[230px]"
          value={episode.id}
          onChange={(nextEpisodeId) => navigate(`/workspace/${projectId}/${nextEpisodeId}/canvas`)}
          ariaLabel="切换剧集"
          options={sortedEpisodes.map((item) => ({
            value: item.id,
            label: `第 ${item.episode_number} 集：${item.name}`,
          }))}
        />

        <span className="glass-chip">
          运行任务 <strong className="text-[var(--glass-text-primary)]">{activeTaskCount}</strong>
        </span>

        {pipeline.running ? (
          <span className="glass-chip border-[var(--glass-accent-from)]/30 text-[var(--glass-accent-from)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            自动制作 {doneSteps}/{pipelineNodeOrder.length} · 请勿关闭页面
          </span>
        ) : failedStep ? (
          <button
            type="button"
            onClick={() => {
              setTimelineOpen(true)
              void startPipeline(failedStep.nodeId)
            }}
            className="glass-chip border-[var(--glass-tone-danger-fg)]/35 text-[var(--glass-tone-danger-fg)] transition hover:bg-[var(--glass-tone-danger-bg)]"
            title={failedStep.error}
          >
            自动制作中断 · 点击从「{canvasNodeDefs.find((def) => def.id === failedStep.nodeId)?.label}」重试
          </button>
        ) : null}

        {pipeline.steps.length > 0 ? (
          <button
            type="button"
            onClick={() => setTimelineOpen((open) => !open)}
            className={[
              'glass-chip transition hover:border-[var(--glass-stroke-strong)]',
              timelineOpen ? 'border-[var(--glass-stroke-focus)] text-[var(--glass-tone-info-fg)]' : '',
            ].join(' ')}
          >
            <ListChecks className="h-3.5 w-3.5" />
            制作时间线
          </button>
        ) : null}

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addNote(annotationSpawnPosition())}
            className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm font-semibold"
            title="在画布上添加创作便签"
          >
            <StickyNote className="h-3.5 w-3.5" />
            便签
          </button>
          <button
            type="button"
            onClick={() => setRefImageOpen(true)}
            className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm font-semibold"
            title="在画布上添加参考图"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            参考图
          </button>
          {pipeline.running ? (
            <button type="button" onClick={stopPipeline} className="glass-btn-base glass-btn-secondary rounded-xl px-3 py-2 text-sm font-semibold">
              <Square className="h-3.5 w-3.5" />
              停止自动制作
            </button>
          ) : (
            <button type="button" onClick={handleAutoRun} className="glass-btn-base glass-btn-primary rounded-xl px-3 py-2 text-sm font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              一键自动制作
            </button>
          )}
          <Link
            to={buildWorkspaceStagePath(projectId, episodeId, activeStage)}
            className="glass-btn-base glass-btn-secondary rounded-xl px-3 py-2 text-sm font-semibold"
          >
            <LayoutList className="h-3.5 w-3.5" />
            阶段模式
          </Link>
        </div>
      </header>

      <div className="glass-surface relative min-h-0 flex-1 overflow-hidden rounded-3xl">
        <ReactFlowProvider>
          <ProductionCanvas
            nodeData={nodeData}
            positions={positions}
            extraNodes={extraNodes}
            extraEdges={extraEdges}
            onMoveNode={handleMoveNode}
            onNodeClick={handleNodeClick}
            onResetLayout={resetLayout}
            onArrangeLayout={arrangeLayout}
          />
        </ReactFlowProvider>

        {detailDef && detailNodeId ? (
          <NodeDetailDrawer
            def={detailDef}
            episode={episode}
            assets={summariesResult.assets}
            panels={summariesResult.panels}
            runningTasks={detailNodeId === 'source' ? [] : findRunningStageTasks(runningTasks, detailNodeId)}
            actionLabel={nodeData[detailNodeId].actionLabel}
            actionBlockedReason={nodeData[detailNodeId].actionBlockedReason}
            onRunAction={nodeData[detailNodeId].onRunAction}
            onOpenStage={nodeData[detailNodeId].onOpenStage}
            onEditNovel={() => {
              setAutoStartAfterImport(false)
              setImportText(episode.novel_text ?? '')
              setImportOpen(true)
            }}
            onClose={() => setDetailNodeId(null)}
          />
        ) : null}

        {timelineOpen && pipeline.steps.length > 0 ? (
          <aside className="glass-modal-shell absolute left-4 top-4 z-20 w-72 overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--glass-stroke-soft)] bg-white/[0.03] px-4 py-2.5">
              <p className="text-xs font-black tracking-wide text-[var(--glass-text-primary)]">自动制作时间线</p>
              <button
                type="button"
                onClick={() => setTimelineOpen(false)}
                className="rounded-full p-0.5 text-[var(--glass-text-tertiary)] transition hover:text-[var(--glass-text-primary)]"
                aria-label="收起时间线"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid gap-1 p-3">
              {pipeline.steps.map((step) => {
                const def = canvasNodeDefs.find((item) => item.id === step.nodeId)
                return (
                  <div key={step.nodeId} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs">
                    {step.status === 'running' ? (
                      <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[var(--glass-accent-from)]" />
                    ) : step.status === 'done' ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--glass-tone-success-fg)]" strokeWidth={3} />
                    ) : step.status === 'failed' ? (
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--glass-tone-danger-fg)]" />
                    ) : step.status === 'skipped' ? (
                      <SkipForward className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--glass-text-tertiary)]" />
                    ) : (
                      <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--glass-text-tertiary)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[var(--glass-text-secondary)]">{def?.label ?? step.nodeId}</span>
                        {step.taskIds.length > 0 ? (
                          <span className="text-[10px] text-[var(--glass-text-tertiary)]">{step.taskIds.length} 任务</span>
                        ) : null}
                      </div>
                      {step.error ? (
                        <p className="mt-0.5 break-words text-[10px] leading-relaxed text-[var(--glass-tone-danger-fg)]">{step.error}</p>
                      ) : step.note ? (
                        <p className="mt-0.5 break-words text-[10px] leading-relaxed text-[var(--glass-text-tertiary)]">{step.note}</p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>
        ) : null}

        {!hasNovelText && !pipeline.running ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-4">
            <div className="glass-modal-shell pointer-events-auto flex flex-wrap items-center gap-3 rounded-2xl px-5 py-3.5">
              <p className="text-sm text-[var(--glass-text-secondary)]">
                本集还没有原文。从
                <strong className="mx-1 text-[var(--glass-accent-from)]">「智能分析 · 原文」</strong>
                节点开始，导入后即可逐节点生成或一键自动制作。
              </p>
              <button
                type="button"
                onClick={() => {
                  setAutoStartAfterImport(false)
                  setImportText('')
                  setImportOpen(true)
                }}
                className="glass-btn-base glass-btn-primary rounded-xl px-3.5 py-2 text-xs font-bold"
              >
                导入原文
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="导入本集原文"
        subtitle={autoStartAfterImport ? '保存后将自动开始整集制作流程' : '保存后即可在画布上推进剧本拆解'}
        width={640}
      >
        <div className="grid gap-3">
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={12}
            placeholder="粘贴本集小说原文或剧本文本..."
            className="glass-input resize-y text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--glass-text-tertiary)]">{importText.trim().length} 字</p>
            <button
              type="button"
              disabled={!importText.trim() || importMutation.isPending}
              onClick={() => importMutation.mutate(importText.trim())}
              className="glass-btn-base glass-btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              {importMutation.isPending ? '保存中...' : autoStartAfterImport ? '保存并开始自动制作' : '保存原文'}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        open={refImageOpen}
        onClose={() => setRefImageOpen(false)}
        title="添加参考图"
        subtitle="贴一张画风/构图/角色参考到画布上"
        width={480}
      >
        <div className="grid gap-3">
          <input
            value={refImageUrl}
            onChange={(event) => setRefImageUrl(event.target.value)}
            placeholder="粘贴图片链接 https://..."
            className="glass-input text-sm"
          />
          <div className="flex items-center justify-between gap-3">
            <label className="glass-btn-base glass-btn-secondary cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold">
              {refImageUploading ? '上传中...' : '上传本地图片'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={refImageUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void handleAddRefImage(file)
                }}
              />
            </label>
            <button
              type="button"
              disabled={!refImageUrl.trim() || refImageUploading}
              onClick={() => void handleAddRefImage()}
              className="glass-btn-base glass-btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              添加到画布
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
