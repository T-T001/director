import type { Capability, Protocol } from '../constants/modelCatalog'

export type { Capability, Protocol }
export type ProviderApiType = 'openai' | 'anthropic' | 'gemini' | 'raw'

export type Provider = {
  id: string
  name: string
  base_url: string
  api_type: ProviderApiType
  has_api_key: boolean
  created_at: string
  updated_at: string
}

export type ProviderCreatePayload = {
  name: string
  base_url: string
  api_type?: ProviderApiType
  api_key?: string | null
}

export type ProviderUpdatePayload = {
  name?: string
  base_url?: string
  api_type?: ProviderApiType
  api_key?: string | null
}

export type ModelConfig = {
  id: string
  provider_id: string
  model_id: string
  display_name: string | null
  capability: Capability
  protocol: Protocol
  enabled: boolean
  request_path: string
  extra_headers: string | null
  default_params: string | null
  created_at: string
  updated_at: string
}

export type ModelConfigCreatePayload = {
  provider_id: string
  model_id: string
  display_name?: string | null
  capability: Capability
  protocol?: Protocol
  enabled?: boolean
  request_path: string
  extra_headers?: string | null
  default_params?: string | null
}

export type ModelConfigUpdatePayload = {
  model_id?: string
  display_name?: string | null
  capability?: Capability
  protocol?: Protocol
  enabled?: boolean
  request_path?: string
  extra_headers?: string | null
  default_params?: string | null
}

export type ModelTestResponse = {
  success: boolean
  request_url: string
  status_code?: number | null
  response_preview?: string | null
  error?: string | null
}
