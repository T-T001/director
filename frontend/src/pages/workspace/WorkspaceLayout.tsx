import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'

import { getWorkspace } from '../../services/api/projects'
import { queryKeys } from '../../services/queryKeys'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'
import { WorkspaceStageNav } from '../../components/layout/WorkspaceStageNav'
import { isWorkspaceStage, resolveWorkspaceStageFromPathname } from '../../app/router/routes'
import { useWorkspaceStore } from '../../app/store/workspace.store'
import { ConfigStage } from './stages/ConfigStage'
import { ScriptStage } from './stages/ScriptStage'
import { AssetsStage } from './stages/AssetsStage'
import { StoryboardStage } from './stages/StoryboardStage'
import { VoiceStage } from './stages/VoiceStage'
import { VideoStage } from './stages/VideoStage'
import { useProjectTaskSSE } from '../../services/sse/project-stream'

export function WorkspaceLayout() {
  const location = useLocation()
  const { projectId = '', episodeId = '', stage = '' } = useParams()
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage)

  const workspaceQuery = useQuery({
    queryKey: queryKeys.projects.workspace(projectId),
    queryFn: () => getWorkspace(projectId),
    enabled: !!projectId,
  })

  const workspace = workspaceQuery.data

  useProjectTaskSSE(projectId, true)

  const sortedEpisodes = useMemo(
    () => [...(workspace?.episodes ?? [])].sort((a, b) => a.episode_number - b.episode_number),
    [workspace?.episodes],
  )

  const episode = useMemo(
    () => sortedEpisodes.find((item) => item.id === episodeId) ?? null,
    [episodeId, sortedEpisodes],
  )

  const currentStage = resolveWorkspaceStageFromPathname(location.pathname)

  useEffect(() => {
    if (currentStage) {
      setActiveStage(currentStage)
    }
  }, [currentStage, setActiveStage])

  if (!projectId || !episodeId || !isWorkspaceStage(stage)) {
    return <Navigate to="/projects" replace />
  }

  if (workspaceQuery.isLoading) {
    return <LoadingState message="工作台加载中..." />
  }

  if (workspaceQuery.isError || !workspace) {
    return <ErrorState message="工作台加载失败。" />
  }

  if (!episode) {
    return (
      <div className="grid gap-4">
        <EmptyState title="剧集不存在" description="请返回项目详情创建剧集后再进入工作台。" />
        <Link className="w-fit rounded-lg bg-white px-3 py-2 text-sm" to={`/projects/${projectId}`}>
          返回项目详情
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <SectionCard className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{workspace.project.name}</h1>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              第 {episode.episode_number} 集：{episode.name}
            </p>
          </div>
          <Link className="rounded-xl bg-white/80 px-3 py-2 text-sm text-[var(--glass-text-secondary)]" to={`/projects/${workspace.project.id}`}>
            返回项目详情
          </Link>
        </div>
        <WorkspaceStageNav projectId={projectId} episodeId={episodeId} currentStage={stage} />
      </SectionCard>

      {stage === 'config' ? <ConfigStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
      {stage === 'script' ? <ScriptStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
      {stage === 'assets' ? <AssetsStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
      {stage === 'storyboard' ? (
        <StoryboardStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} />
      ) : null}
      {stage === 'voice' ? <VoiceStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
      {stage === 'video' ? <VideoStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
    </div>
  )
}
