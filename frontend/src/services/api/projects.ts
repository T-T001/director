import { apiClient } from './client'
import type { Project, ProjectSettings, Workspace } from '../../types/project'

export async function listProjects() {
  const response = await apiClient.get('/projects')
  return response.data.data.projects as Project[]
}

export async function createProject(payload: { name: string; description?: string }) {
  const response = await apiClient.post('/projects', payload)
  return response.data.data.project as Project
}

export async function getProject(projectId: string) {
  const response = await apiClient.get(`/projects/${projectId}`)
  return response.data.data.project as Project
}

export async function updateProject(projectId: string, payload: { name?: string; description?: string | null }) {
  const response = await apiClient.patch(`/projects/${projectId}`, payload)
  return response.data.data.project as Project
}

export async function updateProjectSettings(projectId: string, payload: Partial<ProjectSettings>) {
  const response = await apiClient.patch(`/projects/${projectId}/settings`, payload)
  return response.data.data.settings as ProjectSettings
}

export async function deleteProject(projectId: string) {
  const response = await apiClient.delete(`/projects/${projectId}`)
  return response.data.data as { deleted: boolean }
}

export async function getWorkspace(projectId: string) {
  const response = await apiClient.get(`/projects/${projectId}/workspace`)
  return response.data.data as Workspace
}
