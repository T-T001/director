import { useMutation } from '@tanstack/react-query'

import * as api from '../../../services/api/novel-promotion'

export function useGenerateNPImage(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.generateNPImage(projectId, payload),
  })
}

export function useGenerateNPVideo(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.generateNPVideo(projectId, payload),
  })
}

export function useLipSyncNPMedia(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.lipSyncNPMedia(projectId, payload),
  })
}

export function useDownloadNPImages(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.downloadNPImages(projectId, payload),
  })
}

export function useDownloadNPVideos(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.downloadNPVideos(projectId, payload),
  })
}

export function useDownloadNPVoices(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.downloadNPVoices(projectId, payload),
  })
}

export function useCopyNPFromGlobal(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.copyNPFromGlobal(projectId, payload),
  })
}

export function useCleanupNPUnselectedImages(projectId: string) {
  return useMutation({
    mutationFn: () => api.cleanupNPUnselectedImages(projectId),
  })
}
