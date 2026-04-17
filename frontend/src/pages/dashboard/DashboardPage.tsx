import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { listProjects } from '../../services/api/projects'
import { queryKeys } from '../../services/queryKeys'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'

export function DashboardPage() {
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.all(),
    queryFn: listProjects,
  })

  const recentProjects = useMemo(() => {
    const items = projectsQuery.data ?? []
    return [...items]
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
      .slice(0, 6)
  }, [projectsQuery.data])

  const latestUpdated = useMemo(() => {
    if (!projectsQuery.data || projectsQuery.data.length === 0) return null
    const latest = [...projectsQuery.data].sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))[0]
    return latest
  }, [projectsQuery.data])

  return (
    <div className="grid gap-4 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Workspace Overview</h1>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              Entry point for project management and stage-based production flow.
            </p>
          </div>
          <Link
            to="/projects"
            className="glass-btn-base glass-btn-ghost rounded-xl px-3 py-2 text-sm"
          >
            Open Project Center
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Total Projects</p>
            <p className="mt-1 text-2xl font-semibold">{projectsQuery.data?.length ?? 0}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Recent Updates</p>
            <p className="mt-1 text-2xl font-semibold">{recentProjects.length}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Latest Project</p>
            <p className="mt-1 line-clamp-1 text-lg font-semibold">{latestUpdated?.name ?? '-'}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Last Activity</p>
            <p className="mt-1 text-sm font-semibold">
              {latestUpdated ? new Date(latestUpdated.updated_at).toLocaleString() : '-'}
            </p>
          </article>
        </div>
      </SectionCard>

      {projectsQuery.isLoading ? <LoadingState message="Loading project overview..." /> : null}
      {projectsQuery.isError ? <ErrorState message="Failed to load project overview." /> : null}

      {projectsQuery.data && projectsQuery.data.length > 0 ? (
        <SectionCard className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Recent Projects</h2>
            <Link className="text-sm text-[var(--glass-accent-from)] underline" to="/projects">
              View all projects
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentProjects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <article className="card-base h-full p-3 transition-transform hover:-translate-y-0.5">
                  <h3 className="text-base font-semibold">{project.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-[var(--glass-text-secondary)]">
                    {project.description?.trim() || 'No description yet.'}
                  </p>
                  <p className="mt-3 text-xs text-[var(--glass-text-tertiary)]">
                    Updated: {new Date(project.updated_at).toLocaleString()}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {projectsQuery.data && projectsQuery.data.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project in Project Center to start the stage workflow."
        />
      ) : null}

      <Link
        to="/projects"
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        Enter Project Center
      </Link>
    </div>
  )
}
