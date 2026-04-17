import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
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
  const episodeNameInputRef = useRef<HTMLInputElement | null>(null)

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
    enabled: Boolean(projectId),
  })

  const workspace = workspaceQuery.data

  useEffect(() => {
    if (!workspace) return
    setEditingProjectName(workspace.project.name)
    setEditingProjectDescription(workspace.project.description || '')
  }, [workspace])

  const sortedEpisodes = useMemo(
    () => [...(workspace?.episodes ?? [])].sort((left, right) => left.episode_number - right.episode_number),
    [workspace?.episodes],
  )

  const activeTasks = workspace?.latest_active_tasks ?? []

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
    await createEpisodeMutation.mutateAsync({
      name: episodeName.trim(),
      description: episodeDescription.trim() || undefined,
    })
  }

  const handleProjectUpdate = async (event: FormEvent) => {
    event.preventDefault()
    await updateProjectMutation.mutateAsync({
      name: editingProjectName.trim() || workspace?.project.name,
      description: editingProjectDescription.trim() || null,
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
        name: editingEpisodeName.trim(),
        description: editingEpisodeDescription.trim() || null,
      },
    })
  }

  const handleDeleteEpisode = (episode: Episode) => {
    const confirmed = confirm(`Delete episode "${episode.name}"?`)
    if (!confirmed) return
    deleteEpisodeMutation.mutate(episode.id)
  }

  const handleDeleteProject = () => {
    const confirmed = confirm('Delete this project and all episodes?')
    if (!confirmed) return
    deleteProjectMutation.mutate()
  }

  const handleFocusCreateEpisode = () => {
    episodeNameInputRef.current?.focus()
    episodeNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="grid gap-4 pb-20 animate-page-enter">
      {workspaceQuery.isLoading ? <LoadingState message="Loading project workspace..." /> : null}
      {workspaceQuery.isError ? <ErrorState message="Failed to load project workspace." /> : null}

      {workspace ? (
        <>
          <SectionCard className="glass-surface-elevated grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">{workspace.project.name}</h1>
                <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
                  {workspace.project.description?.trim() || 'No description yet.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedEpisodes[0] ? (
                  <Link to={buildWorkspaceStagePath(workspace.project.id, sortedEpisodes[0].id, 'config')}>
                    <Button>Open Workspace</Button>
                  </Link>
                ) : null}
                <Button variant="secondary" onClick={handleDeleteProject} disabled={deleteProjectMutation.isPending}>
                  {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Episodes</p>
                <p className="mt-1 text-2xl font-semibold">{sortedEpisodes.length}</p>
              </article>
              <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Active Tasks</p>
                <p className="mt-1 text-2xl font-semibold">{activeTasks.length}</p>
              </article>
              <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Created</p>
                <p className="mt-1 text-sm font-semibold">{new Date(workspace.project.created_at).toLocaleString()}</p>
              </article>
              <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Updated</p>
                <p className="mt-1 text-sm font-semibold">{new Date(workspace.project.updated_at).toLocaleString()}</p>
              </article>
            </div>
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4">
              <SectionCard className="grid gap-3">
                <h2 className="text-base font-semibold">Project Settings</h2>
                <form className="grid gap-3" onSubmit={handleProjectUpdate}>
                  <input
                    className="glass-input"
                    value={editingProjectName}
                    onChange={(event) => setEditingProjectName(event.target.value)}
                    placeholder="Project name"
                  />
                  <textarea
                    className="glass-input min-h-28"
                    value={editingProjectDescription}
                    onChange={(event) => setEditingProjectDescription(event.target.value)}
                    placeholder="Project description"
                    rows={4}
                  />
                  <div>
                    <Button disabled={updateProjectMutation.isPending} type="submit">
                      {updateProjectMutation.isPending ? 'Saving...' : 'Save Project'}
                    </Button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard className="grid gap-3">
                <h2 className="text-base font-semibold">Episodes</h2>
                {sortedEpisodes.length > 0 ? (
                  <div className="grid gap-3">
                    {sortedEpisodes.map((episode) => (
                      <article key={episode.id} className="card-base p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-[var(--glass-text-tertiary)]">Episode {episode.episode_number}</p>
                            <h3 className="text-base font-semibold">{episode.name}</h3>
                            <p className="mt-1 text-sm text-[var(--glass-text-secondary)]">
                              {episode.description?.trim() || 'No description yet.'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link to={buildWorkspaceStagePath(projectId, episode.id, 'config')}>
                              <Button variant="secondary">Open</Button>
                            </Link>
                            <Button variant="secondary" onClick={() => startEditEpisode(episode)}>
                              Edit
                            </Button>
                            <Button variant="secondary" onClick={() => handleDeleteEpisode(episode)} disabled={deleteEpisodeMutation.isPending}>
                              Delete
                            </Button>
                          </div>
                        </div>

                        {editingEpisodeId === episode.id ? (
                          <form className="mt-3 grid gap-3" onSubmit={submitEpisodeUpdate}>
                            <input
                              className="glass-input"
                              value={editingEpisodeName}
                              onChange={(event) => setEditingEpisodeName(event.target.value)}
                              placeholder="Episode name"
                            />
                            <textarea
                              className="glass-input min-h-24"
                              value={editingEpisodeDescription}
                              onChange={(event) => setEditingEpisodeDescription(event.target.value)}
                              placeholder="Episode description"
                              rows={3}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button type="submit" disabled={updateEpisodeMutation.isPending}>
                                {updateEpisodeMutation.isPending ? 'Saving...' : 'Save Episode'}
                              </Button>
                              <Button type="button" variant="secondary" onClick={() => setEditingEpisodeId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No episodes yet" description="Create your first episode to enter the workspace stages." />
                )}
              </SectionCard>
            </div>

            <div className="grid gap-4">
              <SectionCard className="grid gap-3">
                <h2 className="text-base font-semibold">Create Episode</h2>
                <form className="grid gap-3" onSubmit={handleCreateEpisode}>
                  <input
                    className="glass-input"
                    ref={episodeNameInputRef}
                    value={episodeName}
                    onChange={(event) => setEpisodeName(event.target.value)}
                    placeholder="Episode name"
                  />
                  <textarea
                    className="glass-input min-h-24"
                    value={episodeDescription}
                    onChange={(event) => setEpisodeDescription(event.target.value)}
                    placeholder="Episode description"
                    rows={3}
                  />
                  <Button disabled={createEpisodeMutation.isPending} type="submit">
                    {createEpisodeMutation.isPending ? 'Creating...' : 'Create Episode'}
                  </Button>
                </form>
              </SectionCard>

              <SectionCard className="grid gap-2">
                <h2 className="text-base font-semibold">Active Tasks Snapshot</h2>
                {activeTasks.length === 0 ? (
                  <p className="text-sm text-[var(--glass-text-tertiary)]">No active tasks currently.</p>
                ) : (
                  activeTasks.map((task) => (
                    <article key={task.id} className="card-base px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-[var(--glass-text-secondary)]">{task.task_type}</p>
                        <span className="text-xs text-[var(--glass-text-tertiary)]">{task.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">
                        Progress: {task.progress}% | Updated: {new Date(task.updated_at).toLocaleString()}
                      </p>
                    </article>
                  ))
                )}
              </SectionCard>
            </div>
          </div>

          {sortedEpisodes[0] ? (
            <Link
              to={buildWorkspaceStagePath(workspace.project.id, sortedEpisodes[0].id, 'config')}
              className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
            >
              Enter Workspace
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleFocusCreateEpisode}
              className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
            >
              Create First Episode
            </button>
          )}
        </>
      ) : null}
    </div>
  )
}
