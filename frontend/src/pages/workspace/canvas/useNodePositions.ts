import { useCallback, useState } from 'react'

import { canvasNodeDefs, type CanvasNodeId } from './canvas-graph'

type PositionMap = Partial<Record<CanvasNodeId, { x: number; y: number }>>

function storageKey(projectId: string) {
  return `director.canvas.layout.v1:${projectId}`
}

function defaultPositions(): Record<CanvasNodeId, { x: number; y: number }> {
  return Object.fromEntries(canvasNodeDefs.map((def) => [def.id, def.defaultPosition])) as Record<
    CanvasNodeId,
    { x: number; y: number }
  >
}

function loadPositions(projectId: string): Record<CanvasNodeId, { x: number; y: number }> {
  const base = defaultPositions()
  try {
    const raw = window.localStorage.getItem(storageKey(projectId))
    if (!raw) return base
    const saved = JSON.parse(raw) as PositionMap
    for (const def of canvasNodeDefs) {
      const position = saved[def.id]
      if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
        base[def.id] = { x: position.x, y: position.y }
      }
    }
  } catch {
    // 解析失败回退默认布局
  }
  return base
}

export function useNodePositions(projectId: string) {
  const [positions, setPositions] = useState(() => loadPositions(projectId))

  const savePosition = useCallback(
    (nodeId: CanvasNodeId, position: { x: number; y: number }) => {
      setPositions((current) => {
        const next = { ...current, [nodeId]: position }
        try {
          window.localStorage.setItem(storageKey(projectId), JSON.stringify(next))
        } catch {
          // 存储不可用时只保留内存布局
        }
        return next
      })
    },
    [projectId],
  )

  const resetLayout = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey(projectId))
    } catch {
      // ignore
    }
    setPositions(defaultPositions())
  }, [projectId])

  /** 按生产流拓扑排成整齐一行 */
  const arrangeLayout = useCallback(() => {
    const arranged = Object.fromEntries(
      canvasNodeDefs.map((def, index) => [def.id, { x: index * 330, y: 80 }]),
    ) as Record<CanvasNodeId, { x: number; y: number }>
    try {
      window.localStorage.setItem(storageKey(projectId), JSON.stringify(arranged))
    } catch {
      // ignore
    }
    setPositions(arranged)
  }, [projectId])

  return { positions, savePosition, resetLayout, arrangeLayout }
}
