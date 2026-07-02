import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useCanvasPipelineStore } from '../../../app/store/canvas-pipeline.store'
import { listProjectAssets } from '../../../services/api/assets'
import { getWorkspace } from '../../../services/api/projects'
import { listStoryboards } from '../../../services/api/storyboards'
import { getTask } from '../../../services/api/tasks'
import { queryKeys } from '../../../services/queryKeys'
import { pipelineNodeOrder, type CanvasNodeId } from './canvas-graph'
import { nodeActions, type NodeActionContext } from './node-actions'

const POLL_INTERVAL_MS = 3000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isFailedStatus(status: string) {
  return /fail|error|cancel/i.test(status)
}

function isTerminalStatus(status: string) {
  return !['queued', 'processing', 'running'].includes(status)
}

export function usePipelineRunner({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const queryClient = useQueryClient()
  const runningRef = useRef(false)

  const fetchContext = useCallback(async (): Promise<NodeActionContext | null> => {
    const [workspace, assets, storyboards] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: queryKeys.projects.workspace(projectId),
        queryFn: () => getWorkspace(projectId),
        staleTime: 0,
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.assets.byProject(projectId),
        queryFn: () => listProjectAssets(projectId),
        staleTime: 0,
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.storyboards.byEpisode(episodeId),
        queryFn: () => listStoryboards(episodeId),
        staleTime: 0,
      }),
    ])
    const episode = workspace.episodes.find((item) => item.id === episodeId)
    if (!episode) return null
    return { episode, assets, panels: storyboards.flatMap((storyboard) => storyboard.panels) }
  }, [episodeId, projectId, queryClient])

  const waitForTasks = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return { ok: true as const }
    const pending = new Set(taskIds)
    while (pending.size > 0) {
      if (!useCanvasPipelineStore.getState().running) {
        return { ok: false as const, error: '已手动停止自动制作' }
      }
      await sleep(POLL_INTERVAL_MS)
      for (const taskId of [...pending]) {
        try {
          const task = await getTask(taskId)
          if (isFailedStatus(task.status)) {
            return { ok: false as const, error: task.error_message || `任务 ${task.task_type} 失败（${task.status}）` }
          }
          if (isTerminalStatus(task.status)) {
            pending.delete(taskId)
          }
        } catch {
          // 单次查询失败不终止流水线，下一轮重试
        }
      }
    }
    return { ok: true as const }
  }, [])

  const invalidateAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.byProject(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) }),
    ])
  }, [episodeId, projectId, queryClient])

  const startPipeline = useCallback(
    async (fromNodeId?: CanvasNodeId) => {
      if (runningRef.current) return
      runningRef.current = true
      const store = useCanvasPipelineStore.getState()
      store.start(episodeId, fromNodeId)

      try {
        const startIndex = fromNodeId ? Math.max(0, pipelineNodeOrder.indexOf(fromNodeId)) : 0
        for (const nodeId of pipelineNodeOrder.slice(startIndex)) {
          const { running, setStep, setCurrent } = useCanvasPipelineStore.getState()
          if (!running) break

          const action = nodeActions[nodeId]
          if (!action) {
            setStep(nodeId, { status: 'skipped', note: '该节点无自动动作' })
            continue
          }

          setCurrent(nodeId)
          const context = await fetchContext()
          if (!context) {
            setStep(nodeId, { status: 'failed', error: '剧集数据不存在' })
            break
          }

          const blocked = action.blockedReason(context)
          if (blocked) {
            if (action.optionalInPipeline) {
              setStep(nodeId, { status: 'skipped', note: `${blocked} · 已跳过` })
              continue
            }
            setStep(nodeId, { status: 'failed', error: blocked })
            break
          }

          const skip = action.skipReason?.(context)
          if (skip) {
            setStep(nodeId, { status: 'skipped', note: skip })
            continue
          }

          setStep(nodeId, { status: 'running' })
          let taskIds: string[] = []
          try {
            taskIds = await action.run(context)
          } catch (error) {
            setStep(nodeId, {
              status: 'failed',
              error: error instanceof Error ? error.message : '触发任务失败',
            })
            break
          }
          setStep(nodeId, { taskIds })

          const result = await waitForTasks(taskIds)
          await invalidateAll()
          if (!result.ok) {
            setStep(nodeId, { status: 'failed', error: result.error })
            break
          }
          setStep(nodeId, { status: 'done' })
        }
      } finally {
        runningRef.current = false
        useCanvasPipelineStore.getState().finish()
        await invalidateAll()
      }
    },
    [episodeId, fetchContext, invalidateAll, waitForTasks],
  )

  const stopPipeline = useCallback(() => {
    useCanvasPipelineStore.getState().stop()
  }, [])

  return { startPipeline, stopPipeline }
}
