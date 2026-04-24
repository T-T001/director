import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSettings, updateSettings } from '../../../services/api/settings'
import { listModels, listProviders } from '../../../services/api/modelGateway'
import { queryKeys } from '../../../services/queryKeys'
import { Button } from '../../../components/ui/Button'
import { ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import { CAPABILITY_LABEL } from '../../../constants/modelCatalog'
import { Sparkles } from 'lucide-react'
import type { ModelConfig, Provider } from '../../../types/modelGateway'
import type { UserSettings } from '../../../types/project'

type DefaultDraft = {
  analysis_model: string
  image_model: string
  video_model: string
  audio_model: string
}

type FieldConfig = {
  key: keyof DefaultDraft
  label: string
  description: string
  capabilities: Array<ModelConfig['capability']>
  emptyHint: string
}

const fieldConfigs: FieldConfig[] = [
  {
    key: 'analysis_model',
    label: '分析 / 剧本模型',
    description: '用于剧本拆分、分镜分析、提示词生成等文本推理任务。',
    capabilities: ['chat'],
    emptyHint: '当前没有可用于文本推理的已启用模型。',
  },
  {
    key: 'image_model',
    label: '图像生成模型',
    description: '用于角色、场景、分镜画面的生成。',
    capabilities: ['image', 'image_edit'],
    emptyHint: '当前没有可用于图像生成的已启用模型。',
  },
  {
    key: 'video_model',
    label: '视频生成模型',
    description: '用于分镜视频的生成。',
    capabilities: ['video', 'lipsync'],
    emptyHint: '当前没有可用于视频生成的已启用模型。',
  },
  {
    key: 'audio_model',
    label: '音频模型',
    description: '用于旁白 TTS 与语音处理。',
    capabilities: ['tts', 'stt'],
    emptyHint: '当前没有可用于音频处理的已启用模型。',
  },
]

function normalizeDraft(settings: UserSettings | undefined): DefaultDraft {
  return {
    analysis_model: settings?.analysis_model ?? '',
    image_model: settings?.image_model ?? '',
    video_model: settings?.video_model ?? '',
    audio_model: settings?.audio_model ?? '',
  }
}

function groupByProvider(models: ModelConfig[], providers: Provider[]) {
  const providerMap = new Map(providers.map((p) => [p.id, p]))
  const groups = new Map<string, { provider: Provider | null; items: ModelConfig[] }>()
  for (const model of models) {
    const provider = providerMap.get(model.provider_id) ?? null
    const key = provider?.id ?? '__orphan__'
    const group = groups.get(key) ?? { provider, items: [] }
    group.items.push(model)
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.provider) return 1
    if (!b.provider) return -1
    return a.provider.name.localeCompare(b.provider.name, 'zh-CN')
  })
}

export function DefaultModelSection() {
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.current(),
    queryFn: getSettings,
  })

  const providersQuery = useQuery({
    queryKey: queryKeys.modelGateway.providers(),
    queryFn: listProviders,
  })

  const modelsQuery = useQuery({
    queryKey: queryKeys.modelGateway.models(),
    queryFn: () => listModels(),
  })

  const [draft, setDraft] = useState<DefaultDraft>(() => normalizeDraft(undefined))
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!settingsQuery.data) return
    setDraft(normalizeDraft(settingsQuery.data))
  }, [settingsQuery.data])

  const baseline = useMemo(() => normalizeDraft(settingsQuery.data), [settingsQuery.data])
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [baseline, draft])

  const groups = useMemo(
    () => groupByProvider(modelsQuery.data ?? [], providersQuery.data ?? []),
    [modelsQuery.data, providersQuery.data],
  )

  const mutation = useMutation({
    mutationFn: () =>
      updateSettings({
        analysis_model: draft.analysis_model.trim() || null,
        image_model: draft.image_model.trim() || null,
        video_model: draft.video_model.trim() || null,
        audio_model: draft.audio_model.trim() || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.settings.current(), updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.current() })
      setFeedback('默认模型已保存。')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '保存失败。'
      setFeedback(message)
    },
  })

  if (settingsQuery.isLoading || providersQuery.isLoading || modelsQuery.isLoading) {
    return <LoadingState message="正在加载默认模型配置..." />
  }
  if (settingsQuery.isError || providersQuery.isError || modelsQuery.isError) {
    return <ErrorState message="加载失败。" />
  }

  const hasModels = (modelsQuery.data?.length ?? 0) > 0

  return (
    <div className="grid gap-4">
      <SectionCard className="glass-surface-elevated grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">默认模型</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              给每一类任务选择一个已配置的模型，作为全局默认值。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDraft(baseline)}
              disabled={!dirty || mutation.isPending}
            >
              重置
            </Button>
            <Button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={!dirty || mutation.isPending}
            >
              {mutation.isPending ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </SectionCard>

      {feedback ? (
        <SectionCard className="glass-success rounded-2xl p-4 text-sm">{feedback}</SectionCard>
      ) : null}

      {!hasModels ? (
        <SectionCard className="grid place-items-center gap-2 p-10 text-center">
          <p className="text-base font-semibold">还没有配置任何模型</p>
          <p className="text-sm text-[var(--glass-text-tertiary)]">
            请先到「模型服务」添加供应商与模型，再回到这里设置默认值。
          </p>
        </SectionCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fieldConfigs.map((config) => {
            const currentValue = draft[config.key]
            const availableGroups = groups
              .map((group) => ({
                provider: group.provider,
                items: group.items.filter(
                  (model) => config.capabilities.includes(model.capability) && model.enabled,
                ),
              }))
              .filter((group) => group.items.length > 0)

            return (
              <SectionCard key={config.key} className="glass-surface grid gap-4 rounded-2xl p-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)]">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{config.label}</h3>
                    <p className="mt-0.5 text-xs text-[var(--glass-text-tertiary)]">{config.description}</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-[var(--glass-text-secondary)]">默认模型</label>
                    <select
                      className="glass-input"
                      value={currentValue}
                      onChange={(event) =>
                        setDraft((previous) => ({ ...previous, [config.key]: event.target.value }))
                      }
                    >
                      <option value="">（未设置）</option>
                      {currentValue &&
                      !availableGroups.some((group) =>
                        group.items.some((item) => item.model_id === currentValue),
                      ) ? (
                        <option value={currentValue}>{currentValue}（自定义）</option>
                      ) : null}
                      {availableGroups.map((group) => (
                        <optgroup
                          key={group.provider?.id ?? '__orphan__'}
                          label={group.provider?.name ?? '未知供应商'}
                        >
                          {group.items.map((model) => (
                            <option key={model.id} value={model.model_id}>
                              {model.display_name ?? model.model_id} · {CAPABILITY_LABEL[model.capability]}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {currentValue ? (
                    <div className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/60 px-3 py-2 text-[12px] text-[var(--glass-text-secondary)]">
                      当前选择：<span className="font-medium text-[var(--glass-text-primary)]">{currentValue}</span>
                    </div>
                  ) : null}

                  {availableGroups.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--glass-stroke-base)] bg-white/40 px-3 py-3 text-xs text-[var(--glass-text-tertiary)]">
                      {config.emptyHint}
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
