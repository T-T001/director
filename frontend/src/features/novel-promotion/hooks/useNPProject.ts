import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as api from '../../../services/api/novel-promotion'
import { queryKeys } from '../../../services/queryKeys'
import type { NPProjectUpdate } from '../../../types/novel-promotion'

export function useNPProject(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.project(projectId),
    queryFn: () => api.getNPProject(projectId),
    enabled: !!projectId && enabled,
  })
}

export function useUpdateNPProject(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPProjectUpdate) => api.updateNPProject(projectId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.novelPromotion.project(projectId), data)
    },
  })
}
