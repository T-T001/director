import type { NPTaskQueued } from '../../../types/novel-promotion'
import { apiClient } from '../client'

export async function generateNPImage(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/generate-image`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function generateNPVideo(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/generate-video`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function lipSyncNPMedia(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(`/novel-promotion/${projectId}/lip-sync`, payload)
  return response.data.data as NPTaskQueued
}

export async function downloadNPImages(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/download-images`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function downloadNPVideos(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/download-videos`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function downloadNPVoices(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/download-voices`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function copyNPFromGlobal(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/copy-from-global`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function cleanupNPUnselectedImages(projectId: string) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/cleanup-unselected-images`,
  )
  return response.data.data as NPTaskQueued
}
