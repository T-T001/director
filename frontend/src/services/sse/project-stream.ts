import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../queryKeys'
import { createManagedEventSource } from './event-source'

type ProjectTaskEvent = {
  type?: string
  projectId?: string
  taskId?: string
  targetType?: string | null
  targetId?: string | null
  payload?: {
    targetType?: string | null
    targetId?: string | null
    episodeId?: string | null
  }
}

function resolveEpisodeId(event: ProjectTaskEvent) {
  return event.payload?.episodeId ?? null
}

export function useProjectTaskSSE(projectId: string | null | undefined, enabled = true) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!projectId || !enabled) return

    const url = `/api/sse/projects/${projectId}`

    const stream = createManagedEventSource<ProjectTaskEvent>(url, {
      eventNames: ['task.lifecycle'],
      onMessage: (event) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })

        const targetType = event.targetType ?? event.payload?.targetType ?? null
        const episodeId = resolveEpisodeId(event)

        if (targetType?.includes('Storyboard') && episodeId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
        }

        if (targetType?.includes('Asset')) {
          queryClient.invalidateQueries({ queryKey: queryKeys.assets.byProject(projectId) })
        }
      },
    })

    return () => stream.close()
  }, [enabled, projectId, queryClient])
}
