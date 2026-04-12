import { apiClient } from './client'
import type { AuthPayload } from '../../types/auth'

export async function login(username: string, password: string) {
  const response = await apiClient.post('/auth/login', { username, password })
  return response.data.data as AuthPayload
}

export async function fetchMe() {
  const response = await apiClient.get('/auth/me')
  return response.data.data as AuthPayload['user']
}

export async function refreshAuth() {
  const response = await apiClient.post('/auth/refresh')
  return response.data.data as AuthPayload
}

export async function logout() {
  await apiClient.post('/auth/logout')
}
