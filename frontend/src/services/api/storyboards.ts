import { apiClient } from './client'
import type { Storyboard } from '../../types/project'

export async function storyToScript(episodeId: string) {
  const response = await apiClient.post(`/episodes/${episodeId}/story-to-script`)
  return response.data.data as { task_id: string; run_id: string; status: string }
}

export async function scriptToStoryboard(episodeId: string) {
  const response = await apiClient.post(`/episodes/${episodeId}/script-to-storyboard`)
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
