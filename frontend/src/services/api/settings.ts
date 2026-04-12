import { apiClient } from './client'
import type { ProjectSettings } from '../../types/project'

export async function getSettings() {
  const response = await apiClient.get('/settings')
  return response.data.data.settings as ProjectSettings
}

export async function updateSettings(payload: Partial<ProjectSettings>) {
  const response = await apiClient.patch('/settings', payload)
  return response.data.data.settings as ProjectSettings
}
