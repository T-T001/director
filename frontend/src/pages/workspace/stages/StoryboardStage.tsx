import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { listStoryboards, scriptToStoryboard } from '../../../services/api/storyboards'
import { queryKeys } from '../../../services/queryKeys'
import { Button } from '../../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import type { WorkspaceStagePageProps } from './types'

export function StoryboardStage({ projectId, episodeId }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()

  const storyboardsQuery = useQuery({
    queryKey: queryKeys.storyboards.byEpisode(episodeId),
    queryFn: () => listStoryboards(episodeId),
  })

  const scriptToStoryboardMutation = useMutation({
    mutationFn: () => scriptToStoryboard(episodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storyboards.byEpisode(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
    },
  })

  return (
    <div className="grid gap-4">
      <SectionCard className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">分镜阶段</h2>
          <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">支持触发 script-to-storyboard，并查看分镜列表。</p>
        </div>
        <Button onClick={() => scriptToStoryboardMutation.mutate()} disabled={scriptToStoryboardMutation.isPending}>
          {scriptToStoryboardMutation.isPending ? '提交中...' : '执行 script-to-storyboard'}
        </Button>
      </SectionCard>

      {storyboardsQuery.isLoading ? <LoadingState message="正在加载分镜..." /> : null}
      {storyboardsQuery.isError ? <ErrorState message="分镜加载失败。" /> : null}

      {storyboardsQuery.data && storyboardsQuery.data.length > 0 ? (
        <div className="grid gap-3">
          {storyboardsQuery.data.map((storyboard) => (
            <SectionCard key={storyboard.id}>
              <h3 className="text-base font-semibold">Storyboard #{storyboard.id}</h3>
              <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">Panel 数量：{storyboard.panel_count}</p>
              <ul className="mt-3 grid gap-2">
                {storyboard.panels.slice(0, 5).map((panel) => (
                  <li key={panel.id} className="rounded-lg border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-sm">
                    Panel {panel.panel_index}: {panel.description}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ))}
        </div>
      ) : null}

      {storyboardsQuery.data && storyboardsQuery.data.length === 0 ? (
        <EmptyState title="暂无分镜" description="先在剧本阶段准备内容，再触发 script-to-storyboard。" />
      ) : null}
    </div>
  )
}
