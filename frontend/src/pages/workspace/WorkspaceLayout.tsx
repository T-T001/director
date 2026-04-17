import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { getWorkspace } from '../../services/api/projects'
import { queryKeys } from '../../services/queryKeys'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'
import { WorkspaceStageNav } from '../../components/layout/WorkspaceStageNav'
import {
  buildWorkspaceStagePath,
  isWorkspaceStage,
  resolveWorkspaceStageFromPathname,
  workspaceStageItems,
} from '../../app/router/routes'
import { useWorkspaceStore } from '../../app/store/workspace.store'
import { ConfigStage } from './stages/ConfigStage'
import { ScriptStage } from './stages/ScriptStage'
import { AssetsStage } from './stages/AssetsStage'
import { StoryboardStage } from './stages/StoryboardStage'
import { PromptsStage } from './stages/PromptsStage'
import { VoiceStage } from './stages/VoiceStage'
import { VideoStage } from './stages/VideoStage'
import { useProjectTaskSSE } from '../../services/sse/project-stream'

function stageTitle(stage: string) {
  return workspaceStageItems.find((item) => item.stage === stage)?.label ?? stage
}

export function WorkspaceLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { projectId = '', episodeId = '', stage = '' } = useParams()
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage)
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const workspaceQuery = useQuery({
    queryKey: queryKeys.projects.workspace(projectId),
    queryFn: () => getWorkspace(projectId),
    enabled: Boolean(projectId),
  })

  const workspace = workspaceQuery.data

  useProjectTaskSSE(projectId, true)

  const sortedEpisodes = useMemo(
    () => [...(workspace?.episodes ?? [])].sort((left, right) => left.episode_number - right.episode_number),
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
    return <LoadingState message="Loading workspace..." />
  }

  if (workspaceQuery.isError || !workspace) {
    return <ErrorState message="Failed to load workspace." />
  }

  if (!episode) {
    return (
      <div className="grid gap-4">
        <EmptyState title="Episode not found" description="Create an episode first, then re-open workspace." />
        <Link className="w-fit rounded-lg bg-white px-3 py-2 text-sm" to={`/projects/${projectId}`}>
          Back to project
        </Link>
      </div>
    )
  }

  const completedStageCount = workspaceStageItems.findIndex((item) => item.stage === stage) + 1
  const stageProgress = Math.round((completedStageCount / workspaceStageItems.length) * 100)
  const nextStage = workspaceStageItems[completedStageCount] ?? null

  const handleRefreshWorkspace = async () => {
    if (isRefreshing) {
      return
    }
    setIsRefreshing(true)
    await Promise.all([
      workspaceQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.detail(episodeId) }),
    ])
    setIsRefreshing(false)
  }

  return (
    <div className="grid gap-4 pb-20 animate-page-enter">
      <div className="glass-surface-elevated fixed right-6 top-24 z-40 flex gap-2 rounded-2xl p-2">
        <Link
          to="/asset-hub"
          className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm font-semibold"
        >
          Asset Hub
        </Link>
        <Link
          to="/settings"
          className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm font-semibold"
        >
          Settings
        </Link>
        <button
          type="button"
          onClick={() => void handleRefreshWorkspace()}
          disabled={isRefreshing}
          className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          title="Refresh workspace data"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{workspace.project.name}</h1>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              Episode {episode.episode_number}: {episode.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="glass-input min-w-[220px]"
              value={episode.id}
              onChange={(event) => {
                const nextEpisodeId = event.target.value
                navigate(buildWorkspaceStagePath(projectId, nextEpisodeId, stage))
              }}
            >
              {sortedEpisodes.map((item) => (
                <option key={item.id} value={item.id}>
                  Episode {item.episode_number}: {item.name}
                </option>
              ))}
            </select>
            <Link
              className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm"
              to={`/projects/${workspace.project.id}`}
            >
              Back to project
            </Link>
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Episode Capsules</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sortedEpisodes.map((item) => {
              const active = item.id === episode.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(buildWorkspaceStagePath(projectId, item.id, stage))}
                  className={[
                    'min-w-[210px] rounded-2xl border px-3 py-2 text-left transition-colors',
                    active
                      ? 'border-[var(--glass-accent-from)] bg-[var(--glass-accent-from)] text-white'
                      : 'border-[var(--glass-stroke-base)] bg-white/80 text-[var(--glass-text-secondary)] hover:bg-white',
                  ].join(' ')}
                >
                  <p className="text-xs">Episode {item.episode_number}</p>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold">{item.name}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Current Stage</p>
            <p className="mt-1 text-lg font-semibold">{stageTitle(stage)}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Stage Progress</p>
            <p className="mt-1 text-lg font-semibold">{stageProgress}%</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Active Tasks</p>
            <p className="mt-1 text-lg font-semibold">{workspace.latest_active_tasks.length}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Episode Count</p>
            <p className="mt-1 text-lg font-semibold">{workspace.episodes.length}</p>
          </article>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between text-xs text-[var(--glass-text-tertiary)]">
            <span>Pipeline Progress</span>
            <span>{stageProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/70">
            <div className="h-full rounded-full bg-[var(--glass-accent-from)]" style={{ width: `${stageProgress}%` }} />
          </div>
        </div>

        <WorkspaceStageNav projectId={projectId} episodeId={episodeId} currentStage={stage} />
      </SectionCard>

      <div key={stage} className="animate-page-enter">
        {stage === 'config' ? <ConfigStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
        {stage === 'script' ? <ScriptStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
        {stage === 'assets' ? <AssetsStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
        {stage === 'storyboard' ? (
          <StoryboardStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} />
        ) : null}
        {stage === 'prompts' ? <PromptsStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
        {stage === 'voice' ? <VoiceStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
        {stage === 'video' ? <VideoStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
      </div>

      {nextStage ? (
        <Link
          to={buildWorkspaceStagePath(projectId, episodeId, nextStage.stage)}
          className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
        >
          Continue: {nextStage.label}
        </Link>
      ) : null}
    </div>
  )
}
