import type {
  NPAICreateLocationPayload,
  NPAIModifyLocationPayload,
  NPLocation,
  NPLocationCreate,
  NPLocationUpdate,
  NPSelectLocationImagePayload,
  NPTaskQueued,
} from '../../../types/novel-promotion'
import { apiClient } from '../client'

export async function listNPLocations(projectId: string) {
  const response = await apiClient.get(`/novel-promotion/${projectId}/locations`)
  return response.data.data.locations as NPLocation[]
}

export async function createNPLocation(projectId: string, payload: NPLocationCreate) {
  const response = await apiClient.post(`/novel-promotion/${projectId}/locations`, payload)
  return response.data.data.location as NPLocation
}

export async function updateNPLocation(
  projectId: string,
  locationId: string,
  payload: NPLocationUpdate,
) {
  const response = await apiClient.patch(
    `/novel-promotion/${projectId}/locations/${locationId}`,
    payload,
  )
  return response.data.data.location as NPLocation
}

export async function deleteNPLocation(projectId: string, locationId: string) {
  const response = await apiClient.delete(
    `/novel-promotion/${projectId}/locations/${locationId}`,
  )
  return response.data.data as { deleted: true }
}

export async function selectNPLocationImage(
  projectId: string,
  locationId: string,
  payload: NPSelectLocationImagePayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/locations/${locationId}/select-image`,
    payload,
  )
  return response.data.data.location as NPLocation
}

export async function aiCreateNPLocation(projectId: string, payload: NPAICreateLocationPayload) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/locations/ai-create`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function aiModifyNPLocation(
  projectId: string,
  locationId: string,
  payload: NPAIModifyLocationPayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/locations/${locationId}/ai-modify`,
    payload,
  )
  return response.data.data as NPTaskQueued
}
