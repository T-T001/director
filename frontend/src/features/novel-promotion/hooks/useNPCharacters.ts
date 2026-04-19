import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as api from '../../../services/api/novel-promotion'
import { queryKeys } from '../../../services/queryKeys'
import type {
  NPAICreateCharacterPayload,
  NPAIModifyAppearancePayload,
  NPAppearanceCreate,
  NPAppearanceUpdate,
  NPBatchProfileConfirmPayload,
  NPCharacterCreate,
  NPCharacterUpdate,
  NPGenerateCharacterImagePayload,
  NPProfileConfirmPayload,
  NPReferenceToCharacterPayload,
  NPSelectCharacterImagePayload,
} from '../../../types/novel-promotion'

export function useNPCharacters(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.characters(projectId),
    queryFn: () => api.listNPCharacters(projectId),
    enabled: !!projectId && enabled,
  })
}

export function useNPCharacter(projectId: string, characterId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.character(projectId, characterId),
    queryFn: () => api.getNPCharacter(projectId, characterId),
    enabled: !!projectId && !!characterId && enabled,
  })
}

export function useCreateNPCharacter(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPCharacterCreate) => api.createNPCharacter(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.characters(projectId),
      })
    },
  })
}

export function useUpdateNPCharacter(projectId: string, characterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPCharacterUpdate) =>
      api.updateNPCharacter(projectId, characterId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.novelPromotion.character(projectId, characterId),
        data,
      )
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.characters(projectId),
      })
    },
  })
}

export function useDeleteNPCharacter(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (characterId: string) => api.deleteNPCharacter(projectId, characterId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.characters(projectId),
      })
    },
  })
}

export function useConfirmNPCharacterProfile(projectId: string, characterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPProfileConfirmPayload = {}) =>
      api.confirmNPCharacterProfile(projectId, characterId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.novelPromotion.character(projectId, characterId),
        data,
      )
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.characters(projectId),
      })
    },
  })
}

export function useBatchConfirmNPCharacterProfile(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPBatchProfileConfirmPayload) =>
      api.batchConfirmNPCharacterProfile(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.characters(projectId),
      })
    },
  })
}

export function useNPAppearances(projectId: string, characterId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.appearances(projectId, characterId),
    queryFn: () => api.listNPAppearances(projectId, characterId),
    enabled: !!projectId && !!characterId && enabled,
  })
}

export function useCreateNPAppearance(projectId: string, characterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPAppearanceCreate = {}) =>
      api.createNPAppearance(projectId, characterId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.appearances(projectId, characterId),
      })
    },
  })
}

export function useUpdateNPAppearance(projectId: string, characterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { appearanceId: string; payload: NPAppearanceUpdate }) =>
      api.updateNPAppearance(projectId, characterId, args.appearanceId, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.appearances(projectId, characterId),
      })
    },
  })
}

export function useConfirmNPAppearanceSelection(projectId: string, characterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (appearanceId: string) =>
      api.confirmNPAppearanceSelection(projectId, characterId, appearanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.appearances(projectId, characterId),
      })
    },
  })
}

export function useSelectNPCharacterImage(projectId: string, characterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPSelectCharacterImagePayload) =>
      api.selectNPCharacterImage(projectId, characterId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.appearances(projectId, characterId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.character(projectId, characterId),
      })
    },
  })
}

export function useAICreateNPCharacter(projectId: string) {
  return useMutation({
    mutationFn: (payload: NPAICreateCharacterPayload) =>
      api.aiCreateNPCharacter(projectId, payload),
  })
}

export function useAIModifyNPAppearance(projectId: string, characterId: string) {
  return useMutation({
    mutationFn: (payload: NPAIModifyAppearancePayload) =>
      api.aiModifyNPAppearance(projectId, characterId, payload),
  })
}

export function useReferenceToNPCharacter(projectId: string) {
  return useMutation({
    mutationFn: (payload: NPReferenceToCharacterPayload) =>
      api.referenceToNPCharacter(projectId, payload),
  })
}

export function useGenerateNPCharacterImage(projectId: string, characterId: string) {
  return useMutation({
    mutationFn: (payload: NPGenerateCharacterImagePayload = {}) =>
      api.generateNPCharacterImage(projectId, characterId, payload),
  })
}
