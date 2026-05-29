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
    <div className="grid gap-5 pb-12 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="field-label text-[var(--glass-accent-cyan)]">Manju production deck</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">漫剧制作总台</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--glass-text-tertiary)]">
              从小说原文到剧集、角色资产、分镜面板、配音与成片输出的总入口。
            </p>
          </div>
          <Link
            to="/projects"
            className="glass-btn-base glass-btn-secondary rounded-2xl px-4 py-2.5 text-sm"
          >
打开制作台
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="metric-card p-4">
            <p className="field-label">制作项目</p>
            <p className="mt-3 text-3xl font-black text-[var(--glass-text-primary)]">{projectsQuery.data?.length ?? 0}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">最近制作</p>
            <p className="mt-3 text-3xl font-black text-[var(--glass-accent-cyan)]">{recentProjects.length}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">最新剧组</p>
            <p className="mt-3 line-clamp-1 text-lg font-black">{latestUpdated?.name ?? '—'}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">最后推进</p>
            <p className="mt-3 text-sm font-bold text-[var(--glass-text-secondary)]">
              {latestUpdated ? new Date(latestUpdated.updated_at).toLocaleString('zh-CN') : '—'}
            </p>
          </article>
        </div>
      </SectionCard>

      {projectsQuery.isLoading ? <LoadingState message="正在加载项目概览..." /> : null}
      {projectsQuery.isError ? <ErrorState message="加载项目概览失败。" /> : null}

      {projectsQuery.data && projectsQuery.data.length > 0 ? (
        <SectionCard className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="field-label">Recent production slates</p>
              <h2 className="mt-1 text-lg font-black">最近推进的漫剧项目</h2>
            </div>
            <Link className="text-sm font-bold text-[var(--glass-accent-from)] hover:text-[var(--glass-accent-to)]" to="/projects">
查看全部制作项目
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentProjects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <article className="card-base h-full p-4">
                  <p className="field-label text-[var(--glass-accent-cyan)]">剧集制作板</p>
                  <h3 className="mt-2 text-base font-black tracking-wide">{project.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--glass-text-secondary)]">
                    {project.description?.trim() || '暂无描述。'}
                  </p>
                  <div className="subtle-divider my-3" />
                  <p className="text-xs text-[var(--glass-text-tertiary)]">
                    更新于：{new Date(project.updated_at).toLocaleString('zh-CN')}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {projectsQuery.data && projectsQuery.data.length === 0 ? (
        <EmptyState
          title="还没有漫剧项目"
          description="前往制作台创建第一个项目，导入原文并拆成可制作的剧集。"
        />
      ) : null}
    </div>
  )
}
