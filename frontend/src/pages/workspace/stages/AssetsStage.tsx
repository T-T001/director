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

function normalizeKind(kind: string) {
  const value = kind.toLowerCase()
  if (value === 'character' || value === 'location' || value === 'prop') return value
  return 'other'
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
      return left.name.localeCompare(right.name)
    }
    const leftTime = left.updated_at ? Date.parse(left.updated_at) : 0
    const rightTime = right.updated_at ? Date.parse(right.updated_at) : 0
    return rightTime - leftTime
  })
  return sorted
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

  const stats = useMemo(() => {
    const summary = { all: allAssets.length, character: 0, location: 0, prop: 0, other: 0 }
    allAssets.forEach((asset) => {
      summary[normalizeKind(asset.kind)] += 1
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

  const handleCreateCharacter = () => {
    const value = characterName.trim() || `Character ${Date.now()}`
    createCharacterMutation.mutate(value)
  }

  const handleCreateLocation = () => {
    const value = locationName.trim() || `Location ${Date.now()}`
    createLocationMutation.mutate(value)
  }

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Assets Stage</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              Refactored asset workspace with creation tools, filtering, and selection detail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'script')}>
              <Button variant="secondary">Back Script</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'storyboard')}>
              <Button variant="secondary">Go Storyboard</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'prompts')}>
              <Button variant="secondary">Go Prompts</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Total</p>
            <p className="mt-1 text-2xl font-semibold">{stats.all}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Character</p>
            <p className="mt-1 text-2xl font-semibold">{stats.character}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Location</p>
            <p className="mt-1 text-2xl font-semibold">{stats.location}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Prop</p>
            <p className="mt-1 text-2xl font-semibold">{stats.prop}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Other</p>
            <p className="mt-1 text-2xl font-semibold">{stats.other}</p>
          </article>
        </div>
      </SectionCard>

      <SectionCard className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="glass-input"
              value={characterName}
              onChange={(event) => setCharacterName(event.target.value)}
              placeholder="Character name"
            />
            <Button onClick={handleCreateCharacter} disabled={createCharacterMutation.isPending}>
              {createCharacterMutation.isPending ? 'Creating...' : 'New Character'}
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="glass-input"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="Location name"
            />
            <Button variant="secondary" onClick={handleCreateLocation} disabled={createLocationMutation.isPending}>
              {createLocationMutation.isPending ? 'Creating...' : 'New Location'}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <input
            className="glass-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search assets"
          />
          <select
            className="glass-input"
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as AssetKindFilter)}
          >
            <option value="all">All Types</option>
            <option value="character">Character</option>
            <option value="location">Location</option>
            <option value="prop">Prop</option>
            <option value="other">Other</option>
          </select>
          <select
            className="glass-input"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as AssetSortMode)}
          >
            <option value="updated-desc">Recently Updated</option>
            <option value="name-asc">Name A-Z</option>
          </select>
        </div>
      </SectionCard>

      {assetsQuery.isLoading ? <LoadingState message="Loading project assets..." /> : null}
      {assetsQuery.isError ? <ErrorState message="Failed to load assets." /> : null}

      {assetsQuery.data && assetsQuery.data.length === 0 ? (
        <EmptyState title="No assets yet" description="Create a character or location to start building your production set." />
      ) : null}

      {filteredAssets.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAssetId(asset.id)}
                className={[
                  'card-base grid gap-2 rounded-2xl p-3 text-left transition-colors',
                  selectedAssetId === asset.id
                    ? 'border-[var(--glass-accent-from)] bg-[var(--glass-bg-muted)]'
                    : 'border-[var(--glass-stroke-base)] bg-white/70 hover:bg-white',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[var(--glass-bg-surface-strong)] px-2 py-0.5 text-xs text-[var(--glass-text-tertiary)]">
                    {normalizeKind(asset.kind)}
                  </span>
                  {asset.updated_at ? (
                    <span className="text-xs text-[var(--glass-text-tertiary)]">{new Date(asset.updated_at).toLocaleDateString()}</span>
                  ) : null}
                </div>
                <h3 className="text-base font-semibold">{asset.name}</h3>
                <p className="line-clamp-2 text-sm text-[var(--glass-text-secondary)]">{asset.description?.trim() || 'No description yet.'}</p>
                {asset.image_url ? (
                  <img src={asset.image_url} alt={asset.name} className="mt-1 h-36 w-full rounded-xl object-cover" />
                ) : (
                  <div className="mt-1 flex h-36 items-center justify-center rounded-xl border border-dashed border-[var(--glass-stroke-base)] text-xs text-[var(--glass-text-tertiary)]">
                    No Preview
                  </div>
                )}
              </button>
            ))}
          </div>

          {selectedAsset ? (
            <SectionCard className="h-fit xl:sticky xl:top-24">
              <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Selected Asset</p>
              <h3 className="mt-1 text-lg font-semibold">{selectedAsset.name}</h3>
              <p className="mt-2 text-sm text-[var(--glass-text-secondary)]">{selectedAsset.description?.trim() || 'No description yet.'}</p>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-[var(--glass-text-tertiary)]">Type</dt>
                  <dd>{normalizeKind(selectedAsset.kind)}</dd>
                </div>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-[var(--glass-text-tertiary)]">Asset ID</dt>
                  <dd className="break-all text-xs">{selectedAsset.id}</dd>
                </div>
              </dl>
              {selectedAsset.image_url ? (
                <img src={selectedAsset.image_url} alt={selectedAsset.name} className="mt-4 h-44 w-full rounded-xl object-cover" />
              ) : (
                <div className="mt-4 flex h-44 items-center justify-center rounded-xl border border-dashed border-[var(--glass-stroke-base)] text-xs text-[var(--glass-text-tertiary)]">
                  No Preview
                </div>
              )}
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {assetsQuery.data && assetsQuery.data.length > 0 && filteredAssets.length === 0 ? (
        <EmptyState title="No assets match the filter" description="Adjust keyword or type filter to see more items." />
      ) : null}

      <Link
        to={buildWorkspaceStagePath(projectId, episodeId, 'storyboard')}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        Continue To Storyboard
      </Link>
    </div>
  )
}
