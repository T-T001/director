import type {
  NPSpeakerVoicePayload,
  NPTaskQueued,
  NPVoiceLine,
  NPVoiceLineCreate,
  NPVoiceLineUpdate,
} from '../../../types/novel-promotion'
import { apiClient } from '../client'

export async function listNPVoiceLines(projectId: string, episodeId: string) {
  const response = await apiClient.get(
    `/novel-promotion/${projectId}/episodes/${episodeId}/voice-lines`,
  )
  return response.data.data.voice_lines as NPVoiceLine[]
}

export async function createNPVoiceLine(
  projectId: string,
  episodeId: string,
  payload: NPVoiceLineCreate,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/episodes/${episodeId}/voice-lines`,
    payload,
  )
  return response.data.data.voice_line as NPVoiceLine
}

export async function updateNPVoiceLine(
  projectId: string,
  voiceLineId: string,
  payload: NPVoiceLineUpdate,
) {
  const response = await apiClient.patch(
    `/novel-promotion/${projectId}/voice-lines/${voiceLineId}`,
    payload,
  )
  return response.data.data.voice_line as NPVoiceLine
}

export async function deleteNPVoiceLine(projectId: string, voiceLineId: string) {
  const response = await apiClient.delete(
    `/novel-promotion/${projectId}/voice-lines/${voiceLineId}`,
  )
  return response.data.data as { deleted: true }
}

export async function setNPSpeakerVoice(
  projectId: string,
  episodeId: string,
  payload: NPSpeakerVoicePayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/episodes/${episodeId}/speaker-voice`,
    payload,
  )
  return response.data.data as { speaker_voices: Record<string, string> }
}

export async function analyzeNPVoice(projectId: string, episodeId: string) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/episodes/${episodeId}/voice-analyze`,
  )
  return response.data.data as NPTaskQueued
}

export async function designNPVoice(
  projectId: string,
  episodeId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/episodes/${episodeId}/voice-design`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function generateNPVoice(projectId: string, episodeId: string) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/episodes/${episodeId}/voice-generate`,
  )
  return response.data.data as NPTaskQueued
}

export async function designNPVoiceGlobal(
  projectId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/voice-design-global`,
    payload,
  )
  return response.data.data as NPTaskQueued
}
