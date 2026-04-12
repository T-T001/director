import { apiClient } from './client'

export type TaskItem = {
  id: string
  task_type: string
  status: string
  progress: number
  target_type?: string | null
  target_id?: string | null
  run_id?: string | null
  updated_at: string
}

export async function createTask(payload: Record<string, unknown>) {
  const response = await apiClient.post('/tasks', payload)
  return response.data.data as { task_id: string; run_id?: string; status: string }
}

export async function getTask(taskId: string) {
  const response = await apiClient.get(`/tasks/${taskId}`)
  return response.data.data.task as TaskItem
}

export async function listProjectTasks(projectId: string) {
  const response = await apiClient.get(`/projects/${projectId}/tasks`)
  return response.data.data.tasks as TaskItem[]
}
