import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '../../../components/ui/Button'
import { GlassSelect, type GlassSelectGroup, type GlassSelectOption } from '../../../components/ui/GlassSelect'
import { Modal } from '../../../components/ui/Modal'
import { listModels, listProviders } from '../../../services/api/modelGateway'
import { updateProjectSettings } from '../../../services/api/projects'
import { queryKeys } from '../../../services/queryKeys'
import type { Capability } from '../../../constants/modelCatalog'
import type { ModelConfig, Provider } from '../../../types/modelGateway'
import type { ProjectSettings, Workspace } from '../../../types/project'

type SettingsDraft = {
  analysis_model: string
  character_model: string
  location_model: string
  storyboard_model: string
  video_model: string
  audio_model: string
  art_style: string
  video_ratio: string
  video_resolution: string
}

type Preset = {
  id: string
  title: string
  description: string
  values: Partial<SettingsDraft>
}

const presets: Preset[] = [
  {
    id: 'draft',
    title: '快速草稿',
    description: '低成本快速试错，适合前期验证节奏。',
    values: { art_style: '简洁概念画风', video_ratio: '16:9', video_resolution: '720p' },
  },
  {
    id: 'balanced',
    title: '均衡出片',
    description: '通用漫剧默认配置，兼顾质量和速度。',
    values: { art_style: '电影级二次元写实', video_ratio: '16:9', video_resolution: '1080p' },
  },
  {
    id: 'short-video',
    title: '短视频竖屏',
    description: '面向移动端平台的竖屏发布规格。',
    values: { art_style: '高对比度海报风', video_ratio: '9:16', video_resolution: '1080p' },
  },
]

const ART_STYLE_OPTIONS: GlassSelectGroup[] = [
  {
    label: '漫剧常用',
    options: [
      { value: '电影级二次元写实', label: '电影级二次元写实', caption: '适合多数现代漫剧' },
      { value: '韩漫精修', label: '韩漫精修', caption: '干净线条、人物精致' },
      { value: '国风水墨', label: '国风水墨', caption: '古风、仙侠、东方幻想' },
      { value: '新海诚光影', label: '新海诚光影', caption: '清透天空、强光影氛围' },
      { value: '写实电影感', label: '写实电影感', caption: '更接近真人影视质感' },
    ],
  },
  {
    label: '类型强化',
    options: [
      { value: '赛博朋克', label: '赛博朋克', caption: '霓虹、未来都市、高反差' },
      { value: '暗黑奇幻', label: '暗黑奇幻', caption: '悬疑、怪谈、深色幻想' },
      { value: '高对比度海报风', label: '高对比度海报风', caption: '短视频封面和强视觉冲击' },
      { value: '美式漫画', label: '美式漫画', caption: '硬朗分镜、强轮廓线' },
      { value: '厚涂插画', label: '厚涂插画', caption: '质感更浓，适合史诗场景' },
    ],
  },
  {
    label: '轻量与实验',
    options: [
      { value: '简洁概念画风', label: '简洁概念画风', caption: '快速草稿和低成本试错' },
      { value: 'Q版萌系', label: 'Q版萌系', caption: '轻喜剧、萌宠、儿童向' },
      { value: '低多边形3D', label: '低多边形3D', caption: '简化建模感，风格统一' },
      { value: '粘土动画', label: '粘土动画', caption: '手作感、定格动画质感' },
      { value: '像素复古', label: '像素复古', caption: '游戏化、复古叙事' },
    ],
  },
]

function toDraft(settings: ProjectSettings | null): SettingsDraft {
  return {
    analysis_model: settings?.analysis_model ?? '',
    character_model: settings?.character_model ?? '',
    location_model: settings?.location_model ?? '',
    storyboard_model: settings?.storyboard_model ?? '',
    video_model: settings?.video_model ?? '',
    audio_model: settings?.audio_model ?? '',
    art_style: settings?.art_style ?? '电影级二次元写实',
    video_ratio: settings?.video_ratio ?? '16:9',
    video_resolution: settings?.video_resolution ?? '1080p',
  }
}

function toPayload(draft: SettingsDraft): Partial<ProjectSettings> {
  return {
    analysis_model: draft.analysis_model.trim() || null,
    character_model: draft.character_model.trim() || null,
    location_model: draft.location_model.trim() || null,
    storyboard_model: draft.storyboard_model.trim() || null,
    video_model: draft.video_model.trim() || null,
    audio_model: draft.audio_model.trim() || null,
    art_style: draft.art_style.trim() || '电影级二次元写实',
    video_ratio: draft.video_ratio.trim() || '16:9',
    video_resolution: draft.video_resolution.trim() || '1080p',
  }
}

