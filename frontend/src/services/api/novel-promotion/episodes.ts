import type {
  NPClip,
  NPClipCreate,
  NPClipUpdate,
  NPEpisode,
  NPEpisodeBatchCreate,
  NPEpisodeCreate,
  NPEpisodeSplitByMarkersPayload,
  NPEpisodeSplitPayload,
  NPEpisodeUpdate,
  NPTaskQueued,
} from '../../../types/novel-promotion'
import { apiClient } from '../client'

export async function listNPEpisodes(projectId: string) {
  const response = await apiClient.get(`/novel-promotion/${projectId}/episodes`)
  return response.data.data.episodes as NPEpisode[]
}

export async function createNPEpisode(projectId: string, payload: NPEpisodeCreate) {
  const response = await apiClient.post(`/novel-promotion/${projectId}/episodes`, payload)
  return response.data.data.episode as NPEpisode
}

export async function batchCreateNPEpisodes(projectId: string, payload: NPEpisodeBatchCreate) {
  const response = await apiClient.post(`/novel-promotion/${projectId}/episodes/batch`, payload)
  return response.data.data.episodes as NPEpisode[]
}

export async function getNPEpisode(projectId: string, episodeId: string) {
  const response = await apiClient.get(`/novel-promotion/${projectId}/episodes/${episodeId}`)
  return response.data.data.episode as NPEpisode
}

export async function updateNPEpisode(
  projectId: string,
  episodeId: string,
  payload: NPEpisodeUpdate,
) {
  const response = await apiClient.patch(
    `/novel-promotion/${projectId}/episodes/${episodeId}`,
    payload,
  )
  return response.data.data.episode as NPEpisode
}

export async function deleteNPEpisode(projectId: string, episodeId: string) {
  const response = await apiClient.delete(`/novel-promotion/${projectId}/episodes/${episodeId}`)
  return response.data.data as { deleted: true }
}

export async function splitNPEpisode(
  projectId: string,
  episodeId: string,
  payload: NPEpisodeSplitPayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/episodes/${episodeId}/split`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function splitNPEpisodeByMarkers(
  projectId: string,
  episodeId: string,
  payload: NPEpisodeSplitByMarkersPayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/episodes/${episodeId}/split-by-markers`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function listNPClips(projectId: string, episodeId: string) {
  const response = await apiClient.get(
    `/novel-promotion/${projectId}/episodes/${episodeId}/clips`,
  )
  return response.data.data.clips as NPClip[]
}

export async function createNPClip(projectId: string, episodeId: string, payload: NPClipCreate) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/episodes/${episodeId}/clips`,
    payload,
  )
  return response.data.data.clip as NPClip
}

export async function getNPClip(projectId: string, clipId: string) {
  const response = await apiClient.get(`/novel-promotion/${projectId}/clips/${clipId}`)
  return response.data.data.clip as NPClip
}

export async function updateNPClip(projectId: string, clipId: string, payload: NPClipUpdate) {
  const response = await apiClient.patch(`/novel-promotion/${projectId}/clips/${clipId}`, payload)
  return response.data.data.clip as NPClip
}

export async function deleteNPClip(projectId: string, clipId: string) {
  const response = await apiClient.delete(`/novel-promotion/${projectId}/clips/${clipId}`)
  return response.data.data as { deleted: true }
}
