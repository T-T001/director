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

  return (
    <div className="grid gap-4">
      <SectionCard>
        <h1 className="text-xl font-semibold">控制台</h1>
        <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
          第一版主链路入口：项目、剧集、工作台分阶段操作。
        </p>
      </SectionCard>

      {projectsQuery.isLoading ? <LoadingState message="正在加载项目概览..." /> : null}
      {projectsQuery.isError ? <ErrorState message="项目概览加载失败。" /> : null}

      {projectsQuery.data && projectsQuery.data.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projectsQuery.data.slice(0, 6).map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <SectionCard className="h-full transition-transform hover:-translate-y-0.5">
                <h2 className="text-base font-semibold">{project.name}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--glass-text-tertiary)]">
                  {project.description || '暂无描述'}
                </p>
              </SectionCard>
            </Link>
          ))}
        </div>
      ) : null}

      {projectsQuery.data && projectsQuery.data.length === 0 ? (
        <EmptyState title="还没有项目" description="去项目页创建第一个项目，开始文本到分镜的工作流。" />
      ) : null}
    </div>
  )
}
