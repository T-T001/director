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
    <div className="grid gap-5 pb-12 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="field-label text-[var(--glass-accent-cyan)]">Manju project studio</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">漫剧制作台</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--glass-text-tertiary)]">
              每个项目都是一条从原文拆集、剧本片段、角色场景资产到分镜成片的生产线。
            </p>
          </div>
          <button
            type="button"
            onClick={handleFocusCreate}
            className="glass-btn-base glass-btn-secondary rounded-2xl px-4 py-2.5 text-sm"
          >
新建漫剧项目
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="metric-card p-4">
            <p className="field-label">制作项目</p>
            <p className="mt-2 text-3xl font-black">{projects.length}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">当前筛选</p>
            <p className="mt-2 text-3xl font-black text-[var(--glass-accent-cyan)]">{filteredProjects.length}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">排序方式</p>
            <p className="mt-2 text-sm font-bold text-[var(--glass-text-secondary)]">
              {sortMode === 'updated-desc' ? '最近更新优先' : '名称 A → Z'}
            </p>
          </article>
        </div>
      </SectionCard>

      <SectionCard className="grid gap-4">
        <div>
          <p className="field-label">New production slate</p>
          <h2 className="mt-1 text-lg font-black">创建漫剧项目</h2>
        </div>
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={handleCreate}>
          <input
            className="glass-input"
            ref={nameInputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
placeholder="漫剧项目名称"
          />
          <input
            className="glass-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
placeholder="题材、主角、受众或成片风格（可选）"
          />
          <Button disabled={createMutation.isPending} type="submit">
{createMutation.isPending ? '创建中...' : '创建制作线'}
          </Button>
        </form>
      </SectionCard>

      <SectionCard className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="field-label">Production lines</p>
            <h2 className="mt-1 text-lg font-black">漫剧项目列表</h2>
          </div>
          <div className="grid w-full max-w-md grid-cols-[minmax(0,1fr)_160px] gap-2">
            <input
              className="glass-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
placeholder="搜索项目、题材或主角"
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
                <article className="card-base h-full p-4">
                  <p className="field-label text-[var(--glass-accent-cyan)]">漫剧制作线</p>
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
        ) : null}

        {projectsQuery.data && projectsQuery.data.length === 0 ? (
          <EmptyState title="还没有漫剧项目" description="创建第一个项目后，先导入原文，再拆成可制作的剧集。" />
        ) : null}

        {projectsQuery.data && projectsQuery.data.length > 0 && filteredProjects.length === 0 ? (
          <EmptyState title="没有匹配的制作线" description="换个项目名、题材或角色关键词试试。" />
        ) : null}
      </SectionCard>
    </div>
  )
}
