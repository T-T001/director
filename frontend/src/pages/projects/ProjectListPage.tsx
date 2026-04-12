import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { createProject, listProjects } from '../../services/api/projects'
import { queryKeys } from '../../services/queryKeys'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'

export function ProjectListPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.all(),
    queryFn: listProjects,
  })

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      setName('')
      setDescription('')
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
    },
  })

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    await createMutation.mutateAsync({ name, description })
  }

  return (
    <div className="grid gap-4">
      <SectionCard>
        <h1 className="text-xl font-semibold">项目列表</h1>
        <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">这是 director 第一版最小项目入口。</p>
      </SectionCard>

      <SectionCard>
        <h2 className="text-lg font-semibold">新建项目</h2>
        <form className="mt-3 grid max-w-xl gap-3" onSubmit={handleCreate}>
          <input className="glass-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="项目名" />
          <textarea
            className="glass-input min-h-28"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="项目描述"
            rows={4}
          />
          <div>
            <Button disabled={createMutation.isPending} type="submit">
              {createMutation.isPending ? '创建中...' : '创建项目'}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard>
        <h2 className="text-lg font-semibold">已有项目</h2>
        <div className="mt-3 grid gap-3">
          {projectsQuery.isLoading ? <LoadingState message="加载中..." /> : null}
          {projectsQuery.isError ? <ErrorState message="项目加载失败。" /> : null}
          {projectsQuery.data?.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/80 p-4 transition-colors hover:bg-white"
            >
              <strong>{project.name}</strong>
              <p className="mt-2 text-sm text-[var(--glass-text-tertiary)]">{project.description || '暂无描述'}</p>
            </Link>
          ))}

          {projectsQuery.data && projectsQuery.data.length === 0 ? (
            <EmptyState title="还没有项目" description="先创建一个项目再进入剧集和工作台。" />
          ) : null}
        </div>
      </SectionCard>
    </div>
  )
}
