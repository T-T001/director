import type {
  NPAICreateCharacterPayload,
  NPAIModifyAppearancePayload,
  NPAppearance,
  NPAppearanceCreate,
  NPAppearanceUpdate,
  NPBatchProfileConfirmPayload,
  NPCharacter,
  NPCharacterCreate,
  NPCharacterUpdate,
  NPGenerateCharacterImagePayload,
  NPProfileConfirmPayload,
  NPReferenceToCharacterPayload,
  NPSelectCharacterImagePayload,
  NPTaskQueued,
} from '../../../types/novel-promotion'
import { apiClient } from '../client'

export async function listNPCharacters(projectId: string) {
  const response = await apiClient.get(`/novel-promotion/${projectId}/characters`)
  return response.data.data.characters as NPCharacter[]
}

export async function createNPCharacter(projectId: string, payload: NPCharacterCreate) {
  const response = await apiClient.post(`/novel-promotion/${projectId}/characters`, payload)
  return response.data.data.character as NPCharacter
}

export async function getNPCharacter(projectId: string, characterId: string) {
  const response = await apiClient.get(
    `/novel-promotion/${projectId}/characters/${characterId}`,
  )
  return response.data.data.character as NPCharacter
}

export async function updateNPCharacter(
  projectId: string,
  characterId: string,
  payload: NPCharacterUpdate,
) {
  const response = await apiClient.patch(
    `/novel-promotion/${projectId}/characters/${characterId}`,
    payload,
  )
  return response.data.data.character as NPCharacter
}

export async function deleteNPCharacter(projectId: string, characterId: string) {
  const response = await apiClient.delete(
    `/novel-promotion/${projectId}/characters/${characterId}`,
  )
  return response.data.data as { deleted: true }
}

export async function confirmNPCharacterProfile(
  projectId: string,
  characterId: string,
  payload: NPProfileConfirmPayload = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/characters/${characterId}/profile/confirm`,
    payload,
  )
  return response.data.data.character as NPCharacter
}

export async function batchConfirmNPCharacterProfile(
  projectId: string,
  payload: NPBatchProfileConfirmPayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/characters/profile/batch-confirm`,
    payload,
  )
  return response.data.data as { updated: number }
}

export async function listNPAppearances(projectId: string, characterId: string) {
  const response = await apiClient.get(
    `/novel-promotion/${projectId}/characters/${characterId}/appearances`,
  )
  return response.data.data.appearances as NPAppearance[]
}

export async function createNPAppearance(
  projectId: string,
  characterId: string,
  payload: NPAppearanceCreate = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/characters/${characterId}/appearances`,
    payload,
  )
  return response.data.data.appearance as NPAppearance
}

export async function updateNPAppearance(
  projectId: string,
  characterId: string,
  appearanceId: string,
  payload: NPAppearanceUpdate,
) {
  const response = await apiClient.patch(
    `/novel-promotion/${projectId}/characters/${characterId}/appearances/${appearanceId}`,
    payload,
  )
  return response.data.data.appearance as NPAppearance
}

export async function confirmNPAppearanceSelection(
  projectId: string,
  characterId: string,
  appearanceId: string,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/characters/${characterId}/appearances/${appearanceId}/confirm-selection`,
  )
  return response.data.data.appearance as NPAppearance
}

export async function selectNPCharacterImage(
  projectId: string,
  characterId: string,
  payload: NPSelectCharacterImagePayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/characters/${characterId}/select-image`,
    payload,
  )
  return response.data.data.appearance as NPAppearance
}

export async function aiCreateNPCharacter(
  projectId: string,
  payload: NPAICreateCharacterPayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/characters/ai-create`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function aiModifyNPAppearance(
  projectId: string,
  characterId: string,
  payload: NPAIModifyAppearancePayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/characters/${characterId}/ai-modify-appearance`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function referenceToNPCharacter(
  projectId: string,
  payload: NPReferenceToCharacterPayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/characters/reference`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function generateNPCharacterImage(
  projectId: string,
  characterId: string,
  payload: NPGenerateCharacterImagePayload = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/characters/${characterId}/generate-image`,
    payload,
  )
  return response.data.data as NPTaskQueued
}
