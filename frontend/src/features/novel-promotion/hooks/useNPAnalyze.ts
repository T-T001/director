import { useMutation } from '@tanstack/react-query'

import * as api from '../../../services/api/novel-promotion'

export function useAnalyzeNPEpisode(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.analyzeNPEpisode(projectId, payload),
  })
}

export function useAnalyzeNPGlobal(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.analyzeNPGlobal(projectId, payload),
  })
}

export function useConvertNPScreenplay(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.convertNPScreenplay(projectId, payload),
  })
}

export function useStreamNPStoryToScript(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.streamNPStoryToScript(projectId, payload),
  })
}

export function useStreamNPScriptToStoryboard(projectId: string) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown> = {}) =>
      api.streamNPScriptToStoryboard(projectId, payload),
  })
}
