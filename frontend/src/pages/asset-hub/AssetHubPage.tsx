import { useQuery } from '@tanstack/react-query'

import { listGlobalAssets } from '../../services/api/assets'
import { queryKeys } from '../../services/queryKeys'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'

export function AssetHubPage() {
  const assetsQuery = useQuery({
    queryKey: queryKeys.assets.global(),
    queryFn: listGlobalAssets,
  })

  return (
    <div className="grid gap-4">
      <SectionCard>
        <h1 className="text-xl font-semibold">全局资产库</h1>
        <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
          第一版先提供资产可见性与 API-ready 容器，后续接入文件夹、生成、替换与下载能力。
        </p>
      </SectionCard>

      {assetsQuery.isLoading ? <LoadingState message="正在加载全局资产..." /> : null}
      {assetsQuery.isError ? <ErrorState message="全局资产加载失败。" /> : null}

      {assetsQuery.data && assetsQuery.data.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assetsQuery.data.map((asset) => (
            <SectionCard key={asset.id} className="grid gap-2">
              <div className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">{asset.kind}</div>
              <h2 className="text-base font-semibold">{asset.name}</h2>
              <p className="text-sm text-[var(--glass-text-secondary)]">{asset.description || '暂无描述'}</p>
              {asset.image_url ? <img src={asset.image_url} alt={asset.name} className="h-36 w-full rounded-lg object-cover" /> : null}
            </SectionCard>
          ))}
        </div>
      ) : null}

      {assetsQuery.data && assetsQuery.data.length === 0 ? (
        <EmptyState title="全局资产为空" description="后续可在此管理角色、场景、道具和音色。" />
      ) : null}
    </div>
  )
}
