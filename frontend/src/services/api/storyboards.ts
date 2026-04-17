import { apiClient } from './client'
import type { Storyboard } from '../../types/project'

export async function storyToScript(episodeId: string, payload: Record<string, unknown> = {}) {
  const response = await apiClient.post(`/episodes/${episodeId}/story-to-script`, payload)
  return response.data.data as { task_id: string; run_id: string; status: string }
}

export async function scriptToStoryboard(episodeId: string, payload: Record<string, unknown> = {}) {
  const response = await apiClient.post(`/episodes/${episodeId}/script-to-storyboard`, payload)
  return response.data.data as { task_id: string; run_id: string; status: string }
}

export async function listStoryboards(episodeId: string) {
  const response = await apiClient.get(`/episodes/${episodeId}/storyboards`)
  return response.data.data.storyboards as Storyboard[]
}

export async function getStoryboard(storyboardId: string) {
  const response = await apiClient.get(`/storyboards/${storyboardId}`)
  return response.data.data.storyboard as Storyboard
}

export async function updatePanel(panelId: string, payload: Record<string, unknown>) {
  const response = await apiClient.patch(`/panels/${panelId}`, payload)
  return response.data.data.panel as Storyboard['panels'][number]
}

export async function modifyPanelPrompt(panelId: string, payload: Record<string, unknown>) {
  const response = await apiClient.post(`/panels/${panelId}/prompt-modify`, payload)
  return response.data.data as { task_id: string; run_id: string; status: string; deduped: boolean }
}

export async function generatePanelVideo(panelId: string, payload: Record<string, unknown> = {}) {
  const response = await apiClient.post(`/panels/${panelId}/video-generate`, payload)
  return response.data.data as { task_id: string; run_id: string; status: string; deduped: boolean }
}

export async function lipSyncPanelVideo(panelId: string, payload: Record<string, unknown> = {}) {
  const response = await apiClient.post(`/panels/${panelId}/video-lipsync`, payload)
  return response.data.data as { task_id: string; run_id: string; status: string; deduped: boolean }
}
