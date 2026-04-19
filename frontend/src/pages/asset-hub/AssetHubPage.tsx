import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { listGlobalAssets } from '../../services/api/assets'
import { queryKeys } from '../../services/queryKeys'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'
import type { AssetItem } from '../../types/project'

type AssetSortMode = 'updated-desc' | 'name-asc'
type AssetKindFilter = 'all' | 'character' | 'location' | 'prop' | 'other'

function normalizeKind(kind: string) {
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

function titleForKind(kind: AssetKindFilter) {
  switch (kind) {
    case 'character':
      return '角色'
    case 'location':
      return '场景'
    case 'prop':
      return '道具'
    case 'other':
      return '其他'
    default:
      return '全部'
  }
}

function matchAsset(asset: AssetItem, keyword: string, kindFilter: AssetKindFilter) {
  if (kindFilter !== 'all' && normalizeKind(asset.kind) !== kindFilter) {
    return false
  }

  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return true

  const source = `${asset.name} ${asset.description ?? ''} ${asset.kind}`.toLowerCase()
  return source.includes(normalizedKeyword)
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

function AssetCard({
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
        'card-base grid gap-2 rounded-2xl p-3 text-left transition-colors',
        active
          ? 'border-[var(--glass-accent-from)] bg-[var(--glass-bg-muted)]'
          : 'border-[var(--glass-stroke-base)] bg-white/70 hover:bg-white',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--glass-bg-surface-strong)] px-2 py-0.5 text-xs text-[var(--glass-text-tertiary)]">
          {kindLabel(asset.kind)}
        </span>
        {asset.updated_at ? (
          <span className="text-xs text-[var(--glass-text-tertiary)]">{new Date(asset.updated_at).toLocaleDateString('zh-CN')}</span>
        ) : null}
      </div>
      <h2 className="text-base font-semibold text-[var(--glass-text-primary)]">{asset.name}</h2>
      <p className="line-clamp-2 text-sm text-[var(--glass-text-secondary)]">{asset.description?.trim() || '暂无描述。'}</p>
      {asset.image_url ? (
        <img src={asset.image_url} alt={asset.name} className="mt-1 h-36 w-full rounded-xl object-cover" />
      ) : (
        <div className="mt-1 flex h-36 items-center justify-center rounded-xl border border-dashed border-[var(--glass-stroke-base)] text-xs text-[var(--glass-text-tertiary)]">
          暂无预览
        </div>
      )}
    </button>
  )
}

export function AssetHubPage() {
  const assetsQuery = useQuery({
    queryKey: queryKeys.assets.global(),
    queryFn: listGlobalAssets,
  })

  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<AssetKindFilter>('all')
  const [sortMode, setSortMode] = useState<AssetSortMode>('updated-desc')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  const allAssets = assetsQuery.data ?? []

  const filteredAssets = useMemo(
    () => sortAssets(allAssets.filter((asset) => matchAsset(asset, search, kindFilter)), sortMode),
    [allAssets, kindFilter, search, sortMode],
  )

  const stats = useMemo(() => {
    const summary = {
      all: allAssets.length,
      character: 0,
      location: 0,
      prop: 0,
      other: 0,
    }
    allAssets.forEach((asset) => {
      const normalized = normalizeKind(asset.kind)
      summary[normalized] += 1
    })
    return summary
  }, [allAssets])

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

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">全局资产中心</h1>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              集中浏览可复用的角色、场景与道具资产，支持筛选、搜索与详情预览。
            </p>
          </div>
          <button
            type="button"
            onClick={() => assetsQuery.refetch()}
            disabled={assetsQuery.isFetching}
            className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm disabled:opacity-60"
          >
            {assetsQuery.isFetching ? '刷新中...' : '刷新'}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">全部</p>
            <p className="mt-1 text-2xl font-semibold">{stats.all}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">角色</p>
            <p className="mt-1 text-2xl font-semibold">{stats.character}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">场景</p>
            <p className="mt-1 text-2xl font-semibold">{stats.location}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">道具</p>
            <p className="mt-1 text-2xl font-semibold">{stats.prop}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">其他</p>
            <p className="mt-1 text-2xl font-semibold">{stats.other}</p>
          </article>
        </div>
      </SectionCard>

      {assetsQuery.isLoading ? <LoadingState message="正在加载全局资产..." /> : null}
      {assetsQuery.isError ? <ErrorState message="加载全局资产失败。" /> : null}

      {assetsQuery.data ? (
        <SectionCard className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'all', label: `全部 (${stats.all})` },
              { key: 'character', label: `角色 (${stats.character})` },
              { key: 'location', label: `场景 (${stats.location})` },
              { key: 'prop', label: `道具 (${stats.prop})` },
              { key: 'other', label: `其他 (${stats.other})` },
            ] as Array<{ key: AssetKindFilter; label: string }>).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setKindFilter(item.key)}
                className={[
                  'glass-chip cursor-pointer transition-colors',
                  kindFilter === item.key ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]' : '',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <input
              className="glass-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="按名称、类型或描述搜索"
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
          <p className="text-xs text-[var(--glass-text-tertiary)]">
            「{titleForKind(kindFilter)}」分类下展示 {filteredAssets.length} 项。
          </p>
        </SectionCard>
      ) : null}

      {assetsQuery.data && assetsQuery.data.length === 0 ? (
        <EmptyState title="资产中心为空" description="开启项目同步后，创建的资产将会自动出现在这里。" />
      ) : null}

      {filteredAssets.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                active={asset.id === selectedAssetId}
                onSelect={() => setSelectedAssetId(asset.id)}
              />
            ))}
          </div>

          {selectedAsset ? (
            <SectionCard className="h-fit xl:sticky xl:top-24">
              <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">当前选择</p>
              <h2 className="mt-1 text-lg font-semibold">{selectedAsset.name}</h2>
              <p className="mt-2 text-sm text-[var(--glass-text-secondary)]">{selectedAsset.description?.trim() || '暂无描述。'}</p>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-[var(--glass-text-tertiary)]">类型</dt>
                  <dd>{kindLabel(selectedAsset.kind)}</dd>
                </div>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-[var(--glass-text-tertiary)]">资产 ID</dt>
                  <dd className="break-all text-xs text-[var(--glass-text-secondary)]">{selectedAsset.id}</dd>
                </div>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-[var(--glass-text-tertiary)]">更新时间</dt>
                  <dd>{selectedAsset.updated_at ? new Date(selectedAsset.updated_at).toLocaleString('zh-CN') : '—'}</dd>
                </div>
              </dl>
              {selectedAsset.image_url ? (
                <img src={selectedAsset.image_url} alt={selectedAsset.name} className="mt-4 h-44 w-full rounded-xl object-cover" />
              ) : (
                <div className="mt-4 flex h-44 items-center justify-center rounded-xl border border-dashed border-[var(--glass-stroke-base)] text-xs text-[var(--glass-text-tertiary)]">
                  暂无预览
                </div>
              )}
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {assetsQuery.data && assetsQuery.data.length > 0 && filteredAssets.length === 0 ? (
        <EmptyState title="没有符合条件的资产" description="请更换关键词或切回全部类型查看。" />
      ) : null}

      <Link
        to="/projects"
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        返回项目中心
      </Link>
    </div>
  )
}
