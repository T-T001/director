import { FormEvent, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { createProject, listProjects } from '../../services/api/projects'
import { queryKeys } from '../../services/queryKeys'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common/PageState'

type SortMode = 'updated-desc' | 'name-asc'

function sortProjects<T extends { name: string; updated_at: string }>(items: T[], mode: SortMode) {
  const sorted = [...items]
  sorted.sort((left, right) => {
    if (mode === 'name-asc') {
      return left.name.localeCompare(right.name, 'zh-CN')
    }
    return Date.parse(right.updated_at) - Date.parse(left.updated_at)
  })
  return sorted
}

export function ProjectListPage() {
  const queryClient = useQueryClient()
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('updated-desc')

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

  const projects = projectsQuery.data ?? []

  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const matched = !keyword
      ? projects
      : projects.filter((project) => {
          const text = `${project.name} ${project.description ?? ''}`.toLowerCase()
          return text.includes(keyword)
        })
    return sortProjects(matched, sortMode)
  }, [projects, search, sortMode])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    await createMutation.mutateAsync({ name: name.trim(), description: description.trim() || undefined })
  }

  const handleFocusCreate = () => {
    nameInputRef.current?.focus()
    nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="grid gap-4 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">项目中心</h1>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              创建、浏览、进入项目，开启阶段化生产流程。
            </p>
          </div>
          <div className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-sm">
            共 <strong>{projects.length}</strong> 个
          </div>
        </div>
      </SectionCard>

      <SectionCard className="grid gap-3">
        <h2 className="text-base font-semibold">创建新项目</h2>
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={handleCreate}>
          <input
            className="glass-input"
            ref={nameInputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="项目名称"
          />
          <input
            className="glass-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="项目描述（可选）"
          />
          <Button disabled={createMutation.isPending} type="submit">
            {createMutation.isPending ? '创建中...' : '创建项目'}
          </Button>
        </form>
      </SectionCard>

      <SectionCard className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">项目列表</h2>
          <div className="grid w-full max-w-md grid-cols-[minmax(0,1fr)_160px] gap-2">
            <input
              className="glass-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索项目"
            />
            <select className="glass-input" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="updated-desc">最近更新</option>
              <option value="name-asc">名称 A→Z</option>
            </select>
          </div>
        </div>

        {projectsQuery.isLoading ? <LoadingState message="正在加载项目..." /> : null}
        {projectsQuery.isError ? <ErrorState message="加载项目失败。" /> : null}

        {projectsQuery.data && filteredProjects.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <article className="card-base h-full p-4 transition-transform hover:-translate-y-0.5">
                  <h3 className="text-base font-semibold">{project.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-[var(--glass-text-secondary)]">
                    {project.description?.trim() || '暂无描述。'}
                  </p>
                  <p className="mt-3 text-xs text-[var(--glass-text-tertiary)]">
                    更新于：{new Date(project.updated_at).toLocaleString('zh-CN')}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        ) : null}

        {projectsQuery.data && projectsQuery.data.length === 0 ? (
          <EmptyState title="还没有项目" description="创建你的第一个项目，开始构建剧集与阶段。" />
        ) : null}

        {projectsQuery.data && projectsQuery.data.length > 0 && filteredProjects.length === 0 ? (
          <EmptyState title="没有匹配的项目" description="换个关键词试试，或清空搜索框查看全部。" />
        ) : null}
      </SectionCard>

      <button
        type="button"
        onClick={handleFocusCreate}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        新建项目
      </button>
    </div>
  )
}
