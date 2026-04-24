import { useMemo, useState } from 'react'

import { Modal } from '../../../components/ui/Modal'
import {
  CAPABILITY_LABEL,
  CAPABILITY_TONE,
  CATEGORY_LABEL,
  MODEL_CATALOG,
  type CatalogCategory,
  type CatalogModel,
  type CatalogProvider,
} from '../../../constants/modelCatalog'

type CommonProps = {
  open: boolean
  onClose: () => void
}

type ProviderModeProps = CommonProps & {
  mode: 'provider'
  onPick: (provider: CatalogProvider) => void
}

type ModelModeProps = CommonProps & {
  mode: 'model'
  suggestedProviderName?: string | null
  onPick: (model: CatalogModel, catalogProvider: CatalogProvider) => void
}

type Props = ProviderModeProps | ModelModeProps

type FlatModel = {
  provider: CatalogProvider
  model: CatalogModel
}

export function CatalogPickerModal(props: Props) {
  const [keyword, setKeyword] = useState('')

  const groupedProviders = useMemo(() => {
    if (props.mode !== 'provider') return new Map()
    const kw = keyword.trim().toLowerCase()
    const matched = MODEL_CATALOG.filter((provider) => {
      if (!kw) return true
      if (provider.name.toLowerCase().includes(kw)) return true
      if (provider.key.toLowerCase().includes(kw)) return true
      if (provider.description?.toLowerCase().includes(kw)) return true
      return provider.models.some(
        (model) =>
          model.model_id.toLowerCase().includes(kw) ||
          model.display_name.toLowerCase().includes(kw),
      )
    })
    const groups = new Map<CatalogCategory, CatalogProvider[]>()
    for (const provider of matched) {
      const list = groups.get(provider.category) ?? []
      list.push(provider)
      groups.set(provider.category, list)
    }
    return groups
  }, [keyword, props.mode])

  const flatModels: FlatModel[] = useMemo(() => {
    if (props.mode !== 'model') return []
    const suggested = props.suggestedProviderName?.trim().toLowerCase()
    const kw = keyword.trim().toLowerCase()
    const all: FlatModel[] = MODEL_CATALOG.flatMap((provider) =>
      provider.models.map((model) => ({ provider, model })),
    )
    return all
      .filter(({ provider, model }) => {
        if (!kw) return true
        return (
          provider.name.toLowerCase().includes(kw) ||
          model.model_id.toLowerCase().includes(kw) ||
          model.display_name.toLowerCase().includes(kw) ||
          CAPABILITY_LABEL[model.capability].toLowerCase().includes(kw)
        )
      })
      .sort((a, b) => {
        if (suggested) {
          const aMatch = a.provider.name.toLowerCase() === suggested ? -1 : 0
          const bMatch = b.provider.name.toLowerCase() === suggested ? -1 : 0
          if (aMatch !== bMatch) return aMatch - bMatch
        }
        return a.provider.name.localeCompare(b.provider.name, 'zh-CN')
      })
  }, [keyword, props])

  const title = props.mode === 'provider' ? '从目录添加供应商' : '从目录选择模型'
  const subtitle =
    props.mode === 'provider'
      ? '选择一个主流供应商快速导入默认 base_url；导入后仍可自定义 API Key 与请求路径。'
      : '选择任意模型作为模板，添加后仍可修改 Model ID、Display Name 与请求路径。'

  return (
    <Modal open={props.open} onClose={props.onClose} title={title} subtitle={subtitle} width={760}>
      <div className="grid gap-4">
        <input
          type="search"
          className="glass-input"
          placeholder={props.mode === 'provider' ? '搜索供应商 / 模型名...' : '搜索模型名 / ID / 能力...'}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          autoFocus
        />

        {props.mode === 'provider' ? (
          <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
            {[...groupedProviders.entries()].map(([category, list]) => (
              <div key={category as string} className="grid gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--glass-text-tertiary)]">
                  {CATEGORY_LABEL[category as CatalogCategory]}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(list as CatalogProvider[]).map((provider) => (
                    <button
                      key={provider.key}
                      type="button"
                      className="card-base grid gap-1 p-3 text-left transition-colors hover:bg-white"
                      onClick={() => (props as ProviderModeProps).onPick(provider)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--glass-text-primary)]">
                          {provider.name}
                        </span>
                        <span className="text-[10px] text-[var(--glass-text-tertiary)]">
                          {provider.models.length} 模型
                        </span>
                      </div>
                      {provider.description ? (
                        <p className="line-clamp-1 text-xs text-[var(--glass-text-tertiary)]">
                          {provider.description}
                        </p>
                      ) : null}
                      <p className="truncate text-[11px] text-[var(--glass-text-tertiary)]">
                        {provider.default_base_url}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {groupedProviders.size === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--glass-stroke-base)] p-6 text-center text-sm text-[var(--glass-text-tertiary)]">
                没有匹配的供应商。
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {flatModels.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--glass-stroke-base)] p-6 text-center text-sm text-[var(--glass-text-tertiary)]">
                没有匹配的模型。
              </div>
            ) : (
              flatModels.map(({ provider, model }) => (
                <button
                  key={`${provider.key}::${model.model_id}`}
                  type="button"
                  className="card-base flex items-start justify-between gap-3 p-3 text-left transition-colors hover:bg-white"
                  onClick={() => (props as ModelModeProps).onPick(model, provider)}
                >
                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-1.5 py-[1px] text-[10px] ${CAPABILITY_TONE[model.capability]}`}
                      >
                        {CAPABILITY_LABEL[model.capability]}
                      </span>
                      <span className="text-sm font-semibold text-[var(--glass-text-primary)]">
                        {model.display_name}
                      </span>
                      <span className="text-[10px] text-[var(--glass-text-tertiary)]">
                        · {provider.name}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--glass-text-tertiary)]">{model.model_id}</p>
                  </div>
                  <code className="max-w-[45%] truncate rounded bg-[var(--glass-bg-muted)] px-2 py-1 text-[11px] text-[var(--glass-text-secondary)]">
                    {model.request_path}
                  </code>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
