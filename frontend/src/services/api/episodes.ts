import { apiClient } from './client'
import type { Episode } from '../../types/project'

export async function listEpisodes(projectId: string) {
  const response = await apiClient.get(`/projects/${projectId}/episodes`)
  return response.data.data.episodes as Episode[]
}

export async function createEpisode(projectId: string, payload: { name: string; description?: string; novel_text?: string }) {
  const response = await apiClient.post(`/projects/${projectId}/episodes`, payload)
  return response.data.data.episode as Episode
}

export async function getEpisode(episodeId: string) {
  const response = await apiClient.get(`/episodes/${episodeId}`)
  return response.data.data.episode as Episode
}

export async function updateEpisode(episodeId: string, payload: Partial<Pick<Episode, 'name' | 'description' | 'novel_text' | 'srt_content' | 'audio_media_id'>>) {
  const response = await apiClient.patch(`/episodes/${episodeId}`, payload)
  return response.data.data.episode as Episode
}

export async function deleteEpisode(episodeId: string) {
  const response = await apiClient.delete(`/episodes/${episodeId}`)
  return response.data.data as { deleted: boolean }
}
