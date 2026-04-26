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

export type TemplateHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type TemplateContentType = 'application/json' | 'multipart/form-data' | 'application/x-www-form-urlencoded'
export type CompatMediaTemplateSource = 'manual' | 'ai'

export type TemplateEndpoint = {
  method: TemplateHttpMethod
  path: string
  contentType?: TemplateContentType | null
  headers?: Record<string, string> | null
  bodyTemplate?: unknown
  multipartFileFields?: string[] | null
}

export type TemplateResponseMap = {
  taskIdPath?: string | null
  statusPath?: string | null
  outputUrlPath?: string | null
  outputUrlsPath?: string | null
  errorPath?: string | null
}

export type TemplatePollingConfig = {
  intervalMs: number
  timeoutMs: number
  doneStates: string[]
  failStates: string[]
}

export type CompatMediaTemplate = {
  version: 1
  mediaType: 'image' | 'video'
  mode: 'sync' | 'async'
  create: TemplateEndpoint
  status?: TemplateEndpoint | null
  content?: TemplateEndpoint | null
  response: TemplateResponseMap
  polling?: TemplatePollingConfig | null
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
  compat_media_template: CompatMediaTemplate | null
  compat_media_template_source: CompatMediaTemplateSource | null
  compat_media_template_checked_at: string | null
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
  compat_media_template?: CompatMediaTemplate | null
  compat_media_template_source?: CompatMediaTemplateSource | null
  compat_media_template_checked_at?: string | null
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
  compat_media_template?: CompatMediaTemplate | null
  compat_media_template_source?: CompatMediaTemplateSource | null
  compat_media_template_checked_at?: string | null
}

export type ModelTestResponse = {
  success: boolean
  request_url: string
  status_code?: number | null
  response_preview?: string | null
  error?: string | null
}
