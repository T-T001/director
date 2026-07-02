import { create } from 'zustand'

import type { CanvasNodeId } from '../../pages/workspace/canvas/canvas-graph'
import { pipelineNodeOrder } from '../../pages/workspace/canvas/canvas-graph'

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped'

export type PipelineStepState = {
  nodeId: CanvasNodeId
  status: PipelineStepStatus
  taskIds: string[]
  note?: string
  error?: string
}

type CanvasPipelineState = {
  running: boolean
  episodeId: string | null
  currentNodeId: CanvasNodeId | null
  steps: PipelineStepState[]
  /** 手动单节点触发的任务，用于节点进度显示 */
  manualTasks: Partial<Record<CanvasNodeId, string[]>>
  start: (episodeId: string, fromNodeId?: CanvasNodeId) => void
  stop: () => void
  setStep: (nodeId: CanvasNodeId, patch: Partial<Omit<PipelineStepState, 'nodeId'>>) => void
  setCurrent: (nodeId: CanvasNodeId | null) => void
  finish: () => void
  setManualTasks: (nodeId: CanvasNodeId, taskIds: string[]) => void
}

function freshSteps(fromNodeId?: CanvasNodeId): PipelineStepState[] {
  const startIndex = fromNodeId ? Math.max(0, pipelineNodeOrder.indexOf(fromNodeId)) : 0
  return pipelineNodeOrder.map((nodeId, index) => ({
    nodeId,
    status: index < startIndex ? 'skipped' : 'pending',
    taskIds: [],
    note: index < startIndex ? '从后续节点重试，已跳过' : undefined,
  }))
}

export const useCanvasPipelineStore = create<CanvasPipelineState>((set) => ({
  running: false,
  episodeId: null,
  currentNodeId: null,
  steps: [],
  manualTasks: {},
  start: (episodeId, fromNodeId) =>
    set({ running: true, episodeId, currentNodeId: null, steps: freshSteps(fromNodeId) }),
  stop: () => set({ running: false, currentNodeId: null }),
  setStep: (nodeId, patch) =>
    set((state) => ({
      steps: state.steps.map((step) => (step.nodeId === nodeId ? { ...step, ...patch } : step)),
    })),
  setCurrent: (nodeId) => set({ currentNodeId: nodeId }),
  finish: () => set({ running: false, currentNodeId: null }),
  setManualTasks: (nodeId, taskIds) =>
    set((state) => ({ manualTasks: { ...state.manualTasks, [nodeId]: taskIds } })),
}))
