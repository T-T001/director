import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '../../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import { getEpisode, updateEpisode } from '../../../services/api/episodes'
import { storyToScript } from '../../../services/api/storyboards'
import { queryKeys } from '../../../services/queryKeys'
import type { WorkspaceStagePageProps } from './types'

export function ScriptStage({ projectId, episodeId, episode }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()
  const [novelText, setNovelText] = useState(episode.novel_text ?? '')
  const [submitInfo, setSubmitInfo] = useState<{ task_id: string; run_id?: string } | null>(null)

  const episodeQuery = useQuery({
    queryKey: queryKeys.episodes.detail(episodeId),
    queryFn: () => getEpisode(episodeId),
  })

  const currentEpisode = useMemo(() => episodeQuery.data ?? episode, [episodeQuery.data, episode])

  useEffect(() => {
    setNovelText(currentEpisode.novel_text ?? '')
  }, [currentEpisode.novel_text])

  const saveMutation = useMutation({
    mutationFn: () => updateEpisode(episodeId, { novel_text: novelText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.detail(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
    },
  })

  const storyToScriptMutation = useMutation({
    mutationFn: () => storyToScript(episodeId),
    onSuccess: (result) => {
      setSubmitInfo({ task_id: result.task_id, run_id: result.run_id })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
    },
  })

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    await saveMutation.mutateAsync()
  }

  return (
    <div className="grid gap-4">
      <SectionCard>
        <h2 className="text-lg font-semibold">剧本文本输入</h2>
        <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">先保存文本，再启动 story-to-script 任务。</p>
      </SectionCard>

      <SectionCard>
        <form className="grid gap-3" onSubmit={handleSave}>
          <textarea
            className="glass-input min-h-64"
            value={novelText}
            onChange={(event) => setNovelText(event.target.value)}
            placeholder="粘贴小说文本或剧本素材..."
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? '保存中...' : '保存文本'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => storyToScriptMutation.mutate()}
              disabled={storyToScriptMutation.isPending}
            >
              {storyToScriptMutation.isPending ? '提交中...' : '执行 story-to-script'}
            </Button>
          </div>
        </form>
      </SectionCard>

      {episodeQuery.isLoading ? <LoadingState message="正在加载剧集内容..." /> : null}
      {episodeQuery.isError ? <ErrorState message="剧集详情加载失败。" /> : null}

      {submitInfo ? (
        <SectionCard className="glass-success rounded-2xl p-4 text-sm">
          已提交任务：task_id={submitInfo.task_id}
          {submitInfo.run_id ? `，run_id=${submitInfo.run_id}` : ''}
        </SectionCard>
      ) : null}

      {!currentEpisode.novel_text?.trim() ? (
        <EmptyState title="还没有文本内容" description="请先输入文本并保存，再继续下一步脚本处理。" />
      ) : null}
    </div>
  )
}
