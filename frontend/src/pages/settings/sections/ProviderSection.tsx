import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createModel,
  createProvider,
  deleteModel,
  deleteProvider,
  listModels,
  listProviders,
  testModel,
  updateModel,
  updateProvider,
} from '../../../services/api/modelGateway'
import { getSettings } from '../../../services/api/settings'
import { queryKeys } from '../../../services/queryKeys'
import { Button } from '../../../components/ui/Button'
import { ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import type {
  ModelConfigCreatePayload,
  ModelConfigUpdatePayload,
  ProviderCreatePayload,
  ProviderUpdatePayload,
} from '../../../types/modelGateway'
import { AddProviderModal } from '../components/AddProviderModal'
import { ProviderCard } from '../components/ProviderCard'

export function ProviderSection() {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'info' | 'error' | 'success'; message: string } | null>(null)

  const providersQuery = useQuery({
    queryKey: queryKeys.modelGateway.providers(),
    queryFn: listProviders,
  })
  const modelsQuery = useQuery({
    queryKey: queryKeys.modelGateway.models(),
    queryFn: () => listModels(),
  })
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.current(),
    queryFn: getSettings,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.modelGateway.providers() })
    queryClient.invalidateQueries({ queryKey: queryKeys.modelGateway.models() })
  }

  const createProviderMutation = useMutation({
    mutationFn: (payload: ProviderCreatePayload) => createProvider(payload),
    onSuccess: (created) => {
      invalidate()
      setFeedback({ kind: 'success', message: `已添加「${created.name}」,请点击卡片右上角"测试连接"验证。` })
      setAddOpen(false)
    },
    onError: (error) => {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : '添加供应商失败。',
      })
    },
  })

  const updateProviderMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProviderUpdatePayload }) =>
      updateProvider(id, payload),
    onSuccess: () => {
      invalidate()
      setFeedback({ kind: 'success', message: '供应商已更新。' })
    },
    onError: (error) => {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : '更新失败。',
      })
    },
  })

  const deleteProviderMutation = useMutation({
    mutationFn: (id: string) => deleteProvider(id),
    onSuccess: () => {
      invalidate()
      setFeedback({ kind: 'success', message: '供应商已删除。' })
    },
    onError: (error) => {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : '删除失败。',
      })
    },
  })

  const createModelMutation = useMutation({
    mutationFn: (payload: ModelConfigCreatePayload) => createModel(payload),
    onSuccess: () => {
      invalidate()
      setFeedback({ kind: 'success', message: '模型已添加。' })
    },
    onError: (error) => {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : '添加模型失败。',
      })
    },
  })

  const updateModelMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModelConfigUpdatePayload }) =>
      updateModel(id, payload),
    onSuccess: () => {
      invalidate()
    },
    onError: (error) => {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : '更新模型失败。',
      })
    },
  })

  const deleteModelMutation = useMutation({
    mutationFn: (id: string) => deleteModel(id),
    onSuccess: () => {
      invalidate()
      setFeedback({ kind: 'success', message: '模型已删除。' })
    },
    onError: (error) => {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : '删除失败。',
      })
    },
  })

  const defaultModelIds = useMemo(() => {
    const s = settingsQuery.data
    return [s?.analysis_model, s?.image_model, s?.video_model, s?.audio_model].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
  }, [settingsQuery.data])

  if (providersQuery.isLoading || modelsQuery.isLoading) {
    return <LoadingState message="正在加载模型服务..." />
  }
  if (providersQuery.isError || modelsQuery.isError) {
    return <ErrorState message="加载失败。" />
  }

  const providers = providersQuery.data ?? []
  const allModels = modelsQuery.data ?? []

  return (
    <>
      <div className="grid gap-4">
        <SectionCard className="glass-surface-elevated flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-stroke-base)] bg-gradient-to-br from-[rgba(72,209,204,0.22)] to-[rgba(168,113,255,0.22)] text-base shadow-[var(--glass-shadow-sm)]">
              📦
            </span>
            <div>
              <h2 className="text-lg font-semibold">厂商资源池</h2>
              <p className="mt-0.5 text-xs text-[var(--glass-text-tertiary)]">
                在此使用来自全球丰富的模型配置。每个模型可独立配置协议与 Request Path,点卡片右上角"测试连接"即刻验证。
              </p>
            </div>
          </div>
          <Button type="button" onClick={() => setAddOpen(true)}>
            ＋ 新增模型服务商
          </Button>
        </SectionCard>

        {feedback ? (
          <SectionCard
            className={[
              'flex items-center justify-between gap-2 rounded-2xl p-3 text-sm',
              feedback.kind === 'error' ? 'glass-danger' : feedback.kind === 'success' ? 'glass-success' : '',
            ].join(' ')}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="rounded p-1 text-[var(--glass-text-tertiary)] hover:bg-[var(--glass-bg-muted)]"
            >
              ×
            </button>
          </SectionCard>
        ) : null}

        {providers.length === 0 ? (
          <SectionCard className="grid place-items-center gap-3 p-12 text-center">
            <p className="text-base font-semibold">还没有配置任何服务商</p>
            <p className="max-w-md text-sm text-[var(--glass-text-tertiary)]">
              点击右上角"新增模型服务商"快速接入 OpenAI / Anthropic / Gemini 或任意 OpenAI 兼容中转站。
            </p>
            <Button type="button" onClick={() => setAddOpen(true)}>
              ＋ 新增模型服务商
            </Button>
          </SectionCard>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {providers.map((provider) => {
              const providerModels = allModels.filter((m) => m.provider_id === provider.id)
              return (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  models={providerModels}
                  defaultModelIds={defaultModelIds}
                  savingKey={updateProviderMutation.isPending}
                  savingUrl={updateProviderMutation.isPending}
                  savingModel={createModelMutation.isPending || updateModelMutation.isPending}
                  onUpdateProvider={(payload) =>
                    updateProviderMutation.mutate({ id: provider.id, payload })
                  }
                  onDeleteProvider={() => deleteProviderMutation.mutate(provider.id)}
                  onAddModel={(payload) => createModelMutation.mutateAsync(payload).then(() => undefined)}
                  onUpdateModel={(modelId, payload) =>
                    updateModelMutation.mutateAsync({ id: modelId, payload }).then(() => undefined)
                  }
                  onDeleteModel={(modelId) => deleteModelMutation.mutate(modelId)}
                  onToggleModel={(modelId, enabled) =>
                    updateModelMutation.mutate({ id: modelId, payload: { enabled } })
                  }
                  onTestProvider={(model) => testModel(model.id)}
                  onTestModel={(model) => testModel(model.id)}
                />
              )
            })}
          </div>
        )}
      </div>

      <AddProviderModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        submitting={createProviderMutation.isPending}
        onSubmit={(payload) =>
          createProviderMutation.mutate({
            name: payload.name,
            base_url: payload.base_url,
            api_type: payload.api_type,
            api_key: payload.api_key || null,
          })
        }
      />
    </>
  )
}
