import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as api from '../../../services/api/novel-promotion'
import { queryKeys } from '../../../services/queryKeys'
import type {
  NPSpeakerVoicePayload,
  NPVoiceLineCreate,
  NPVoiceLineUpdate,
} from '../../../types/novel-promotion'

export function useNPVoiceLines(projectId: string, episodeId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.voiceLines(projectId, episodeId),
    queryFn: () => api.listNPVoiceLines(projectId, episodeId),
    enabled: !!projectId && !!episodeId && enabled,
  })
}

export function useCreateNPVoiceLine(projectId: string, episodeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPVoiceLineCreate) =>
      api.createNPVoiceLine(projectId, episodeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.voiceLines(projectId, episodeId),
      })
    },
  })
}

export function useUpdateNPVoiceLine(projectId: string, episodeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { voiceLineId: string; payload: NPVoiceLineUpdate }) =>
      api.updateNPVoiceLine(projectId, args.voiceLineId, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.voiceLines(projectId, episodeId),
      })
    },
  })
}

export function useDeleteNPVoiceLine(projectId: string, episodeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (voiceLineId: string) => api.deleteNPVoiceLine(projectId, voiceLineId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.voiceLines(projectId, episodeId),
      })
    },
  })
}

export function useSetNPSpeakerVoice(projectId: string, episodeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPSpeakerVoicePayload) =>
      api.setNPSpeakerVoice(projectId, episodeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.episode(projectId, episodeId),
      })
    },
  })
}

export function useAnalyzeNPVoice(projectId: string, episodeId: string) {
  return useMutation({
    mutationFn: () => api.analyzeNPVoice(projectId, episodeId),
  })
}

export function useDesignNPVoice(projectId: string, episodeId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.designNPVoice(projectId, episodeId, payload),
  })
}

export function useGenerateNPVoice(projectId: string, episodeId: string) {
  return useMutation({
    mutationFn: () => api.generateNPVoice(projectId, episodeId),
  })
}

export function useDesignNPVoiceGlobal(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.designNPVoiceGlobal(projectId, payload),
  })
}
