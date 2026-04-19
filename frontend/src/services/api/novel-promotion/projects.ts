import type { NPProject, NPProjectUpdate } from '../../../types/novel-promotion'
import { apiClient } from '../client'

export async function getNPProject(projectId: string) {
  const response = await apiClient.get(`/novel-promotion/${projectId}`)
  return response.data.data.np_project as NPProject
}

export async function updateNPProject(projectId: string, payload: NPProjectUpdate) {
  const response = await apiClient.patch(`/novel-promotion/${projectId}`, payload)
  return response.data.data.np_project as NPProject
}
