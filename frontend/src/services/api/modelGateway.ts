import { apiClient } from './client'
import type {
  ModelConfig,
  ModelConfigCreatePayload,
  ModelConfigUpdatePayload,
  ModelTestResponse,
  Provider,
  ProviderCreatePayload,
  ProviderUpdatePayload,
} from '../../types/modelGateway'
import type { Capability } from '../../constants/modelCatalog'

export async function listProviders(): Promise<Provider[]> {
  const response = await apiClient.get('/providers')
  return response.data.data.providers as Provider[]
}

export async function createProvider(payload: ProviderCreatePayload): Promise<Provider> {
  const response = await apiClient.post('/providers', payload)
  return response.data.data.provider as Provider
}

export async function updateProvider(
  providerId: string,
  payload: ProviderUpdatePayload,
): Promise<Provider> {
  const response = await apiClient.patch(`/providers/${providerId}`, payload)
  return response.data.data.provider as Provider
}

export async function deleteProvider(providerId: string): Promise<void> {
  await apiClient.delete(`/providers/${providerId}`)
}

export async function listModels(capability?: Capability): Promise<ModelConfig[]> {
  const params = capability ? { capability } : undefined
  const response = await apiClient.get('/models', { params })
  return response.data.data.models as ModelConfig[]
}

export async function createModel(payload: ModelConfigCreatePayload): Promise<ModelConfig> {
  const response = await apiClient.post('/models', payload)
  return response.data.data.model as ModelConfig
}

export async function updateModel(
  modelId: string,
  payload: ModelConfigUpdatePayload,
): Promise<ModelConfig> {
  const response = await apiClient.patch(`/models/${modelId}`, payload)
  return response.data.data.model as ModelConfig
}

export async function deleteModel(modelId: string): Promise<void> {
  await apiClient.delete(`/models/${modelId}`)
}

export async function testModel(modelId: string): Promise<ModelTestResponse> {
  const response = await apiClient.post(`/models/${modelId}/test`)
  return response.data.data as ModelTestResponse
}
