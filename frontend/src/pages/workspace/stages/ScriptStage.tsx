import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '../../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../../components/common/PageState'
import { getEpisode, updateEpisode } from '../../../services/api/episodes'
import { storyToScript } from '../../../services/api/storyboards'
import { queryKeys } from '../../../services/queryKeys'
import { buildWorkspaceStagePath } from '../../../app/router/routes'
import { buildEpisodeStageLines, inferSpeaker } from './episode-stage-content'
import type { WorkspaceStagePageProps } from './types'

function wordCount(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function ScriptStage({ projectId, episodeId, episode }: WorkspaceStagePageProps) {
  const queryClient = useQueryClient()
  const [novelText, setNovelText] = useState(episode.novel_text ?? '')
  const [submitInfo, setSubmitInfo] = useState<{ task_id: string; run_id?: string } | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const episodeQuery = useQuery({
    queryKey: queryKeys.episodes.detail(episodeId),
    queryFn: () => getEpisode(episodeId),
    enabled: Boolean(episodeId),
  })

  const currentEpisode = useMemo(() => episodeQuery.data ?? episode, [episodeQuery.data, episode])

  useEffect(() => {
    setNovelText(currentEpisode.novel_text ?? '')
  }, [currentEpisode.novel_text])

  const draftDirty = useMemo(() => novelText !== (currentEpisode.novel_text ?? ''), [currentEpisode.novel_text, novelText])

  const parsedLines = useMemo(
    () =>
      buildEpisodeStageLines({
        novel_text: novelText,
        srt_content: null,
      }),
    [novelText],
  )

  const speakerSet = useMemo(() => {
    const set = new Set<string>()
    parsedLines.forEach((line) => {
      const speaker = inferSpeaker(line.text)
      if (speaker) set.add(speaker)
    })
    return set
  }, [parsedLines])

  const saveMutation = useMutation({
    mutationFn: () => updateEpisode(episodeId, { novel_text: novelText.trim() ? novelText : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.detail(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      setFeedback('剧本文本已保存。')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '保存剧本失败。'
      setFeedback(message)
    },
  })

  const storyToScriptMutation = useMutation({
    mutationFn: () => storyToScript(episodeId, {}),
    onSuccess: (result) => {
      setSubmitInfo({ task_id: result.task_id, run_id: result.run_id })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      setFeedback('已提交「故事转剧本」任务。')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '提交任务失败。'
      setFeedback(message)
    },
  })

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    await saveMutation.mutateAsync()
  }

  const injectSample = () => {
    const sample = [
      '主角：今夜的城市灯火格外安静。',
      '旁白：一场骤雨从海港的方向卷来。',
      '同伴：我们得在信号消失前离开。',
    ].join('\n')
    setNovelText((previous) => (previous.trim() ? previous : sample))
  }

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">剧本阶段</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              撰写并保存原始文本，随后触发「故事转剧本」任务，进入下游阶段。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'config')}>
              <Button variant="secondary">返回配置</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'assets')}>
              <Button variant="secondary">进入素材</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'storyboard')}>
              <Button variant="secondary">进入分镜</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">字符数</p>
            <p className="mt-1 text-2xl font-semibold">{novelText.length}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">词数</p>
            <p className="mt-1 text-2xl font-semibold">{wordCount(novelText)}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">段落数</p>
            <p className="mt-1 text-2xl font-semibold">{parsedLines.length}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">识别发言者</p>
            <p className="mt-1 text-2xl font-semibold">{speakerSet.size}</p>
          </article>
        </div>
      </SectionCard>

      {feedback ? <SectionCard className="glass-success rounded-2xl p-4 text-sm">{feedback}</SectionCard> : null}

      <SectionCard className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">剧本编辑器</h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={injectSample}>
              插入示例
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setNovelText(currentEpisode.novel_text ?? '')}
              disabled={!draftDirty || saveMutation.isPending}
            >
              重置
            </Button>
          </div>
        </div>
        <form className="grid gap-3" onSubmit={handleSave}>
          <textarea
            className="glass-input min-h-64"
            value={novelText}
            onChange={(event) => setNovelText(event.target.value)}
            placeholder="粘贴小说原文或按行撰写剧本内容..."
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!draftDirty || saveMutation.isPending}>
              {saveMutation.isPending ? '保存中...' : '保存文本'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => storyToScriptMutation.mutate()}
              disabled={storyToScriptMutation.isPending}
            >
              {storyToScriptMutation.isPending ? '提交中...' : '运行：故事转剧本'}
            </Button>
          </div>
        </form>
      </SectionCard>

      {episodeQuery.isLoading ? <LoadingState message="正在加载剧集内容..." /> : null}
      {episodeQuery.isError ? <ErrorState message="加载剧集详情失败。" /> : null}

      {submitInfo ? (
        <SectionCard className="glass-success rounded-2xl p-4 text-sm">
          已提交任务：task_id={submitInfo.task_id}
          {submitInfo.run_id ? `，run_id=${submitInfo.run_id}` : ''}
        </SectionCard>
      ) : null}

      {parsedLines.length > 0 ? (
        <SectionCard className="grid gap-3">
          <h3 className="text-base font-semibold">段落预览</h3>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {parsedLines.slice(0, 12).map((line) => (
              <article key={line.id} className="card-base rounded-xl p-3">
                <p className="text-xs text-[var(--glass-text-tertiary)]">段落 {line.order}</p>
                <p className="mt-1 text-sm text-[var(--glass-text-secondary)]">{line.text}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : (
        <EmptyState
          title="尚无剧本文本"
          description="在编辑器中输入内容并保存，即可进入分镜生成流程。"
        />
      )}

      <Link
        to={buildWorkspaceStagePath(projectId, episodeId, 'assets')}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        继续到素材
      </Link>
    </div>
  )
}
