import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createProjectCharacter, createProjectLocation, listProjectAssets } from '../../../services/api/assets'
import { queryKeys } from '../../../services/queryKeys'
import { Button } from '../../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import type { WorkspaceStagePageProps } from './types'

export function AssetsStage({ projectId }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets.byProject(projectId),
    queryFn: () => listProjectAssets(projectId),
  })

  const createCharacterMutation = useMutation({
    mutationFn: () => createProjectCharacter(projectId, { name: `角色 ${Date.now()}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.assets.byProject(projectId) }),
  })

  const createLocationMutation = useMutation({
    mutationFn: () => createProjectLocation(projectId, { name: `场景 ${Date.now()}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.assets.byProject(projectId) }),
  })

  return (
    <div className="grid gap-4">
      <SectionCard className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">资产阶段</h2>
          <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">第一版支持基础资产读取与创建入口。</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => createCharacterMutation.mutate()} disabled={createCharacterMutation.isPending}>
            新建角色
          </Button>
          <Button variant="secondary" onClick={() => createLocationMutation.mutate()} disabled={createLocationMutation.isPending}>
            新建场景
          </Button>
        </div>
      </SectionCard>

      {assetsQuery.isLoading ? <LoadingState message="正在加载资产..." /> : null}
      {assetsQuery.isError ? <ErrorState message="资产加载失败。" /> : null}

      {assetsQuery.data && assetsQuery.data.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assetsQuery.data.map((asset) => (
            <SectionCard key={asset.id} className="grid gap-2">
              <div className="text-sm text-[var(--glass-text-tertiary)]">{asset.kind}</div>
              <h3 className="text-base font-semibold">{asset.name}</h3>
              <p className="text-sm text-[var(--glass-text-secondary)]">{asset.description || '暂无描述'}</p>
              {asset.image_url ? (
                <img src={asset.image_url} alt={asset.name} className="mt-1 h-36 w-full rounded-lg object-cover" />
              ) : null}
            </SectionCard>
          ))}
        </div>
      ) : null}

      {assetsQuery.data && assetsQuery.data.length === 0 ? (
        <EmptyState title="暂无资产" description="可以先创建角色或场景，后续会接入 AI 生成和替换流程。" />
      ) : null}
    </div>
  )
}
