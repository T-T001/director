import { apiClient } from './client'

export async function listRunEvents(runId: string, afterSeq = 0) {
  const response = await apiClient.get(`/runs/${runId}/events`, {
    params: { afterSeq, limit: 200 },
  })
  return response.data.data as {
    run_id: string
    after_seq: number
    events: Array<{
      id: number
      run_id: string
      event_type: string
      step_key: string | null
      seq: number
      payload_json: Record<string, unknown> | null
      created_at: string
    }>
  }
}
