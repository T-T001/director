import type {
  NPPanel,
  NPPanelAIModifyPromptPayload,
  NPPanelCreate,
  NPPanelLinkPayload,
  NPPanelPromptUpdatePayload,
  NPPanelSelectCandidatePayload,
  NPPanelUpdate,
  NPPanelVariantPayload,
  NPShot,
  NPShotUpdate,
  NPStoryboard,
  NPStoryboardCreate,
  NPStoryboardUpdate,
  NPSupplementaryPanel,
  NPSupplementaryPanelCreate,
  NPTaskQueued,
} from '../../../types/novel-promotion'
import { apiClient } from '../client'

export async function listNPShots(projectId: string, episodeId: string) {
  const response = await apiClient.get(
    `/novel-promotion/${projectId}/episodes/${episodeId}/shots`,
  )
  return response.data.data.shots as NPShot[]
}

export async function updateNPShot(projectId: string, shotId: string, payload: NPShotUpdate) {
  const response = await apiClient.patch(
    `/novel-promotion/${projectId}/shots/${shotId}`,
    payload,
  )
  return response.data.data.shot as NPShot
}

export async function analyzeNPShotVariants(projectId: string, episodeId: string) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/episodes/${episodeId}/analyze-shot-variants`,
  )
  return response.data.data as NPTaskQueued
}

export async function getNPStoryboardForClip(projectId: string, clipId: string) {
  const response = await apiClient.get(
    `/novel-promotion/${projectId}/clips/${clipId}/storyboard`,
  )
  return response.data.data.storyboard as NPStoryboard | null
}

export async function createNPStoryboardForClip(
  projectId: string,
  clipId: string,
  payload: NPStoryboardCreate = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/clips/${clipId}/storyboard`,
    payload,
  )
  return response.data.data.storyboard as NPStoryboard
}

export async function getNPStoryboard(projectId: string, storyboardId: string) {
  const response = await apiClient.get(
    `/novel-promotion/${projectId}/storyboards/${storyboardId}`,
  )
  return response.data.data.storyboard as NPStoryboard
}

export async function updateNPStoryboard(
  projectId: string,
  storyboardId: string,
  payload: NPStoryboardUpdate,
) {
  const response = await apiClient.patch(
    `/novel-promotion/${projectId}/storyboards/${storyboardId}`,
    payload,
  )
  return response.data.data.storyboard as NPStoryboard
}

export async function addNPSupplementaryPanel(
  projectId: string,
  storyboardId: string,
  payload: NPSupplementaryPanelCreate,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/storyboards/${storyboardId}/supplementary-panels`,
    payload,
  )
  return response.data.data.supplementary_panel as NPSupplementaryPanel
}

export async function requestNPPhotographyPlan(projectId: string, storyboardId: string) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/storyboards/${storyboardId}/photography-plan`,
  )
  return response.data.data as NPTaskQueued
}

export async function regenerateNPStoryboardText(projectId: string, storyboardId: string) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/storyboards/${storyboardId}/regenerate-text`,
  )
  return response.data.data as NPTaskQueued
}

export async function regenerateNPStoryboardGroup(projectId: string, storyboardId: string) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/storyboards/${storyboardId}/regenerate-group`,
  )
  return response.data.data as NPTaskQueued
}

export async function listNPPanels(projectId: string, storyboardId: string) {
  const response = await apiClient.get(
    `/novel-promotion/${projectId}/storyboards/${storyboardId}/panels`,
  )
  return response.data.data.panels as NPPanel[]
}

export async function createNPPanel(
  projectId: string,
  storyboardId: string,
  payload: NPPanelCreate,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/storyboards/${storyboardId}/panels`,
    payload,
  )
  return response.data.data.panel as NPPanel
}

export async function getNPPanel(projectId: string, panelId: string) {
  const response = await apiClient.get(`/novel-promotion/${projectId}/panels/${panelId}`)
  return response.data.data.panel as NPPanel
}

export async function updateNPPanel(
  projectId: string,
  panelId: string,
  payload: NPPanelUpdate,
) {
  const response = await apiClient.patch(
    `/novel-promotion/${projectId}/panels/${panelId}`,
    payload,
  )
  return response.data.data.panel as NPPanel
}

export async function deleteNPPanel(projectId: string, panelId: string) {
  const response = await apiClient.delete(`/novel-promotion/${projectId}/panels/${panelId}`)
  return response.data.data as { deleted: true }
}

export async function linkNPPanel(
  projectId: string,
  panelId: string,
  payload: NPPanelLinkPayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/panels/${panelId}/link`,
    payload,
  )
  return response.data.data.panel as NPPanel
}

export async function selectNPPanelCandidate(
  projectId: string,
  panelId: string,
  payload: NPPanelSelectCandidatePayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/panels/${panelId}/select-candidate`,
    payload,
  )
  return response.data.data.panel as NPPanel
}

export async function updateNPPanelPrompt(
  projectId: string,
  panelId: string,
  payload: NPPanelPromptUpdatePayload,
) {
  const response = await apiClient.patch(
    `/novel-promotion/${projectId}/panels/${panelId}/prompt`,
    payload,
  )
  return response.data.data.panel as NPPanel
}

export async function insertNPPanel(
  projectId: string,
  storyboardId: string,
  atIndex: number,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/storyboards/${storyboardId}/insert-panel`,
    { at_index: atIndex },
  )
  return response.data.data.panel as NPPanel
}

export async function requestNPPanelVariant(
  projectId: string,
  panelId: string,
  payload: NPPanelVariantPayload = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/panels/${panelId}/variant`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function regenerateNPPanelImage(projectId: string, panelId: string) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/panels/${panelId}/regenerate-image`,
  )
  return response.data.data as NPTaskQueued
}

export async function regenerateNPPanelSingle(projectId: string, panelId: string) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/panels/${panelId}/regenerate-single`,
  )
  return response.data.data as NPTaskQueued
}

export async function modifyNPPanelImage(
  projectId: string,
  panelId: string,
  payload: Record<string, unknown> = {},
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/panels/${panelId}/modify-image`,
    payload,
  )
  return response.data.data as NPTaskQueued
}

export async function aiModifyNPPanelPrompt(
  projectId: string,
  panelId: string,
  payload: NPPanelAIModifyPromptPayload,
) {
  const response = await apiClient.post(
    `/novel-promotion/${projectId}/panels/${panelId}/ai-modify-prompt`,
    payload,
  )
  return response.data.data as NPTaskQueued
}
