import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createProjectCharacter, createProjectLocation, listProjectAssets } from '../../../services/api/assets'
import { queryKeys } from '../../../services/queryKeys'
import { buildWorkspaceStagePath } from '../../../app/router/routes'
import { Button } from '../../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import type { AssetItem } from '../../../types/project'
import type { WorkspaceStagePageProps } from './types'

type AssetKindFilter = 'all' | 'character' | 'location' | 'prop' | 'other'
type AssetSortMode = 'updated-desc' | 'name-asc'

function normalizeKind(kind: string): Exclude<AssetKindFilter, 'all'> {
  const value = kind.toLowerCase()
  if (value === 'character' || value === 'location' || value === 'prop') return value
  return 'other'
}

function kindLabel(kind: string) {
  const n = normalizeKind(kind)
  if (n === 'character') return '角色'
  if (n === 'location') return '场景'
  if (n === 'prop') return '道具'
  return '其他'
}

function matchAsset(asset: AssetItem, keyword: string, kindFilter: AssetKindFilter) {
  if (kindFilter !== 'all' && normalizeKind(asset.kind) !== kindFilter) return false
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return true
  const text = `${asset.name} ${asset.description ?? ''} ${asset.kind}`.toLowerCase()
  return text.includes(normalized)
}

function sortAssets(items: AssetItem[], mode: AssetSortMode) {
  const sorted = [...items]
  sorted.sort((left, right) => {
    if (mode === 'name-asc') {
      return left.name.localeCompare(right.name, 'zh-CN')
    }
    const leftTime = left.updated_at ? Date.parse(left.updated_at) : 0
    const rightTime = right.updated_at ? Date.parse(right.updated_at) : 0
    return rightTime - leftTime
  })
  return sorted
}

