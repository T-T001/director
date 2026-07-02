import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { getWorkspace } from '../../services/api/projects'
import { queryKeys } from '../../services/queryKeys'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'
import { GlassSelect } from '../../components/ui/GlassSelect'
import { WorkspaceStageNav } from '../../components/layout/WorkspaceStageNav'
import { buildStageSignals, isRunningTask } from './stage-signals'
import {
  buildWorkspaceCanvasPath,
  buildWorkspaceStagePath,
  isWorkspaceStage,
  resolveWorkspaceStageFromPathname,
  workspaceStageItems,
} from '../../app/router/routes'
import { useWorkspaceStore } from '../../app/store/workspace.store'
import { ScriptStage } from './stages/ScriptStage'
import { AssetsStage } from './stages/AssetsStage'
import { StoryboardStage } from './stages/StoryboardStage'
import { PromptsStage } from './stages/PromptsStage'
import { VoiceStage } from './stages/VoiceStage'
import { VideoStage } from './stages/VideoStage'
import { ProjectSettingsModal } from './components/ProjectSettingsModal'
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
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  if (projectId && episodeId && stage === 'config') {
    return <Navigate to={buildWorkspaceStagePath(projectId, episodeId, 'script')} replace />
  }

  if (!projectId || !episodeId || !isWorkspaceStage(stage)) {
    return <Navigate to="/projects" replace />
  }

  if (workspaceQuery.isLoading) {
    return <LoadingState message="正在加载工作区..." />
  }

  if (workspaceQuery.isError || !workspace) {
    return <ErrorState message="加载工作区失败。" />
  }

  if (!episode) {
    return (
      <div className="grid gap-4">
        <EmptyState title="未找到剧集" description="请先创建剧集，再重新打开工作区。" />
        <Link className="glass-btn-base glass-btn-secondary w-fit px-3 py-2 text-sm" to={`/projects/${projectId}`}>
          返回项目
        </Link>
      </div>
    )
  }

  const currentStageIndex = workspaceStageItems.findIndex((item) => item.stage === stage)
  const completedStageCount = currentStageIndex + 1
  const stageProgress = Math.round((completedStageCount / workspaceStageItems.length) * 100)
  const nextStage = workspaceStageItems[completedStageCount] ?? null
  const activeTaskCount = workspace.latest_active_tasks.filter((task) => isRunningTask(task.status)).length
  const hasNovelText = Boolean(episode.novel_text?.trim())
  const hasSrt = Boolean(episode.srt_content?.trim())
  const hasAudio = Boolean(episode.audio_media_id)
  const stageSignals = buildStageSignals({
    hasNovelText,
    hasSrt,
    hasAudio,
    tasks: workspace.latest_active_tasks,
  })

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
      <SectionCard className="glass-surface-elevated grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="field-label text-[var(--glass-accent-cyan)]">Single episode production desk</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">{workspace.project.name}</h1>
            <p className="mt-2 text-sm text-[var(--glass-text-tertiary)]">
              当前制作：第 {episode.episode_number} 集《{episode.name}》 · {stageTitle(stage)}阶段
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={buildWorkspaceCanvasPath(projectId, episodeId)}
              className="glass-btn-base glass-btn-primary rounded-xl px-3 py-2 text-sm font-semibold"
            >
              画布模式
            </Link>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="glass-btn-base glass-btn-secondary rounded-xl px-3 py-2 text-sm font-semibold"
            >
项目配置
            </button>
            <Link to="/asset-hub" className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm font-semibold">
全局资产
            </Link>
            <Link to="/settings" className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm font-semibold">
模型设置
            </Link>
            <button
              type="button"
              onClick={() => void handleRefreshWorkspace()}
              disabled={isRefreshing}
              className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              title="刷新工作区数据"
            >
              {isRefreshing ? '刷新中...' : '刷新'}
            </button>
            <Link className="glass-btn-base glass-btn-secondary rounded-xl px-3 py-2 text-sm" to={`/projects/${workspace.project.id}`}>
返回制作台
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <GlassSelect
            className="min-w-[260px]"
            value={episode.id}
            onChange={(nextEpisodeId) => navigate(buildWorkspaceStagePath(projectId, nextEpisodeId, stage))}
            ariaLabel="切换剧集"
            options={sortedEpisodes.map((item) => ({
              value: item.id,
              label: `第 ${item.episode_number} 集：${item.name}`,
            }))}
          />
        </div>

        <div className="grid gap-2">
          <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">剧集切换 · 保持当前制作阶段</p>
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
                      ? 'border-amber-200/30 bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-stone-950 shadow-[var(--glass-shadow-sm)]'
                      : 'border-[var(--glass-stroke-base)] bg-white/[0.045] text-[var(--glass-text-secondary)] hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/10',
                  ].join(' ')}
                >
                  <p className="text-xs">第 {item.episode_number} 集</p>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold">{item.name}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="metric-card p-4">
            <p className="field-label">当前工位</p>
            <p className="mt-2 text-lg font-black">{stageTitle(stage)}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">阶段位置</p>
            <p className="mt-2 text-lg font-black text-[var(--glass-accent-cyan)]">{stageProgress}%</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">运行任务</p>
            <p className="mt-2 text-lg font-black">{activeTaskCount}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">全项目剧集</p>
            <p className="mt-2 text-lg font-black">{workspace.episodes.length}</p>
          </article>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between text-xs text-[var(--glass-text-tertiary)]">
<span>本集制作位置</span>
            <span>{stageProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full border border-[var(--glass-stroke-soft)] bg-black/28">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--glass-accent-from)] to-[var(--glass-accent-cyan)]" style={{ width: `${stageProgress}%` }} />
          </div>
        </div>

<WorkspaceStageNav projectId={projectId} episodeId={episodeId} currentStage={stage} signals={stageSignals} />
      </SectionCard>

      <div key={stage} className="animate-page-enter">
        {stage === 'script' ? <ScriptStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
        {stage === 'assets' ? <AssetsStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
        {stage === 'storyboard' ? (
          <StoryboardStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} />
        ) : null}
        {stage === 'prompts' ? <PromptsStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
        {stage === 'voice' ? <VoiceStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
        {stage === 'video' ? <VideoStage projectId={projectId} episodeId={episodeId} workspace={workspace} episode={episode} /> : null}
      </div>

      <ProjectSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} projectId={projectId} workspace={workspace} />

      {nextStage ? (
        <Link
          to={buildWorkspaceStagePath(projectId, episodeId, nextStage.stage)}
          className="page-command fixed bottom-6 right-6 z-40 px-6 py-3 text-sm font-black text-[var(--glass-text-primary)] transition hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/10"
        >
继续制作：{nextStage.label}
        </Link>
      ) : null}
    </div>
  )
}
