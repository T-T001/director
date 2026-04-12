import { apiClient } from './client'

export async function uploadFile(file: File, purpose?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (purpose) {
    formData.append('purpose', purpose)
  }

  const response = await apiClient.post('/files', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data.data as {
    id: string
    url?: string
    media_id?: string
  }
}