function AssetMiniCard({
  asset,
  active,
  onSelect,
}: {
  asset: AssetItem
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'card-base grid gap-2 rounded-2xl p-3 text-left transition-all',
        active ? 'border-[var(--glass-accent-from)] bg-[var(--glass-bg-muted)] shadow-[var(--glass-shadow-sm)]' : 'hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/[0.08]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="stage-pill">{kindLabel(asset.kind)}</span>
        <span className="text-[11px] text-[var(--glass-text-tertiary)]">{asset.image_url ? '有图' : '待出图'}</span>
      </div>
      <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
        {asset.image_url ? (
          <img src={asset.image_url} alt={asset.name} className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[var(--glass-stroke-base)] text-[10px] text-[var(--glass-text-tertiary)]">
            无图
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black">{asset.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--glass-text-secondary)]">{asset.description?.trim() || '暂无描述。'}</p>
        </div>
      </div>
    </button>
  )
}

export function AssetsStage({ projectId, episodeId }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets.byProject(projectId),
    queryFn: () => listProjectAssets(projectId),
  })

  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<AssetKindFilter>('all')
  const [sortMode, setSortMode] = useState<AssetSortMode>('updated-desc')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [characterName, setCharacterName] = useState('')
  const [locationName, setLocationName] = useState('')

  const createCharacterMutation = useMutation({
    mutationFn: (name: string) => createProjectCharacter(projectId, { name }),
    onSuccess: () => {
      setCharacterName('')
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.byProject(projectId) })
    },
  })

  const createLocationMutation = useMutation({
    mutationFn: (name: string) => createProjectLocation(projectId, { name }),
    onSuccess: () => {
      setLocationName('')
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.byProject(projectId) })
    },
  })

  const allAssets = assetsQuery.data ?? []

  const filteredAssets = useMemo(
    () => sortAssets(allAssets.filter((asset) => matchAsset(asset, search, kindFilter)), sortMode),
    [allAssets, kindFilter, search, sortMode],
  )

  const groupedAssets = useMemo(() => {
    const groups: Record<Exclude<AssetKindFilter, 'all'>, AssetItem[]> = {
      character: [],
      location: [],
      prop: [],
      other: [],
    }
    filteredAssets.forEach((asset) => {
      groups[normalizeKind(asset.kind)].push(asset)
    })
    return groups
  }, [filteredAssets])

  const stats = useMemo(() => {
    const summary = { all: allAssets.length, character: 0, location: 0, prop: 0, other: 0 }
    allAssets.forEach((asset) => {
      summary[normalizeKind(asset.kind)] += 1
    })
    return summary
  }, [allAssets])

  const imageReadyCount = useMemo(() => allAssets.filter((asset) => Boolean(asset.image_url)).length, [allAssets])

  useEffect(() => {
    if (filteredAssets.length === 0) {
      setSelectedAssetId(null)
      return
    }
    if (!selectedAssetId || !filteredAssets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(filteredAssets[0].id)
    }
  }, [filteredAssets, selectedAssetId])

  const selectedAsset = useMemo(
    () => filteredAssets.find((asset) => asset.id === selectedAssetId) ?? null,
    [filteredAssets, selectedAssetId],
  )

  const handleCreateCharacter = () => {
    const value = characterName.trim() || `新角色 ${Date.now()}`
    createCharacterMutation.mutate(value)
  }

  const handleCreateLocation = () => {
    const value = locationName.trim() || `新场景 ${Date.now()}`
    createLocationMutation.mutate(value)
  }

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="field-label text-[var(--glass-accent-cyan)]">Cast and scene asset desk</p>
            <h2 className="mt-1 text-xl font-black">角色、场景与道具资产库</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              分镜前先把本集会出现的人物、地点和关键道具补齐，保证后续画面一致性。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'script')}>
              <Button variant="secondary">回到剧本片段</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'storyboard')}>
              <Button variant="secondary">进入分镜面板</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['全部资产', stats.all],
            ['角色', stats.character],
            ['场景', stats.location],
            ['道具', stats.prop],
            ['已出图', imageReadyCount],
          ].map(([label, value]) => (
            <article key={label} className="metric-card p-4">
              <p className="field-label">{label}</p>
              <p className="mt-2 text-2xl font-black">{value}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="glass-input"
              value={characterName}
              onChange={(event) => setCharacterName(event.target.value)}
              placeholder="输入角色名，如：林晚、旁白、反派老板"
            />
            <Button onClick={handleCreateCharacter} disabled={createCharacterMutation.isPending}>
              {createCharacterMutation.isPending ? '创建中...' : '新建角色'}
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="glass-input"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="输入场景名，如：雨夜天台、办公室、病房"
            />
            <Button variant="secondary" onClick={handleCreateLocation} disabled={createLocationMutation.isPending}>
              {createLocationMutation.isPending ? '创建中...' : '新建场景'}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <input
            className="glass-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索角色、场景、道具或描述"
          />
          <select
            className="glass-input"
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as AssetKindFilter)}
          >
            <option value="all">全部类型</option>
            <option value="character">角色</option>
            <option value="location">场景</option>
            <option value="prop">道具</option>
            <option value="other">其他</option>
          </select>
          <select
            className="glass-input"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as AssetSortMode)}
          >
            <option value="updated-desc">最近更新</option>
            <option value="name-asc">名称 A→Z</option>
          </select>
        </div>
      </SectionCard>

      {assetsQuery.isLoading ? <LoadingState message="正在加载本集项目资产..." /> : null}
      {assetsQuery.isError ? <ErrorState message="加载素材失败。" /> : null}

      {assetsQuery.data && assetsQuery.data.length === 0 ? (
        <EmptyState title="尚无角色场景资产" description="先创建本集核心角色和主要场景，再进入分镜生成流程。" />
      ) : null}

      {filteredAssets.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { key: 'character' as const, title: '角色库', desc: '主角、配角、旁白和角色形象' },
              { key: 'location' as const, title: '场景库', desc: '室内外地点、时间氛围和背景' },
              { key: 'prop' as const, title: '道具库', desc: '剧情关键物件和可视线索' },
              { key: 'other' as const, title: '其他资产', desc: '未归类但可复用的制作物料' },
            ].map((group) => (
              <SectionCard key={group.key} className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="field-label">{group.desc}</p>
                    <h3 className="mt-1 text-base font-black">{group.title}</h3>
                  </div>
                  <span className="glass-chip text-[11px]">{groupedAssets[group.key].length}</span>
                </div>
                <div className="grid gap-2">
                  {groupedAssets[group.key].slice(0, 8).map((asset) => (
                    <AssetMiniCard
                      key={asset.id}
                      asset={asset}
                      active={asset.id === selectedAssetId}
                      onSelect={() => setSelectedAssetId(asset.id)}
                    />
                  ))}
                  {groupedAssets[group.key].length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--glass-stroke-base)] p-4 text-center text-xs text-[var(--glass-text-tertiary)]">
                      暂无{group.title.replace('库', '')}
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            ))}
          </div>

          {selectedAsset ? (
            <SectionCard className="inspector-panel h-fit xl:sticky xl:top-24">
              <p className="field-label text-[var(--glass-accent-cyan)]">Selected production asset</p>
              <h3 className="mt-2 text-xl font-black">{selectedAsset.name}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--glass-text-secondary)]">{selectedAsset.description?.trim() || '暂无描述，可在后续版本补充角色设定、场景氛围或道具用途。'}</p>
              <dl className="mt-5 grid gap-3 text-sm">
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-[var(--glass-text-tertiary)]">制作类型</dt>
                  <dd>{kindLabel(selectedAsset.kind)}</dd>
                </div>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-[var(--glass-text-tertiary)]">出图状态</dt>
                  <dd>{selectedAsset.image_url ? '已有参考图' : '待生成参考图'}</dd>
                </div>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-[var(--glass-text-tertiary)]">资产 ID</dt>
                  <dd className="break-all text-xs">{selectedAsset.id}</dd>
                </div>
              </dl>
              {selectedAsset.image_url ? (
                <img src={selectedAsset.image_url} alt={selectedAsset.name} className="mt-5 h-52 w-full rounded-2xl border border-[var(--glass-stroke-soft)] object-cover" />
              ) : (
                <div className="mt-5 flex h-52 items-center justify-center rounded-2xl border border-dashed border-[var(--glass-stroke-base)] text-xs text-[var(--glass-text-tertiary)]">
                  暂无参考图
                </div>
              )}
              <Link
                to={buildWorkspaceStagePath(projectId, episodeId, 'storyboard')}
                className="glass-btn-base glass-btn-secondary mt-5 inline-flex w-full justify-center rounded-xl px-3 py-2 text-sm font-semibold"
              >
                用于分镜面板
              </Link>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {assetsQuery.data && assetsQuery.data.length > 0 && filteredAssets.length === 0 ? (
        <EmptyState title="没有符合条件的素材" description="调整关键词或类型筛选，查看更多角色、场景与道具。" />
      ) : null}

      <Link
        to={buildWorkspaceStagePath(projectId, episodeId, 'storyboard')}
        className="page-command fixed bottom-6 right-6 z-40 px-6 py-3 text-sm font-black text-[var(--glass-text-primary)] transition hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/10"
      >
        继续制作：分镜面板
      </Link>
    </div>
  )
}
