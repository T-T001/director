import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Video,
  Volume2,
  X,
  Zap,
  ZapOff,
} from 'lucide-react'

import type { Capability, Protocol } from '../../../constants/modelCatalog'
import {
  CAPABILITY_LABEL,
  PROTOCOL_DESCRIPTION,
  PROTOCOL_LABEL,
} from '../../../constants/modelCatalog'
import type {
  CompatMediaTemplate,
  ModelConfig,
  ModelConfigCreatePayload,
  ModelConfigUpdatePayload,
  ModelTestResponse,
  Provider,
} from '../../../types/modelGateway'

export type TabType = 'llm' | 'image' | 'video' | 'audio'

const TAB_ORDER: TabType[] = ['llm', 'image', 'video', 'audio']

const TAB_LABEL: Record<TabType, string> = {
  llm: '文本',
  image: '图像',
  video: '视频',
  audio: '音频',
}

const CAPABILITY_TO_TAB: Record<Capability, TabType> = {
  chat: 'llm',
  embedding: 'llm',
  image: 'image',
  image_edit: 'image',
  video: 'video',
  lipsync: 'video',
  tts: 'audio',
  stt: 'audio',
}

const TAB_DEFAULT_CAPABILITY: Record<TabType, Capability> = {
  llm: 'chat',
  image: 'image',
  video: 'video',
  audio: 'tts',
}

const TAB_DEFAULT_PROTOCOL: Record<TabType, Protocol> = {
  llm: 'openai',
  image: 'openai-image',
  video: 'raw',
  audio: 'openai-tts',
}

function getDefaultProtocol(provider: Provider, tab: TabType): Protocol {
  if (tab === 'llm') {
    if (provider.api_type === 'anthropic') return 'anthropic'
    if (provider.api_type === 'gemini') return 'gemini'
    if (provider.api_type === 'raw') return 'raw'
    return 'openai'
  }
  return TAB_DEFAULT_PROTOCOL[tab]
}

const TAB_DEFAULT_PATH: Record<TabType, string> = {
  llm: '/v1/chat/completions',
  image: '/v1/images/generations',
  video: '/v1/videos/generations',
  audio: '/v1/audio/speech',
}

function TabIcon({ type, className = 'h-3.5 w-3.5' }: { type: TabType; className?: string }) {
  switch (type) {
    case 'llm':
      return <FileText className={className} />
    case 'image':
      return <ImageIcon className={className} />
    case 'video':
      return <Video className={className} />
    case 'audio':
      return <Volume2 className={className} />
  }
}

type NewModelDraft = {
  display_name: string
  model_id: string
  capability: Capability
  protocol: Protocol
  request_path: string
  compat_media_template: string
}

type EditModelDraft = NewModelDraft & { id: string }

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | {
      status: 'passed' | 'failed'
      result: ModelTestResponse
      modelDisplay: string
    }

type Props = {
  provider: Provider
  models: ModelConfig[]
  defaultModelIds: string[]
  onUpdateProvider: (payload: { name?: string; base_url?: string; api_key?: string | null }) => void
  onDeleteProvider: () => void
  onAddModel: (payload: ModelConfigCreatePayload) => Promise<void> | void
  onUpdateModel: (modelId: string, payload: ModelConfigUpdatePayload) => Promise<void> | void
  onDeleteModel: (modelId: string) => void
  onToggleModel: (modelId: string, enabled: boolean) => void
  onTestProvider: (model: ModelConfig) => Promise<ModelTestResponse>
  onTestModel: (model: ModelConfig) => Promise<ModelTestResponse>
  savingKey?: boolean
  savingUrl?: boolean
  savingModel?: boolean
}

function maskApiKey(hasKey: boolean): string {
  return hasKey ? '••••••••••••••••••••••••' : ''
}

function matchesTab(model: ModelConfig, tab: TabType): boolean {
  return CAPABILITY_TO_TAB[model.capability] === tab
}

