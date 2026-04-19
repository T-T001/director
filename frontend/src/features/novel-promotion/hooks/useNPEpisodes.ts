import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as api from '../../../services/api/novel-promotion'
import { queryKeys } from '../../../services/queryKeys'
import type {
  NPClipCreate,
  NPClipUpdate,
  NPEpisodeBatchCreate,
  NPEpisodeCreate,
  NPEpisodeSplitByMarkersPayload,
  NPEpisodeSplitPayload,
  NPEpisodeUpdate,
} from '../../../types/novel-promotion'

export function useNPEpisodes(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.episodes(projectId),
    queryFn: () => api.listNPEpisodes(projectId),
    enabled: !!projectId && enabled,
  })
}

export function useNPEpisode(projectId: string, episodeId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.episode(projectId, episodeId),
    queryFn: () => api.getNPEpisode(projectId, episodeId),
    enabled: !!projectId && !!episodeId && enabled,
  })
}

export function useCreateNPEpisode(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPEpisodeCreate) => api.createNPEpisode(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.episodes(projectId),
      })
    },
  })
}

export function useBatchCreateNPEpisodes(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPEpisodeBatchCreate) =>
      api.batchCreateNPEpisodes(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.episodes(projectId),
      })
    },
  })
}

export function useUpdateNPEpisode(projectId: string, episodeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPEpisodeUpdate) =>
      api.updateNPEpisode(projectId, episodeId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.novelPromotion.episode(projectId, episodeId), data)
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.episodes(projectId),
      })
    },
  })
}

export function useDeleteNPEpisode(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (episodeId: string) => api.deleteNPEpisode(projectId, episodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.episodes(projectId),
      })
    },
  })
}

export function useSplitNPEpisode(projectId: string, episodeId: string) {
  return useMutation({
    mutationFn: (payload: NPEpisodeSplitPayload) =>
      api.splitNPEpisode(projectId, episodeId, payload),
  })
}

export function useSplitNPEpisodeByMarkers(projectId: string, episodeId: string) {
  return useMutation({
    mutationFn: (payload: NPEpisodeSplitByMarkersPayload) =>
      api.splitNPEpisodeByMarkers(projectId, episodeId, payload),
  })
}

export function useNPClips(projectId: string, episodeId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.clips(projectId, episodeId),
    queryFn: () => api.listNPClips(projectId, episodeId),
    enabled: !!projectId && !!episodeId && enabled,
  })
}

export function useNPClip(projectId: string, clipId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.clip(projectId, clipId),
    queryFn: () => api.getNPClip(projectId, clipId),
    enabled: !!projectId && !!clipId && enabled,
  })
}

export function useCreateNPClip(projectId: string, episodeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPClipCreate) => api.createNPClip(projectId, episodeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.clips(projectId, episodeId),
      })
    },
  })
}

export function useUpdateNPClip(projectId: string, episodeId: string, clipId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPClipUpdate) => api.updateNPClip(projectId, clipId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.novelPromotion.clip(projectId, clipId), data)
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.clips(projectId, episodeId),
      })
    },
  })
}

export function useDeleteNPClip(projectId: string, episodeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clipId: string) => api.deleteNPClip(projectId, clipId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.clips(projectId, episodeId),
      })
    },
  })
}
