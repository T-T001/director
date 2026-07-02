import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Settings, Trash2, Calendar, Activity, Clapperboard, Workflow } from 'lucide-react'

import { createEpisode, deleteEpisode, updateEpisode } from '../../services/api/episodes'
import { analyzeNPIntakePreview, analyzeNPEpisode, convertNPScreenplay } from '../../services/api/novel-promotion'
import { deleteProject, getWorkspace, updateProject } from '../../services/api/projects'
import { getTask } from '../../services/api/tasks'
import { buildWorkspaceCanvasPath, buildWorkspaceStagePath } from '../../app/router/routes'
import { queryKeys } from '../../services/queryKeys'
import type { Project } from '../../types/project'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'
import type { SplitEpisode } from '../../lib/episode-marker-detector'
import { ProjectStageNav } from './components/ProjectStageNav'
import { projectStages, type ProjectStage } from './components/project-stages'
import { NovelIntakeStage, type IntakeSubmitProgress } from './components/NovelIntakeStage'
import { EpisodeSidebar, type EpisodeListItem } from './components/EpisodeSidebar'

async function pollTask(taskId: string, intervalMs = 1500) {
  for (;;) {
    const task = await getTask(taskId)
    if (task.status === 'completed') return task
    if (task.status === 'failed' || task.status === 'canceled') {
      throw new Error(task.error_message ?? `task ${task.status}`)
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [stage, setStage] = useState<ProjectStage>('intake')
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null)
  const [enableNarration, setEnableNarration] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [editingDesc, setEditingDesc] = useState('')
  const [projectFeedback, setProjectFeedback] = useState<string | null>(null)
  const [submitProgress, setSubmitProgress] = useState<IntakeSubmitProgress | null>(null)

  const workspaceQuery = useQuery({
    queryKey: queryKeys.projects.workspace(projectId),
    queryFn: () => getWorkspace(projectId),
    enabled: Boolean(projectId),
  })

  const workspace = workspaceQuery.data

  const sortedEpisodes = useMemo(
    () => [...(workspace?.episodes ?? [])].sort((l, r) => l.episode_number - r.episode_number),
    [workspace?.episodes],
  )

  const episodeListItems: EpisodeListItem[] = useMemo(
    () => sortedEpisodes.map((ep) => ({ id: ep.id, episodeNumber: ep.episode_number, name: ep.name })),
    [sortedEpisodes],
  )

  useEffect(() => {
    if (!workspace) return
    setEditingName(workspace.project.name)
    setEditingDesc(workspace.project.description || '')
  }, [workspace])

  useEffect(() => {
    if (!currentEpisodeId && sortedEpisodes.length > 0) {
      setCurrentEpisodeId(sortedEpisodes[0].id)
    }
    if (currentEpisodeId && !sortedEpisodes.some((ep) => ep.id === currentEpisodeId)) {
      setCurrentEpisodeId(sortedEpisodes[0]?.id ?? null)
    }
  }, [currentEpisodeId, sortedEpisodes])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })

  const updateProjectMutation = useMutation({
    mutationFn: (payload: { name?: string; description?: Project['description']; intake_novel_text?: Project['intake_novel_text'] }) => updateProject(projectId, payload),
    onSuccess: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
      setProjectFeedback('已保存项目设置。')
    },
    onError: (err) => setProjectFeedback(err instanceof Error ? err.message : '保存失败。'),
  })

  const saveIntakeDraftMutation = useMutation({
    mutationFn: (value: string) => updateProject(projectId, { intake_novel_text: value.trim() ? value : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
      navigate('/projects')
    },
  })

  const createEpisodeMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; novel_text?: string }) =>
      createEpisode(projectId, payload),
    onSuccess: () => invalidate(),
  })

  const updateEpisodeMutation = useMutation({
    mutationFn: ({ episodeId, name }: { episodeId: string; name: string }) =>
      updateEpisode(episodeId, { name }),
    onSuccess: () => invalidate(),
  })

  const deleteEpisodeMutation = useMutation({
    mutationFn: deleteEpisode,
    onSuccess: () => invalidate(),
  })

  const handleCreateEpisodes = async (episodes: SplitEpisode[]) => {
    setSubmitProgress({ stage: 'create', current: 0, total: episodes.length })
    const createdIds: string[] = []
    let created = 0
    let failed = 0
    let firstId: string | null = null

    for (const ep of episodes) {
      try {
        const result = await createEpisode(projectId, {
          name: ep.title.trim() || `第 ${ep.number} 集`,
          description: ep.summary.trim() || undefined,
          novel_text: ep.content.trim() || undefined,
        })
        created += 1
        createdIds.push(result.id)
        if (!firstId) firstId = result.id
      } catch {
        failed += 1
      } finally {
        setSubmitProgress({ stage: 'create', current: created + failed, total: episodes.length })
      }
    }

    let analyzeFailed = 0
    let screenplayFailed = 0

    if (createdIds.length > 0) {
      setSubmitProgress({ stage: 'analyze', current: 0, total: createdIds.length })
      for (let i = 0; i < createdIds.length; i += 1) {
        const episodeId = createdIds[i]
        try {
          const { task_id } = await analyzeNPEpisode(projectId, { episode_id: episodeId })
          await pollTask(task_id)
        } catch (err) {
          analyzeFailed += 1
          console.error('np_analyze failed for', episodeId, err)
        }
        setSubmitProgress({ stage: 'analyze', current: i + 1, total: createdIds.length })
      }

      setSubmitProgress({ stage: 'screenplay', current: 0, total: createdIds.length })
      for (let i = 0; i < createdIds.length; i += 1) {
        const episodeId = createdIds[i]
        try {
          const { task_id } = await convertNPScreenplay(projectId, { episode_id: episodeId })
          await pollTask(task_id)
        } catch (err) {
          screenplayFailed += 1
          console.error('np_screenplay_conversion failed for', episodeId, err)
        }
        setSubmitProgress({ stage: 'screenplay', current: i + 1, total: createdIds.length })
      }
    }

    await invalidate()
    setSubmitProgress(null)
    if (firstId) setCurrentEpisodeId(firstId)
    return { created, failed, analyzeFailed, screenplayFailed }
  }

  const handleStageChange = (nextStage: ProjectStage) => {
    if (nextStage === 'intake') {
      setStage('intake')
      return
    }
    const targetEpisodeId = currentEpisodeId ?? sortedEpisodes[0]?.id
    if (!targetEpisodeId) {
      setStage('intake')
      return
    }
    const workspaceStage =
      nextStage === 'storyboard' ? 'storyboard'
      : nextStage === 'voice' ? 'voice'
      : nextStage === 'video' ? 'video'
      : nextStage === 'assets' ? 'assets'
      : 'script'
    navigate(buildWorkspaceStagePath(projectId, targetEpisodeId, workspaceStage))
  }

  const handleProjectUpdate = async () => {
    if (!workspace) return
    await updateProjectMutation.mutateAsync({
      name: editingName.trim() || workspace.project.name,
      description: editingDesc.trim() || null,
    })
  }

  const handleDeleteProject = () => {
    const ok = confirm('确定要删除这条漫剧制作线及其全部剧集吗？此操作不可恢复。')
    if (!ok) return
    deleteProjectMutation.mutate()
  }

  if (workspaceQuery.isLoading) {
    return <LoadingState message="正在加载项目工作区..." />
  }

  if (workspaceQuery.isError || !workspace) {
    return <ErrorState message="加载项目工作区失败。" />
  }

  const stageTitle = projectStages.find((s) => s.id === stage)?.label ?? ''

  return (
    <div className="animate-page-enter grid gap-6 pb-20">
      <div className="glass-surface-elevated relative overflow-hidden rounded-3xl">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-[var(--glass-accent-from)]/15 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-gradient-to-tr from-[var(--glass-tone-info-bg)]/80 to-transparent blur-3xl" />

        <div className="relative grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-white shadow-[var(--glass-shadow-sm)]">
                <Clapperboard className="h-4 w-4" />
              </span>
              <h1 className="truncate text-lg font-bold text-[var(--glass-text-primary)]">{workspace.project.name}</h1>
              <span className="glass-chip text-[11px]">漫剧制作台</span>
              <span className="glass-chip text-[11px]">{sortedEpisodes.length} 集</span>
            </div>
            <p className="mt-1 line-clamp-1 pl-9 text-xs text-[var(--glass-text-tertiary)]">
{workspace.project.description?.trim() || '暂无项目设定 · 可在「项目设置」补充题材、主角与成片风格'}
            </p>
          </div>

          <div className="flex justify-center">
            <ProjectStageNav
              currentStage={stage}
              onStageChange={handleStageChange}
              hasEpisodes={sortedEpisodes.length > 0}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={sortedEpisodes.length === 0}
              onClick={() => {
                const targetEpisodeId = currentEpisodeId ?? sortedEpisodes[0]?.id
                if (targetEpisodeId) navigate(buildWorkspaceCanvasPath(projectId, targetEpisodeId))
              }}
              title={sortedEpisodes.length === 0 ? '先拆集创建剧集后可用' : '以节点画布方式制作当前剧集'}
              className="glass-btn-base glass-btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs disabled:cursor-not-allowed"
            >
              <Workflow className="h-3.5 w-3.5" />
              画布模式
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="glass-btn-base glass-btn-ghost inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs"
            >
              <Settings className="h-3.5 w-3.5" />
制作设置
            </button>
          </div>
        </div>
      </div>

      <EpisodeSidebar
        projectName={workspace.project.name}
        episodes={episodeListItems}
        currentEpisodeId={currentEpisodeId}
        onEpisodeSelect={(id) => setCurrentEpisodeId(id)}
        onEpisodeCreate={async (name) => {
          await createEpisodeMutation.mutateAsync({ name })
        }}
        onEpisodeRename={async (id, name) => {
          await updateEpisodeMutation.mutateAsync({ episodeId: id, name })
        }}
        onEpisodeDelete={async (id) => {
          await deleteEpisodeMutation.mutateAsync(id)
        }}
        onGlobalAssetsClick={() => navigate('/asset-hub')}
      />

      {stage === 'intake' ? (
        <NovelIntakeStage
          key={projectId}
          projectId={projectId}
          projectName={workspace.project.name}
          hasEpisodes={sortedEpisodes.length > 0}
          episodeCount={sortedEpisodes.length}
          initialNovelText={workspace.project.intake_novel_text ?? ''}
          onPersistNovelText={(value) => saveIntakeDraftMutation.mutateAsync(value)}
          enableNarration={enableNarration}
          onEnableNarrationChange={setEnableNarration}
          onAnalyzePreview={(payload) => analyzeNPIntakePreview(projectId, payload)}
          onCreateEpisodes={handleCreateEpisodes}
          onOpenAssetHub={() => navigate('/asset-hub')}
          submitProgress={submitProgress}
        />
      ) : (
<SectionCard className="grid gap-3 text-center">
          <h2 className="text-lg font-semibold text-[var(--glass-text-primary)]">正在进入「{stageTitle}」制作阶段</h2>
          <p className="text-sm text-[var(--glass-text-secondary)]">将打开当前剧集的单集生产台，继续处理镜头、资产、分镜与成片输出。</p>
        </SectionCard>
      )}

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="制作设置"
        subtitle="修改漫剧项目名称、题材描述或删除整条制作线"
        width={520}
      >
        <div className="grid gap-4">
          <label className="grid gap-1">
<span className="text-xs font-medium text-[var(--glass-text-secondary)]">漫剧项目名称</span>
            <input
              className="glass-input"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
placeholder="漫剧项目名称"
            />
          </label>
          <label className="grid gap-1">
<span className="text-xs font-medium text-[var(--glass-text-secondary)]">题材与制作说明</span>
            <textarea
              className="glass-input min-h-28"
              value={editingDesc}
              onChange={(e) => setEditingDesc(e.target.value)}
placeholder="题材、主角、受众、画风或平台方向"
              rows={4}
            />
          </label>

          <div className="grid gap-3 rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] p-3 text-xs">
            <div className="flex items-center gap-2 text-[var(--glass-text-tertiary)]">
              <Calendar className="h-3.5 w-3.5" />
              创建：{new Date(workspace.project.created_at).toLocaleString('zh-CN')}
            </div>
            <div className="flex items-center gap-2 text-[var(--glass-text-tertiary)]">
              <Activity className="h-3.5 w-3.5" />
              最近更新：{new Date(workspace.project.updated_at).toLocaleString('zh-CN')}
            </div>
          </div>

          {projectFeedback ? (
            <div className="glass-success rounded-xl px-3 py-2 text-xs">{projectFeedback}</div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDeleteProject}
              disabled={deleteProjectMutation.isPending}
              className="glass-btn-base inline-flex items-center gap-1.5 rounded-xl border border-[var(--glass-tone-danger-fg)]/40 bg-[var(--glass-tone-danger-bg)]/50 px-3 py-2 text-xs text-[var(--glass-tone-danger-fg)] transition hover:brightness-95 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleteProjectMutation.isPending ? '删除中...' : '删除制作线'}
            </button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSettingsOpen(false)}>取消</Button>
              <Button onClick={() => void handleProjectUpdate()} disabled={updateProjectMutation.isPending}>
                {updateProjectMutation.isPending ? '保存中...' : '保存设置'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
