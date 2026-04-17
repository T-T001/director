import { apiClient } from './client'

export type TaskItem = {
  id: string
  project_id?: string
  episode_id?: string | null
  task_type: string
  status: string
  progress: number
  target_type?: string | null
  target_id?: string | null
  run_id?: string | null
  updated_at: string
  created_at?: string
  error_message?: string | null
}

export async function createTask(payload: Record<string, unknown>) {
  const response = await apiClient.post('/tasks', payload)
  return response.data.data as { task_id: string; run_id?: string; status: string }
}

export async function getTask(taskId: string) {
  const response = await apiClient.get(`/tasks/${taskId}`)
  return response.data.data.task as TaskItem
}

export type TaskListFilters = {
  projectId?: string
  targetType?: string
  targetId?: string
  statuses?: string[]
  taskTypes?: string[]
  limit?: number
}

export async function listTasks(filters: TaskListFilters) {
  const response = await apiClient.get('/tasks', {
    params: {
      projectId: filters.projectId,
      targetType: filters.targetType,
      targetId: filters.targetId,
      status: filters.statuses,
      type: filters.taskTypes,
      limit: filters.limit ?? 50,
    },
  })
  return response.data.data.tasks as TaskItem[]
}

export async function listProjectTasks(projectId: string) {
  return listTasks({ projectId })
}