function buildModelOptions({
  value,
  capabilities,
  models,
  providers,
}: {
  value: string
  capabilities: Capability[]
  models: ModelConfig[]
  providers: Provider[]
}): Array<GlassSelectOption | GlassSelectGroup> {
  const providerMap = new Map(providers.map((provider) => [provider.id, provider]))
  const eligibleModels = models.filter((model) => model.enabled && capabilities.includes(model.capability))
  const hasCurrentValue = value ? eligibleModels.some((model) => model.model_id === value) : true
  const grouped = new Map<string, { label: string; options: GlassSelectOption[] }>()

  for (const model of eligibleModels) {
    const provider = providerMap.get(model.provider_id)
    const providerLabel = provider?.name ?? '未知服务商'
    const group = grouped.get(model.provider_id) ?? { label: providerLabel, options: [] }
    group.options.push({
      value: model.model_id,
      label: model.display_name ?? model.model_id,
      caption: `${model.model_id} · ${providerLabel}`,
    })
    grouped.set(model.provider_id, group)
  }

  const options: Array<GlassSelectOption | GlassSelectGroup> = [
    { value: '', label: '使用系统默认', caption: '不覆盖全局默认模型' },
  ]

  if (!hasCurrentValue) {
    options.push({
      value,
      label: `${value}（当前保存）`,
      caption: '这个模型不在当前已启用模型列表中',
    })
  }

  options.push(...Array.from(grouped.values()).filter((group) => group.options.length > 0))
  return options
}

function buildArtStyleOptions(value: string): Array<GlassSelectOption | GlassSelectGroup> {
  if (!value) return ART_STYLE_OPTIONS
  const exists = ART_STYLE_OPTIONS.some((group) => group.options.some((option) => option.value === value))
  if (exists) return ART_STYLE_OPTIONS
  return [
    {
      value,
      label: `${value}（当前保存）`,
      caption: '这个画风不在预设列表中',
    },
    ...ART_STYLE_OPTIONS,
  ]
}

