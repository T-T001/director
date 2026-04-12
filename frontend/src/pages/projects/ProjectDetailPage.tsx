import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { createEpisode, deleteEpisode, updateEpisode } from '../../services/api/episodes'
import { deleteProject, getWorkspace, updateProject } from '../../services/api/projects'
import { buildWorkspaceStagePath } from '../../app/router/routes'
import { queryKeys } from '../../services/queryKeys'
import type { Episode, Project } from '../../types/project'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [episodeName, setEpisodeName] = useState('')
  const [episodeDescription, setEpisodeDescription] = useState('')
  const [editingProjectName, setEditingProjectName] = useState('')
  const [editingProjectDescription, setEditingProjectDescription] = useState('')
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null)
  const [editingEpisodeName, setEditingEpisodeName] = useState('')
  const [editingEpisodeDescription, setEditingEpisodeDescription] = useState('')

  const workspaceQuery = useQuery({
    queryKey: queryKeys.projects.workspace(projectId),
    queryFn: () => getWorkspace(projectId),
    enabled: !!projectId,
  })

  const workspace = workspaceQuery.data

  useEffect(() => {
    if (!workspace) return
    setEditingProjectName(workspace.project.name)
    setEditingProjectDescription(workspace.project.description || '')
  }, [workspace])

  const sortedEpisodes = useMemo(
    () => [...(workspace?.episodes ?? [])].sort((a, b) => a.episode_number - b.episode_number),
    [workspace?.episodes],
  )

  const createEpisodeMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) => createEpisode(projectId, payload),
    onSuccess: () => {
      setEpisodeName('')
      setEpisodeDescription('')
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: (payload: { name?: string; description?: Project['description'] }) => updateProject(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
    },
  })

  const updateEpisodeMutation = useMutation({
    mutationFn: ({
      episodeId,
      payload,
    }: {
      episodeId: string
      payload: Partial<Pick<Episode, 'name' | 'description' | 'novel_text' | 'srt_content' | 'audio_media_id'>>
    }) => updateEpisode(episodeId, payload),
    onSuccess: () => {
      setEditingEpisodeId(null)
      setEditingEpisodeName('')
      setEditingEpisodeDescription('')
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
    },
  })

  const deleteEpisodeMutation = useMutation({
    mutationFn: deleteEpisode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
      navigate('/projects')
    },
  })

  const handleCreateEpisode = async (event: FormEvent) => {
    event.preventDefault()
    if (!episodeName.trim()) return
    await createEpisodeMutation.mutateAsync({ name: episodeName, description: episodeDescription })
  }

  const handleProjectUpdate = async (event: FormEvent) => {
    event.preventDefault()
    await updateProjectMutation.mutateAsync({
      name: editingProjectName || workspace?.project.name,
      description: editingProjectDescription,
    })
  }

  const startEditEpisode = (episode: Episode) => {
    setEditingEpisodeId(episode.id)
    setEditingEpisodeName(episode.name)
    setEditingEpisodeDescription(episode.description || '')
  }

  const submitEpisodeUpdate = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingEpisodeId) return
    await updateEpisodeMutation.mutateAsync({
      episodeId: editingEpisodeId,
      payload: {
        name: editingEpisodeName,
        description: editingEpisodeDescription,
      },
    })
  }

  return (
    <div className="grid gap-4">
      {workspaceQuery.isLoading ? <LoadingState message="加载项目中..." /> : null}
      {workspaceQuery.isError ? <ErrorState message="项目加载失败。" /> : null}

      {workspace ? (
        <>
          <SectionCard className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">{workspace.project.name}</h1>
                <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">{workspace.project.description || '暂无描述'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedEpisodes[0] ? (
                  <Link to={buildWorkspaceStagePath(workspace.project.id, sortedEpisodes[0].id, 'config')}>
                    <Button>进入工作台</Button>
                  </Link>
                ) : null}
                <Button onClick={() => deleteProjectMutation.mutate()} variant="secondary">
                  删除项目
                </Button>
              </div>
            </div>

            <form className="grid max-w-xl gap-3" onSubmit={handleProjectUpdate}>
              <input
                className="glass-input"
                value={editingProjectName}
                onChange={(event) => setEditingProjectName(event.target.value)}
                placeholder="项目名"
              />
              <textarea
                className="glass-input min-h-28"
                value={editingProjectDescription}
                onChange={(event) => setEditingProjectDescription(event.target.value)}
                placeholder="项目描述"
                rows={4}
              />
              <div>
                <Button disabled={updateProjectMutation.isPending} type="submit">
                  保存项目信息
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard>
            <h2 className="text-lg font-semibold">创建剧集</h2>
            <form className="mt-3 grid max-w-xl gap-3" onSubmit={handleCreateEpisode}>
              <input
                className="glass-input"
                value={episodeName}
                onChange={(event) => setEpisodeName(event.target.value)}
                placeholder="剧集名称"
              />
              <textarea
                className="glass-input min-h-24"
                value={episodeDescription}
                onChange={(event) => setEpisodeDescription(event.target.value)}
                placeholder="剧集描述"
                rows={3}
              />
              <div>
                <Button disabled={createEpisodeMutation.isPending} type="submit">
                  {createEpisodeMutation.isPending ? '创建中...' : '创建剧集'}
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard>
            <h2 className="text-lg font-semibold">剧集列表</h2>
            <div className="mt-3 grid gap-3">
              {sortedEpisodes.map((episode) => (
                <div key={episode.id} className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/80 p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <strong>
                        第 {episode.episode_number} 集：{episode.name}
                      </strong>
                      <p className="mt-2 text-sm text-[var(--glass-text-tertiary)]">{episode.description || '暂无描述'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={buildWorkspaceStagePath(projectId, episode.id, 'config')}>
                        <Button variant="secondary">进入</Button>
                      </Link>
                      <Button onClick={() => startEditEpisode(episode)} variant="secondary">
                        编辑
                      </Button>
                      <Button onClick={() => deleteEpisodeMutation.mutate(episode.id)} variant="secondary">
                        删除
                      </Button>
                    </div>
                  </div>

                  {editingEpisodeId === episode.id ? (
                    <form className="mt-3 grid gap-3" onSubmit={submitEpisodeUpdate}>
                      <input
                        className="glass-input"
                        value={editingEpisodeName}
                        onChange={(event) => setEditingEpisodeName(event.target.value)}
                      />
                      <textarea
                        className="glass-input min-h-24"
                        value={editingEpisodeDescription}
                        onChange={(event) => setEditingEpisodeDescription(event.target.value)}
                        rows={3}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit">保存</Button>
                        <Button onClick={() => setEditingEpisodeId(null)} type="button" variant="secondary">
                          取消
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>

            {sortedEpisodes.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="还没有剧集" description="先创建剧集，才能进入 workspace stage 路由。" />
              </div>
            ) : null}
          </SectionCard>
        </>
      ) : null}
    </div>
  )
}