function formatFullUrl(baseUrl: string, path: string): string {
  const b = baseUrl.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

function stringifyTemplate(template: CompatMediaTemplate | null | undefined): string {
  if (!template) return ''
  return JSON.stringify(template, null, 2)
}

function parseTemplate(raw: string): CompatMediaTemplate | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  return JSON.parse(trimmed) as CompatMediaTemplate
}

function inferProviderBadge(models: ModelConfig[], baseUrl: string): string | null {
  const protocols = new Set(models.map((model) => model.protocol))
  if (protocols.has('anthropic')) return PROTOCOL_LABEL.anthropic
  if (protocols.has('gemini')) return PROTOCOL_LABEL.gemini
  if (
    protocols.has('openai') ||
    protocols.has('openai-image') ||
    protocols.has('openai-tts') ||
    protocols.has('openai-embedding')
  ) {
    return PROTOCOL_LABEL.openai
  }

  const normalized = baseUrl.toLowerCase()
  if (normalized.includes('anthropic')) return PROTOCOL_LABEL.anthropic
  if (normalized.includes('generativelanguage.googleapis.com')) return PROTOCOL_LABEL.gemini
  if (normalized.includes('openai') || normalized.includes('compatible') || normalized.includes('openrouter')) {
    return PROTOCOL_LABEL.openai
  }
  return null
}