export function ProjectSettingsModal({
  open,
  onClose,
  projectId,
  workspace,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  workspace: Workspace
}) {
  const queryClient = useQueryClient()
  const baseline = useMemo(() => toDraft(workspace.settings), [workspace.settings])
  const [draft, setDraft] = useState<SettingsDraft>(baseline)
  const [feedback, setFeedback] = useState<string | null>(null)

  const providersQuery = useQuery({
    queryKey: queryKeys.modelGateway.providers(),
    queryFn: listProviders,
    enabled: open,
  })

  const modelsQuery = useQuery({
    queryKey: queryKeys.modelGateway.models(),
    queryFn: () => listModels(),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setDraft(baseline)
    setFeedback(null)
  }, [baseline, open])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [baseline, draft])
  const models = modelsQuery.data ?? []
  const providers = providersQuery.data ?? []
  const modelOptionsLoading = providersQuery.isLoading || modelsQuery.isLoading
  const modelOptionsError = providersQuery.isError || modelsQuery.isError

  const updateMutation = useMutation({
    mutationFn: () => updateProjectSettings(projectId, toPayload(draft)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      setFeedback('项目配置已保存，后续剧集会共用这套设置。')
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : '保存项目配置失败。')
    },
  })

  const applyPreset = (preset: Preset) => {
    setDraft((previous) => ({ ...previous, ...preset.values }))
    setFeedback(`已应用预设：${preset.title}`)
  }

  const resetDraft = () => {
    setDraft(baseline)
    setFeedback('已恢复为当前项目配置。')
  }

  return (
    <Modal open={open} onClose={onClose} title="项目配置" subtitle="这一套设置对当前漫剧项目的所有剧集生效" width={920}>
      <div className="grid max-h-[72vh] gap-5 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-3">
          {presets.map((preset) => (
            <button key={preset.id} type="button" onClick={() => applyPreset(preset)} className="glass-tile rounded-xl p-3 text-left">
              <span className="text-sm font-semibold text-[var(--glass-text-primary)]">{preset.title}</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--glass-text-tertiary)]">{preset.description}</span>
            </button>
          ))}
        </div>

        {feedback ? <div className="glass-success rounded-xl px-3 py-2 text-sm">{feedback}</div> : null}

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-[var(--glass-text-primary)]">模型默认值</h3>
            <span className="text-xs text-[var(--glass-text-tertiary)]">
              {modelOptionsError ? '模型列表加载失败，请检查模型服务商配置。' : '从已配置的模型服务商中选择'}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ModelSelect
              label="分析模型"
              value={draft.analysis_model}
              capabilities={['chat']}
              models={models}
              providers={providers}
              loading={modelOptionsLoading}
              onChange={(value) => setDraft((previous) => ({ ...previous, analysis_model: value }))}
            />
            <ModelSelect
              label="角色图模型"
              value={draft.character_model}
              capabilities={['image', 'image_edit']}
              models={models}
              providers={providers}
              loading={modelOptionsLoading}
              onChange={(value) => setDraft((previous) => ({ ...previous, character_model: value }))}
            />
            <ModelSelect
              label="场景图模型"
              value={draft.location_model}
              capabilities={['image', 'image_edit']}
              models={models}
              providers={providers}
              loading={modelOptionsLoading}
              onChange={(value) => setDraft((previous) => ({ ...previous, location_model: value }))}
            />
            <ModelSelect
              label="分镜模型"
              value={draft.storyboard_model}
              capabilities={['chat']}
              models={models}
              providers={providers}
              loading={modelOptionsLoading}
              onChange={(value) => setDraft((previous) => ({ ...previous, storyboard_model: value }))}
            />
            <ModelSelect
              label="视频模型"
              value={draft.video_model}
              capabilities={['video']}
              models={models}
              providers={providers}
              loading={modelOptionsLoading}
              onChange={(value) => setDraft((previous) => ({ ...previous, video_model: value }))}
            />
            <ModelSelect
              label="配音模型"
              value={draft.audio_model}
              capabilities={['tts']}
              models={models}
              providers={providers}
              loading={modelOptionsLoading}
              onChange={(value) => setDraft((previous) => ({ ...previous, audio_model: value }))}
            />
          </div>
        </section>

        <section className="grid gap-3">
          <h3 className="text-sm font-black text-[var(--glass-text-primary)]">出片规格</h3>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <label className="grid gap-1">
              <span className="text-sm text-[var(--glass-text-secondary)]">画风</span>
              <GlassSelect
                value={draft.art_style}
                onChange={(nextValue) => setDraft((previous) => ({ ...previous, art_style: nextValue }))}
                ariaLabel="画风"
                options={buildArtStyleOptions(draft.art_style)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-[var(--glass-text-secondary)]">画面比例</span>
              <GlassSelect
                value={draft.video_ratio}
                onChange={(nextValue) => setDraft((previous) => ({ ...previous, video_ratio: nextValue }))}
                ariaLabel="画面比例"
                options={[
                  { value: '16:9', label: '16:9' },
                  { value: '9:16', label: '9:16' },
                  { value: '1:1', label: '1:1' },
                  { value: '4:3', label: '4:3' },
                  { value: '21:9', label: '21:9' },
                ]}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-[var(--glass-text-secondary)]">分辨率</span>
              <GlassSelect
                value={draft.video_resolution}
                onChange={(nextValue) => setDraft((previous) => ({ ...previous, video_resolution: nextValue }))}
                ariaLabel="分辨率"
                options={[
                  { value: '720p', label: '720p' },
                  { value: '1080p', label: '1080p' },
                  { value: '1440p', label: '1440p' },
                  { value: '4k', label: '4K' },
                ]}
              />
            </label>
          </div>
        </section>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-surface-modal)] pt-4">
          <span className="text-xs text-[var(--glass-text-tertiary)]">{dirty ? '有未保存修改' : '当前配置已同步'}</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={resetDraft} disabled={!dirty || updateMutation.isPending}>
              重置
            </Button>
            <Button type="button" onClick={() => updateMutation.mutate()} disabled={!dirty || updateMutation.isPending}>
              {updateMutation.isPending ? '保存中...' : '保存项目配置'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function ModelSelect({
  label,
  value,
  capabilities,
  models,
  providers,
  loading,
  onChange,
}: {
  label: string
  value: string
  capabilities: Capability[]
  models: ModelConfig[]
  providers: Provider[]
  loading: boolean
  onChange: (value: string) => void
}) {
  const options = useMemo(
    () => buildModelOptions({ value, capabilities, models, providers }),
    [capabilities, models, providers, value],
  )

  return (
    <label className="grid gap-1">
      <span className="text-sm text-[var(--glass-text-secondary)]">{label}</span>
      <GlassSelect
        value={value}
        onChange={onChange}
        disabled={loading}
        placeholder={loading ? '加载模型中...' : '使用系统默认'}
        ariaLabel={label}
        options={options}
      />
    </label>
  )
}
