import { useEffect, useState } from 'react'

import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { GlassSelect } from '../../../components/ui/GlassSelect'
import type { ProviderApiType } from '../../../types/modelGateway'

export type ApiTypePreset = {
  key: ProviderApiType
  label: string
  hint: string
  defaultBaseUrl: string
}

const API_TYPE_PRESETS: ApiTypePreset[] = [
  {
    key: 'openai',
    label: 'OpenAI 兼容层',
    hint: '绝大多数国产模型与中转站都走此协议,body:{model,messages,max_tokens}',
    defaultBaseUrl: 'https://api.openai.com',
  },
  {
    key: 'gemini',
    label: 'Gemini 原生',
    hint: 'Google AI Studio 原生接口,API Key 以 ?key=xxx 形式拼在 URL 上',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
  },
  {
    key: 'anthropic',
    label: 'Anthropic 原生',
    hint: 'Claude 官方接口,使用 x-api-key + anthropic-version header',
    defaultBaseUrl: 'https://api.anthropic.com',
  },
  {
    key: 'raw',
    label: '自定义 (Raw)',
    hint: '未知协议,Test 时仅做连通性打点,业务调用需要自行适配',
    defaultBaseUrl: '',
  },
]

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (payload: { name: string; base_url: string; api_key: string; api_type: ProviderApiType }) => void
  submitting?: boolean
}

export function AddProviderModal({ open, onClose, onSubmit, submitting }: Props) {
  const [apiType, setApiType] = useState<ProviderApiType>('openai')
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState(API_TYPE_PRESETS[0].defaultBaseUrl)
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    if (!open) return
    setApiType('openai')
    setName('')
    setBaseUrl(API_TYPE_PRESETS[0].defaultBaseUrl)
    setApiKey('')
  }, [open])

  const selectedPreset = API_TYPE_PRESETS.find((preset) => preset.key === apiType) ?? API_TYPE_PRESETS[0]

  const handleApiTypeChange = (value: ProviderApiType) => {
    setApiType(value)
    const preset = API_TYPE_PRESETS.find((p) => p.key === value)
    if (preset) setBaseUrl(preset.defaultBaseUrl)
  }

  const canSubmit = name.trim().length > 0 && baseUrl.trim().length > 0 && !submitting

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      base_url: baseUrl.trim(),
      api_key: apiKey,
      api_type: apiType,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="新增模型服务商"
      subtitle="厂商资源池"
      width={520}
    >
      <div className="grid gap-4">
        <div className="rounded-xl border border-[var(--glass-stroke-strong)] glass-warning px-3 py-2.5 text-[12px] leading-5">
          ⚠ 项目目前为测试版,由于市面上各厂商自定义 API 格式差异较大,自定义 API 兼容性尚不完善,建议优先使用官方内置 API。后续版本将持续更新以兼容更多厂商。
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-[var(--glass-text-secondary)]">API 类型</span>
          <GlassSelect
            value={apiType}
            onChange={(nextValue) => handleApiTypeChange(nextValue as ProviderApiType)}
            ariaLabel="API 类型"
            options={API_TYPE_PRESETS.map((preset) => ({
              value: preset.key,
              label: preset.label,
            }))}
          />
          <span className="text-[11px] text-[var(--glass-text-tertiary)]">
            {selectedPreset.hint}
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-[var(--glass-text-secondary)]">名称</span>
          <input
            className="glass-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="名称"
            autoFocus
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-[var(--glass-text-secondary)]">Base URL</span>
          <input
            className="glass-input"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.example.com"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-[var(--glass-text-secondary)]">API Key</span>
          <input
            type="password"
            className="glass-input"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? '添加中...' : '添加'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
