import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as api from '../../../services/api/novel-promotion'
import { queryKeys } from '../../../services/queryKeys'
import type {
  NPAICreateLocationPayload,
  NPAIModifyLocationPayload,
  NPLocationCreate,
  NPLocationUpdate,
  NPSelectLocationImagePayload,
} from '../../../types/novel-promotion'

export function useNPLocations(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.locations(projectId),
    queryFn: () => api.listNPLocations(projectId),
    enabled: !!projectId && enabled,
  })
}

export function useCreateNPLocation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPLocationCreate) => api.createNPLocation(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.locations(projectId),
      })
    },
  })
}

export function useUpdateNPLocation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { locationId: string; payload: NPLocationUpdate }) =>
      api.updateNPLocation(projectId, args.locationId, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.locations(projectId),
      })
    },
  })
}

export function useDeleteNPLocation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (locationId: string) => api.deleteNPLocation(projectId, locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.locations(projectId),
      })
    },
  })
}

export function useSelectNPLocationImage(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { locationId: string; payload: NPSelectLocationImagePayload }) =>
      api.selectNPLocationImage(projectId, args.locationId, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.locations(projectId),
      })
    },
  })
}

export function useAICreateNPLocation(projectId: string) {
  return useMutation({
    mutationFn: (payload: NPAICreateLocationPayload) =>
      api.aiCreateNPLocation(projectId, payload),
  })
}

export function useAIModifyNPLocation(projectId: string) {
  return useMutation({
    mutationFn: (args: { locationId: string; payload: NPAIModifyLocationPayload }) =>
      api.aiModifyNPLocation(projectId, args.locationId, args.payload),
  })
}
