import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as api from '../../../services/api/novel-promotion'
import { queryKeys } from '../../../services/queryKeys'
import type {
  NPPanelAIModifyPromptPayload,
  NPPanelCreate,
  NPPanelLinkPayload,
  NPPanelPromptUpdatePayload,
  NPPanelSelectCandidatePayload,
  NPPanelUpdate,
  NPPanelVariantPayload,
  NPShotUpdate,
  NPStoryboardCreate,
  NPStoryboardUpdate,
  NPSupplementaryPanelCreate,
} from '../../../types/novel-promotion'

export function useNPShots(projectId: string, episodeId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.shots(projectId, episodeId),
    queryFn: () => api.listNPShots(projectId, episodeId),
    enabled: !!projectId && !!episodeId && enabled,
  })
}

export function useUpdateNPShot(projectId: string, episodeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { shotId: string; payload: NPShotUpdate }) =>
      api.updateNPShot(projectId, args.shotId, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.shots(projectId, episodeId),
      })
    },
  })
}

export function useAnalyzeNPShotVariants(projectId: string, episodeId: string) {
  return useMutation({
    mutationFn: () => api.analyzeNPShotVariants(projectId, episodeId),
  })
}

export function useNPStoryboardForClip(projectId: string, clipId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.storyboardForClip(projectId, clipId),
    queryFn: () => api.getNPStoryboardForClip(projectId, clipId),
    enabled: !!projectId && !!clipId && enabled,
  })
}

export function useCreateNPStoryboardForClip(projectId: string, clipId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPStoryboardCreate = {}) =>
      api.createNPStoryboardForClip(projectId, clipId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.novelPromotion.storyboardForClip(projectId, clipId),
        data,
      )
    },
  })
}

export function useNPStoryboard(projectId: string, storyboardId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.storyboard(projectId, storyboardId),
    queryFn: () => api.getNPStoryboard(projectId, storyboardId),
    enabled: !!projectId && !!storyboardId && enabled,
  })
}

export function useUpdateNPStoryboard(projectId: string, storyboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPStoryboardUpdate) =>
      api.updateNPStoryboard(projectId, storyboardId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.novelPromotion.storyboard(projectId, storyboardId),
        data,
      )
    },
  })
}

export function useAddNPSupplementaryPanel(projectId: string, storyboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPSupplementaryPanelCreate) =>
      api.addNPSupplementaryPanel(projectId, storyboardId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.storyboard(projectId, storyboardId),
      })
    },
  })
}

export function useRequestNPPhotographyPlan(projectId: string, storyboardId: string) {
  return useMutation({
    mutationFn: () => api.requestNPPhotographyPlan(projectId, storyboardId),
  })
}

export function useRegenerateNPStoryboardText(projectId: string, storyboardId: string) {
  return useMutation({
    mutationFn: () => api.regenerateNPStoryboardText(projectId, storyboardId),
  })
}

export function useRegenerateNPStoryboardGroup(projectId: string, storyboardId: string) {
  return useMutation({
    mutationFn: () => api.regenerateNPStoryboardGroup(projectId, storyboardId),
  })
}

export function useNPPanels(projectId: string, storyboardId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.panels(projectId, storyboardId),
    queryFn: () => api.listNPPanels(projectId, storyboardId),
    enabled: !!projectId && !!storyboardId && enabled,
  })
}

export function useNPPanel(projectId: string, panelId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.novelPromotion.panel(projectId, panelId),
    queryFn: () => api.getNPPanel(projectId, panelId),
    enabled: !!projectId && !!panelId && enabled,
  })
}

export function useCreateNPPanel(projectId: string, storyboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPPanelCreate) => api.createNPPanel(projectId, storyboardId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.panels(projectId, storyboardId),
      })
    },
  })
}

export function useUpdateNPPanel(projectId: string, storyboardId: string, panelId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NPPanelUpdate) => api.updateNPPanel(projectId, panelId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.novelPromotion.panel(projectId, panelId), data)
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.panels(projectId, storyboardId),
      })
    },
  })
}

export function useDeleteNPPanel(projectId: string, storyboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (panelId: string) => api.deleteNPPanel(projectId, panelId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.panels(projectId, storyboardId),
      })
    },
  })
}

export function useLinkNPPanel(projectId: string, storyboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { panelId: string; payload: NPPanelLinkPayload }) =>
      api.linkNPPanel(projectId, args.panelId, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.panels(projectId, storyboardId),
      })
    },
  })
}

export function useSelectNPPanelCandidate(projectId: string, storyboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { panelId: string; payload: NPPanelSelectCandidatePayload }) =>
      api.selectNPPanelCandidate(projectId, args.panelId, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.panels(projectId, storyboardId),
      })
    },
  })
}

export function useUpdateNPPanelPrompt(projectId: string, storyboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { panelId: string; payload: NPPanelPromptUpdatePayload }) =>
      api.updateNPPanelPrompt(projectId, args.panelId, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.panels(projectId, storyboardId),
      })
    },
  })
}

export function useInsertNPPanel(projectId: string, storyboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (atIndex: number) => api.insertNPPanel(projectId, storyboardId, atIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.novelPromotion.panels(projectId, storyboardId),
      })
    },
  })
}

export function useRequestNPPanelVariant(projectId: string) {
  return useMutation({
    mutationFn: (args: { panelId: string; payload?: NPPanelVariantPayload }) =>
      api.requestNPPanelVariant(projectId, args.panelId, args.payload),
  })
}

export function useRegenerateNPPanelImage(projectId: string) {
  return useMutation({
    mutationFn: (panelId: string) => api.regenerateNPPanelImage(projectId, panelId),
  })
}

export function useRegenerateNPPanelSingle(projectId: string) {
  return useMutation({
    mutationFn: (panelId: string) => api.regenerateNPPanelSingle(projectId, panelId),
  })
}

export function useModifyNPPanelImage(projectId: string) {
  return useMutation({
    mutationFn: (args: { panelId: string; payload?: Record<string, unknown> }) =>
      api.modifyNPPanelImage(projectId, args.panelId, args.payload),
  })
}

export function useAIModifyNPPanelPrompt(projectId: string) {
  return useMutation({
    mutationFn: (args: { panelId: string; payload: NPPanelAIModifyPromptPayload }) =>
      api.aiModifyNPPanelPrompt(projectId, args.panelId, args.payload),
  })
}
