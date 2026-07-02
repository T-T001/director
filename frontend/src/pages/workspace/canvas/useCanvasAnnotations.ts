import { useCallback, useState } from 'react'

export type CanvasAnnotation = {
  id: string
  kind: 'note' | 'image'
  text?: string
  url?: string
  position: { x: number; y: number }
}

function storageKey(projectId: string) {
  return `director.canvas.annotations.v1:${projectId}`
}

function loadAnnotations(projectId: string): CanvasAnnotation[] {
  try {
    const raw = window.localStorage.getItem(storageKey(projectId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as CanvasAnnotation[]
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && item.position) : []
  } catch {
    return []
  }
}

function persist(projectId: string, annotations: CanvasAnnotation[]) {
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(annotations))
  } catch {
    // 存储不可用时只保留内存数据
  }
}

export function useCanvasAnnotations(projectId: string) {
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>(() => loadAnnotations(projectId))

  const mutate = useCallback(
    (updater: (current: CanvasAnnotation[]) => CanvasAnnotation[]) => {
      setAnnotations((current) => {
        const next = updater(current)
        persist(projectId, next)
        return next
      })
    },
    [projectId],
  )

  const addNote = useCallback(
    (position: { x: number; y: number }) => {
      mutate((current) => [...current, { id: `note-${Date.now()}-${current.length}`, kind: 'note', text: '', position }])
    },
    [mutate],
  )

  const addImage = useCallback(
    (url: string, position: { x: number; y: number }) => {
      mutate((current) => [...current, { id: `image-${Date.now()}-${current.length}`, kind: 'image', url, position }])
    },
    [mutate],
  )

  const updateText = useCallback(
    (id: string, text: string) => {
      mutate((current) => current.map((item) => (item.id === id ? { ...item, text } : item)))
    },
    [mutate],
  )

  const move = useCallback(
    (id: string, position: { x: number; y: number }) => {
      mutate((current) => current.map((item) => (item.id === id ? { ...item, position } : item)))
    },
    [mutate],
  )

  const remove = useCallback(
    (id: string) => {
      mutate((current) => current.filter((item) => item.id !== id))
    },
    [mutate],
  )

  return { annotations, addNote, addImage, updateText, move, remove }
}
