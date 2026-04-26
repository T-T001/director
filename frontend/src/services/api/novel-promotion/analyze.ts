import type { NPTaskQueued } from '../../../types/novel-promotion'
import { apiClient } from '../client'

export async function analyzeNPIntakePreview(
  projectId: string,
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post(`/novel-promotion/${projectId}/intake-preview`, payload)
  return response.data.data as NPTaskQueued
}

export async function analyzeNPEpisode(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(`/novel-promotion/${projectId}/analyze`, payload)
  return response.data.data as NPTaskQueued
}

export async function analyzeNPGlobal(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/analyze-global`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function convertNPScreenplay(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/screenplay-conversion`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function streamNPStoryToScript(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/story-to-script-stream`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function streamNPScriptToStoryboard(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/script-to-storyboard-stream`,
    payload,
  )
  return response.data.data as NPTaskQueued
}
