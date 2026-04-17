import { apiClient } from './client'
import type { UserSettings } from '../../types/project'

export async function getSettings() {
  const response = await apiClient.get('/settings')
  return response.data.data.settings as UserSettings
}

export async function updateSettings(payload: Partial<UserSettings>) {
  const response = await apiClient.patch('/settings', payload)
  return response.data.data.settings as UserSettings
}
