import { apiClient } from './client'
import type { AssetItem } from '../../types/project'

export async function listProjectAssets(projectId: string) {
  const response = await apiClient.get(`/projects/${projectId}/assets`)
  return response.data.data.assets as AssetItem[]
}

export async function listGlobalAssets() {
  const response = await apiClient.get('/global-assets')
  return response.data.data.assets as AssetItem[]
}

export async function createProjectCharacter(projectId: string, payload: { name: string; description?: string }) {
  const response = await apiClient.post(`/projects/${projectId}/characters`, payload)
  return response.data.data.asset as AssetItem
}

export async function createProjectLocation(projectId: string, payload: { name: string; description?: string }) {
  const response = await apiClient.post(`/projects/${projectId}/locations`, payload)
  return response.data.data.asset as AssetItem
}

export async function generateAsset(assetId: string, payload?: Record<string, unknown>) {
  const response = await apiClient.post(`/assets/${assetId}/generate`, payload ?? {})
  return response.data.data as { task_id: string; run_id?: string; status: string }
}

export async function modifyAsset(assetId: string, payload: { prompt: string; extra_image_urls?: string[] }) {
  const response = await apiClient.post(`/assets/${assetId}/modify`, payload)
  return response.data.data as { task_id: string; run_id?: string; status: string }
}