export function ProviderCard({
  provider,
  models,
  defaultModelIds,
  onUpdateProvider,
  onDeleteProvider,
  onAddModel,
  onUpdateModel,
  onDeleteModel,
  onToggleModel,
  onTestProvider,
  onTestModel,
  savingKey,
  savingUrl,
  savingModel,
}: Props) {
  // --- api key edit state ---
  const [isEditingKey, setIsEditingKey] = useState(false)
  const [tempKey, setTempKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  // --- base url edit state ---
  const [isEditingUrl, setIsEditingUrl] = useState(false)
  const [tempUrl, setTempUrl] = useState(provider.base_url)

  // --- tabs & add form ---
  const [activeTab, setActiveTab] = useState<TabType>('llm')
  const [addFormTab, setAddFormTab] = useState<TabType | null>(null)
  const [newModel, setNewModel] = useState<NewModelDraft>({
    display_name: '',
    model_id: '',
    capability: 'chat',
    protocol: 'openai',
    request_path: '/v1/chat/completions',
    compat_media_template: '',
  })

  // --- model edit state ---
  const [editingModel, setEditingModel] = useState<EditModelDraft | null>(null)

  // --- test state ---
  const [test, setTest] = useState<TestState>({ status: 'idle' })

  useEffect(() => {
    setTempUrl(provider.base_url)
  }, [provider.base_url])

  const grouped = useMemo(() => {
    const map: Record<TabType, ModelConfig[]> = { llm: [], image: [], video: [], audio: [] }
    for (const m of models) {
      map[CAPABILITY_TO_TAB[m.capability]].push(m)
    }
    return map
  }, [models])

  const currentModels = grouped[activeTab]
  const providerBadge = useMemo(() => inferProviderBadge(models, provider.base_url), [models, provider.base_url])

  const startEditKey = () => {
    setTempKey('')
    setIsEditingKey(true)
  }

  const saveKey = () => {
    onUpdateProvider({ api_key: tempKey })
    setIsEditingKey(false)
    setTempKey('')
  }

  const clearKey = () => {
    if (!confirm(`确认清空「${provider.name}」的 API Key?`)) return
    onUpdateProvider({ api_key: '' })
    setIsEditingKey(false)
    setTempKey('')
  }

  const startEditUrl = () => {
    setTempUrl(provider.base_url)
    setIsEditingUrl(true)
  }

  const saveUrl = () => {
    onUpdateProvider({ base_url: tempUrl.trim() })
    setIsEditingUrl(false)
  }

  const openAddForm = (tab: TabType) => {
    setAddFormTab(tab)
    setNewModel({
      display_name: '',
      model_id: '',
      capability: TAB_DEFAULT_CAPABILITY[tab],
      protocol: getDefaultProtocol(provider, tab),
      request_path: TAB_DEFAULT_PATH[tab],
      compat_media_template: '',
    })
  }

  const closeAddForm = () => setAddFormTab(null)

  const submitAdd = async () => {
    if (!newModel.model_id.trim()) return
    await onAddModel({
      provider_id: provider.id,
      model_id: newModel.model_id.trim(),
      display_name: newModel.display_name.trim() || null,
      capability: newModel.capability,
      protocol: newModel.protocol,
      enabled: true,
      request_path: newModel.request_path.trim(),
      compat_media_template: parseTemplate(newModel.compat_media_template),
      compat_media_template_source: newModel.compat_media_template.trim() ? 'manual' : null,
    })
    closeAddForm()
  }

  const startEditModel = (model: ModelConfig) => {
    setEditingModel({
      id: model.id,
      display_name: model.display_name ?? '',
      model_id: model.model_id,
      capability: model.capability,
      protocol: model.protocol,
      request_path: model.request_path,
      compat_media_template: stringifyTemplate(model.compat_media_template),
    })
  }

  const submitEditModel = async () => {
    if (!editingModel) return
    await onUpdateModel(editingModel.id, {
      model_id: editingModel.model_id.trim(),
      display_name: editingModel.display_name.trim() || null,
      capability: editingModel.capability,
      protocol: editingModel.protocol,
      request_path: editingModel.request_path.trim(),
      compat_media_template: parseTemplate(editingModel.compat_media_template),
      compat_media_template_source: editingModel.compat_media_template.trim() ? 'manual' : null,
    })
    setEditingModel(null)
  }

  const runTest = async (model: ModelConfig, source: 'provider' | 'model') => {
    setTest({ status: 'testing' })
    try {
      const fn = source === 'provider' ? onTestProvider : onTestModel
      const result = await fn(model)
      setTest({
        status: result.success ? 'passed' : 'failed',
        result,
        modelDisplay: model.display_name ?? model.model_id,
      })
    } catch (error) {
      setTest({
        status: 'failed',
        result: {
          success: false,
          request_url: formatFullUrl(provider.base_url, model.request_path),
          status_code: null,
          response_preview: null,
          error: error instanceof Error ? error.message : '测试失败',
        },
        modelDisplay: model.display_name ?? model.model_id,
      })
    }
  }

  const canTestProvider = provider.has_api_key && models.length > 0
  const firstChatOrAny = useMemo(
    () => models.find((m) => m.capability === 'chat' && m.enabled) ?? models.find((m) => m.enabled) ?? models[0],
    [models],
  )

  return (
    <div className="glass-surface overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)]"
            title="收起 (v2 实现)"
            disabled
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <h3 className="truncate text-[15px] font-bold text-[var(--glass-text-primary)]">
            {provider.name}
          </h3>
          {providerBadge ? (
            <span className="shrink-0 rounded-full border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--glass-text-secondary)]">
              {providerBadge}
            </span>
          ) : null}
          <span
            title={provider.has_api_key ? '已连接' : '未配置 Key'}
            className={provider.has_api_key ? 'text-[var(--glass-tone-success-fg)]' : 'text-[var(--glass-tone-danger-fg)]'}
          >
            {provider.has_api_key ? <Zap className="h-3.5 w-3.5" /> : <ZapOff className="h-3.5 w-3.5" />}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => firstChatOrAny && runTest(firstChatOrAny, 'provider')}
            disabled={!canTestProvider || test.status === 'testing'}
            className={[
              'flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all',
              canTestProvider && test.status !== 'testing'
                ? 'cursor-pointer border-[var(--glass-stroke-base)] text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-text-primary)]'
                : 'cursor-not-allowed border-[var(--glass-stroke-base)] text-[var(--glass-text-tertiary)] opacity-40',
            ].join(' ')}
            title={canTestProvider ? '测试连接' : '请先配置 API Key 并添加模型'}
          >
            <RefreshCw className={`h-3 w-3 ${test.status === 'testing' ? 'animate-spin' : ''}`} />
            测试连接
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`确认删除「${provider.name}」?其下所有模型会一并被删除。`)) {
                onDeleteProvider()
              }
            }}
            className="rounded p-1 text-[var(--glass-text-tertiary)] transition-colors hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-tone-danger-fg)]"
            title="删除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {provider.base_url.startsWith('http') ? (
            <a
              href={provider.base_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-[var(--glass-stroke-base)] px-2 py-1 text-[11px] font-medium text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]"
            >
              <BookOpen className="h-3 w-3" />
              开通教程
            </a>
          ) : null}
        </div>
      </div>

      {/* API Key row */}
      <div className="px-3.5 pt-1">
        <div className="flex items-center gap-2.5 rounded-xl glass-field px-3 py-2">
          <span className="w-[64px] shrink-0 whitespace-nowrap text-[12px] font-semibold text-[var(--glass-text-primary)]">
            API Key
          </span>
          {isEditingKey ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="粘贴 API Key"
                className="glass-input flex-1 px-3 py-1.5 text-[12px]"
                autoFocus
              />
              <button
                onClick={saveKey}
                disabled={savingKey}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--glass-stroke-base)] text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)] disabled:opacity-50"
                title="保存"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditingKey(false)
                  setTempKey('')
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--glass-stroke-base)] text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]"
                title="取消"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : provider.has_api_key ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1 truncate rounded-lg bg-[var(--glass-bg-muted)] px-3 py-1.5 font-mono text-[12px] text-[var(--glass-text-secondary)]">
                {showKey ? '(已加密保存,无法显示原值)' : maskApiKey(true)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]"
                  title={showKey ? '隐藏' : '显示'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={startEditKey}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]"
                  title="修改"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={clearKey}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-tone-danger-fg)]"
                  title="清空"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startEditKey}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--glass-stroke-strong)] bg-[var(--glass-tone-info-bg)] px-2.5 text-[12px] font-semibold text-[var(--glass-tone-info-fg)] transition-colors hover:bg-[rgba(72,209,204,0.22)]"
            >
              <Plus className="h-3.5 w-3.5" />
              连接
            </button>
          )}
        </div>
      </div>

      {/* Base URL row */}
      <div className="px-3.5 pb-2 pt-2">
        <div className="flex items-center gap-2.5 rounded-xl glass-field px-3 py-2">
          <span className="w-[64px] shrink-0 whitespace-nowrap text-[12px] font-semibold text-[var(--glass-text-tertiary)]">
            Base URL
          </span>
          {isEditingUrl ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="https://api.example.com"
                className="glass-input flex-1 px-3 py-1.5 font-mono text-[12px]"
                autoFocus
              />
              <button
                onClick={saveUrl}
                disabled={savingUrl}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--glass-stroke-base)] text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)] disabled:opacity-50"
                title="保存"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditingUrl(false)
                  setTempUrl(provider.base_url)
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--glass-stroke-base)] text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]"
                title="取消"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1 truncate rounded-lg bg-[var(--glass-bg-muted)] px-3 py-1.5 font-mono text-[12px] text-[var(--glass-text-secondary)]">
                {provider.base_url}
              </span>
              <button
                onClick={startEditUrl}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]"
                title="修改"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Test result panel */}
      {test.status !== 'idle' ? (
        <div className="px-3.5 pb-2">
          <div
            className={[
              'space-y-1 rounded-xl border p-3 text-[12px]',
              test.status === 'passed'
                ? 'border-[rgba(79,209,143,0.4)] glass-success'
                : test.status === 'failed'
                  ? 'border-[rgba(255,107,95,0.4)] glass-danger'
                  : 'glass-field',
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                {test.status === 'testing' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--glass-text-tertiary)]" />
                    <span>测试中...</span>
                  </>
                ) : test.status === 'passed' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[var(--glass-tone-success-fg)]" />
                    <span className="text-[var(--glass-tone-success-fg)]">测试通过</span>
                    <span className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] text-[var(--glass-text-secondary)]">
                      {test.modelDisplay}
                    </span>
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5 text-[var(--glass-tone-danger-fg)]" />
                    <span className="text-[var(--glass-tone-danger-fg)]">测试失败</span>
                    <span className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] text-[var(--glass-text-secondary)]">
                      {test.modelDisplay}
                    </span>
                  </>
                )}
              </div>
              {test.status !== 'testing' ? (
                <button
                  onClick={() => setTest({ status: 'idle' })}
                  className="rounded p-1 text-[var(--glass-text-tertiary)] hover:bg-[var(--glass-bg-muted)]"
                  title="关闭"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
            {test.status !== 'testing' ? (
              <>
                {test.result.status_code ? (
                  <p className="text-[11px] text-[var(--glass-text-secondary)]">
                    HTTP {test.result.status_code}
                  </p>
                ) : null}
                {test.result.request_url ? (
                  <p className="truncate text-[11px] text-[var(--glass-text-tertiary)]">
                    URL: {test.result.request_url}
                  </p>
                ) : null}
                {test.result.response_preview ? (
                  <p className="line-clamp-2 break-all text-[11px] text-[var(--glass-text-secondary)]">
                    预览: {test.result.response_preview}
                  </p>
                ) : null}
                {test.result.error ? (
                  <p className="line-clamp-2 text-[11px] text-[var(--glass-tone-danger-fg)]">错误: {test.result.error}</p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Tab bar */}
      <div className="px-3.5">
        <div className="glass-segment">
          {TAB_ORDER.map((tab) => {
            const active = tab === activeTab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  'glass-segment-btn flex-1 px-2 py-1.5 text-[12px] font-medium',
                  active ? 'glass-segment-btn-active' : '',
                ].join(' ')}
              >
                <TabIcon type={tab} />
                <span>{TAB_LABEL[tab]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab header + add button */}
      <div className="flex items-center justify-between px-4 pt-2">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--glass-text-primary)]">
          <TabIcon type={activeTab} />
          <span>{TAB_LABEL[activeTab]}</span>
          <span className="rounded-full bg-[var(--glass-bg-muted)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--glass-text-secondary)]">
            {currentModels.length}
          </span>
        </div>
        {addFormTab !== activeTab ? (
          <button
            onClick={() => openAddForm(activeTab)}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--glass-stroke-base)] bg-white/[0.05] px-2 py-1 text-[12px] font-medium text-[var(--glass-text-secondary)] transition-colors hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/10 hover:text-[var(--glass-text-primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
            添加
          </button>
        ) : null}
      </div>

      {/* Add form */}
      {addFormTab === activeTab ? (
        <div className="mx-3.5 mt-2 rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)] p-3 shadow-[var(--glass-shadow-sm)]">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              value={newModel.display_name}
              onChange={(e) => setNewModel({ ...newModel, display_name: e.target.value })}
              placeholder="显示名称 (可选)"
              className="glass-input flex-1 px-3 py-1.5 text-[12px]"
              autoFocus
            />
            <button
              onClick={closeAddForm}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              value={newModel.model_id}
              onChange={(e) => setNewModel({ ...newModel, model_id: e.target.value })}
              placeholder="Model ID (如 gpt-4o)"
              className="glass-input flex-1 px-3 py-1.5 font-mono text-[12px]"
            />
            <button
              onClick={submitAdd}
              disabled={savingModel || !newModel.model_id.trim()}
              className="glass-btn glass-btn-primary px-3 py-1.5 text-[12px] font-medium"
            >
              {savingModel ? '保存中...' : '保存'}
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <select
              value={newModel.capability}
              onChange={(e) => setNewModel({ ...newModel, capability: e.target.value as Capability })}
              className="glass-input px-2 py-1.5 text-[11px]"
            >
              {(Object.keys(CAPABILITY_LABEL) as Capability[])
                .filter((cap) => CAPABILITY_TO_TAB[cap] === activeTab)
                .map((cap) => (
                  <option key={cap} value={cap}>
                    能力: {CAPABILITY_LABEL[cap]}
                  </option>
                ))}
            </select>
            <select
              value={newModel.protocol}
              onChange={(e) => setNewModel({ ...newModel, protocol: e.target.value as Protocol })}
              className="glass-input px-2 py-1.5 text-[11px]"
            >
              {(Object.keys(PROTOCOL_LABEL) as Protocol[]).map((p) => (
                <option key={p} value={p}>
                  协议: {PROTOCOL_LABEL[p]}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newModel.request_path}
              onChange={(e) => setNewModel({ ...newModel, request_path: e.target.value })}
              placeholder="Request Path"
              className="glass-input px-3 py-1.5 font-mono text-[11px]"
            />
          </div>
          <p className="mt-2 line-clamp-2 text-[10px] text-[var(--glass-text-tertiary)]">
            {PROTOCOL_DESCRIPTION[newModel.protocol]}
          </p>
          <textarea
            value={newModel.compat_media_template}
            onChange={(e) => setNewModel({ ...newModel, compat_media_template: e.target.value })}
            placeholder="Compat Media Template(JSON，可选)"
            className="glass-input mt-2 min-h-[120px] w-full px-3 py-2 font-mono text-[11px]"
          />
        </div>
      ) : null}

      {/* Model list */}
      <div className="px-3.5 pb-3 pt-2">
        <div
          className="max-h-[280px] overflow-y-auto rounded-xl glass-field p-2"
          style={{ scrollbarGutter: 'stable' }}
        >
          {currentModels.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[var(--glass-text-tertiary)]">
              该类别下暂无模型,点击右上方"添加"按钮或前往目录挑选。
            </div>
          ) : (
            <div className="space-y-2">
              {currentModels.map((model) =>
                editingModel && editingModel.id === model.id ? (
                  <div
                    key={model.id}
                    className="rounded-xl border border-[var(--glass-stroke-strong)] bg-[var(--glass-bg-surface-strong)] p-3 shadow-[var(--glass-shadow-sm)]"
                  >
                    <div className="mb-2 grid gap-2 md:grid-cols-2">
                      <input
                        type="text"
                        value={editingModel.display_name}
                        onChange={(e) =>
                          setEditingModel({ ...editingModel, display_name: e.target.value })
                        }
                        placeholder="显示名称"
                        className="glass-input px-3 py-1.5 text-[12px]"
                      />
                      <input
                        type="text"
                        value={editingModel.model_id}
                        onChange={(e) =>
                          setEditingModel({ ...editingModel, model_id: e.target.value })
                        }
                        placeholder="Model ID"
                        className="glass-input px-3 py-1.5 font-mono text-[12px]"
                      />
                    </div>
                    <div className="mb-2 grid gap-2 md:grid-cols-3">
                      <select
                        value={editingModel.capability}
                        onChange={(e) =>
                          setEditingModel({
                            ...editingModel,
                            capability: e.target.value as Capability,
                          })
                        }
                        className="glass-input px-2 py-1.5 text-[11px]"
                      >
                        {(Object.keys(CAPABILITY_LABEL) as Capability[]).map((cap) => (
                          <option key={cap} value={cap}>
                            {CAPABILITY_LABEL[cap]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editingModel.protocol}
                        onChange={(e) =>
                          setEditingModel({
                            ...editingModel,
                            protocol: e.target.value as Protocol,
                          })
                        }
                        className="glass-input px-2 py-1.5 text-[11px]"
                      >
                        {(Object.keys(PROTOCOL_LABEL) as Protocol[]).map((p) => (
                          <option key={p} value={p}>
                            {PROTOCOL_LABEL[p]}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editingModel.request_path}
                        onChange={(e) =>
                          setEditingModel({ ...editingModel, request_path: e.target.value })
                        }
                        placeholder="Request Path"
                        className="glass-input px-3 py-1.5 font-mono text-[11px]"
                      />
                    </div>
                    <textarea
                      value={editingModel.compat_media_template}
                      onChange={(e) =>
                        setEditingModel({ ...editingModel, compat_media_template: e.target.value })
                      }
                      placeholder="Compat Media Template(JSON，可选)"
                      className="glass-input mb-2 min-h-[140px] w-full px-3 py-2 font-mono text-[11px]"
                    />
                    <div className="flex items-center justify-between">
                      <p className="truncate text-[10px] text-[var(--glass-accent-cyan)]">
                        Full URL → {formatFullUrl(provider.base_url, editingModel.request_path)}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingModel(null)}
                          className="rounded-md px-2 py-1 text-[12px] text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]"
                        >
                          取消
                        </button>
                        <button
                          onClick={submitEditModel}
                          disabled={savingModel}
                          className="glass-btn glass-btn-primary px-3 py-1 text-[12px]"
                        >
                          {savingModel ? '保存中...' : '保存'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ModelRow
                    key={model.id}
                    model={model}
                    baseUrl={provider.base_url}
                    isDefault={defaultModelIds.includes(model.model_id)}
                    hasApiKey={provider.has_api_key}
                    onEdit={() => startEditModel(model)}
                    onDelete={() => {
                      if (confirm(`确认删除「${model.display_name ?? model.model_id}」?`)) {
                        onDeleteModel(model.id)
                      }
                    }}
                    onToggle={(next) => onToggleModel(model.id, next)}
                    onTest={() => runTest(model, 'model')}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type ModelRowProps = {
  model: ModelConfig
  baseUrl: string
  isDefault: boolean
  hasApiKey: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: (next: boolean) => void
  onTest: () => void
}

function ModelRow({ model, baseUrl, isDefault, hasApiKey, onEdit, onDelete, onToggle, onTest }: ModelRowProps) {
  const toggleDisabled = !hasApiKey
  return (
    <div
      className={[
        'group flex items-center justify-between gap-2 rounded-xl border border-[var(--glass-stroke-soft)] bg-white/[0.025] px-3 py-2 transition-colors hover:border-[var(--glass-stroke-base)] hover:bg-[var(--glass-bg-muted)]',
        model.enabled ? '' : 'opacity-55',
      ].join(' ')}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-[var(--glass-text-primary)]">
            {model.display_name ?? model.model_id}
          </span>
          {isDefault ? (
            <span className="shrink-0 rounded-md bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--glass-text-on-accent)]">
              默认
            </span>
          ) : null}
          <span className="shrink-0 rounded-full border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-1.5 py-0.5 text-[10px] text-[var(--glass-text-tertiary)]">
            {CAPABILITY_LABEL[model.capability]}
          </span>
          <span className="shrink-0 rounded-full border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-1.5 py-0.5 text-[10px] text-[var(--glass-text-tertiary)]">
            {PROTOCOL_LABEL[model.protocol ?? 'openai']}
          </span>
        </div>
        <span className="truncate font-mono text-[11px] text-[var(--glass-text-tertiary)]">
          {model.model_id}
        </span>
        <span className="truncate font-mono text-[10px] text-[var(--glass-accent-cyan)]">
          path: {model.request_path}
        </span>
        <span className="truncate font-mono text-[10px] text-[var(--glass-text-tertiary)]">
          full: {formatFullUrl(baseUrl, model.request_path)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onTest}
          disabled={!hasApiKey}
          className="rounded p-1 text-[var(--glass-text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--glass-bg-muted)] disabled:cursor-not-allowed disabled:opacity-30"
          title="测试"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onEdit}
          className="rounded p-1 text-[var(--glass-text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--glass-bg-muted)]"
          title="编辑"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-[var(--glass-text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-tone-danger-fg)]"
          title="删除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            if (toggleDisabled) return
            onToggle(!model.enabled)
          }}
          disabled={toggleDisabled}
          className={[
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
            model.enabled ? 'glass-switch glass-switch-on' : 'glass-switch',
            toggleDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          ].join(' ')}
          title={toggleDisabled ? '请先配置 API Key' : model.enabled ? '停用' : '启用'}
        >
          <span
            className={[
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform',
              model.enabled ? 'translate-x-4' : 'translate-x-0.5',
            ].join(' ')}
          />
        </button>
      </div>
    </div>
  )
}
