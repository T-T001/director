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

function inferSceneHint(text: string) {
  const locationMatch = text.match(/(?:在|到|进入|来到|回到)([^，。！？,.!?]{2,18})/u)
  if (locationMatch?.[1]) return locationMatch[1].trim()
  if (/雨|街|路|巷|门|车|楼|房|医院|学校|公司|酒吧|天台/u.test(text)) return '疑似场景切换'
  return '待确认场景'
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

  const sceneHints = useMemo(() => {
    const set = new Set<string>()
    parsedLines.slice(0, 40).forEach((line) => set.add(inferSceneHint(line.text)))
    return Array.from(set).slice(0, 8)
  }, [parsedLines])

  const saveMutation = useMutation({
    mutationFn: () => updateEpisode(episodeId, { novel_text: novelText.trim() ? novelText : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.detail(episodeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      setFeedback('本集原文已保存，可继续拆解镜头与角色场景。')
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
      setFeedback('已提交「故事转剧本」任务，完成后可在资产与分镜阶段继续制作。')
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
      <SectionCard className="glass-surface-elevated grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="field-label text-[var(--glass-accent-cyan)]">Script breakdown desk</p>
            <h2 className="mt-1 text-xl font-black">本集剧本与镜头拆解</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              这里不是单纯写文本，而是把原文拆成可绑定角色、场景、分镜和配音的制作片段。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'assets')}>
              <Button variant="secondary">绑定角色场景</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'storyboard')}>
              <Button variant="secondary">进入分镜面板</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="metric-card p-4">
            <p className="field-label">原文字符</p>
            <p className="mt-2 text-2xl font-black">{novelText.length}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">估算词数</p>
            <p className="mt-2 text-2xl font-black">{wordCount(novelText)}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">可制作片段</p>
            <p className="mt-2 text-2xl font-black text-[var(--glass-accent-cyan)]">{parsedLines.length}</p>
          </article>
          <article className="metric-card p-4">
            <p className="field-label">识别说话人</p>
            <p className="mt-2 text-2xl font-black">{speakerSet.size}</p>
          </article>
        </div>
      </SectionCard>

      {feedback ? <SectionCard className="glass-success rounded-2xl p-4 text-sm">{feedback}</SectionCard> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <SectionCard className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="field-label">Source script</p>
              <h3 className="mt-1 text-base font-black">本集原文 / 剧本文本</h3>
            </div>
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
              className="glass-input min-h-[420px] leading-7"
              value={novelText}
              onChange={(event) => setNovelText(event.target.value)}
              placeholder="粘贴本集小说原文、对白脚本或已整理剧本文本。系统会基于行段生成可制作片段，用于后续角色资产、分镜和配音。"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!draftDirty || saveMutation.isPending}>
                {saveMutation.isPending ? '保存中...' : '保存本集原文'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => storyToScriptMutation.mutate()}
                disabled={storyToScriptMutation.isPending || !novelText.trim()}
              >
                {storyToScriptMutation.isPending ? '提交中...' : '生成剧本片段'}
              </Button>
            </div>
          </form>
        </SectionCard>

        <div className="grid gap-4 content-start">
          {episodeQuery.isLoading ? <LoadingState message="正在加载剧集内容..." /> : null}
          {episodeQuery.isError ? <ErrorState message="加载剧集详情失败。" /> : null}

          <SectionCard className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="field-label">Detected cast</p>
                <h3 className="mt-1 text-base font-black">角色与场景候选</h3>
              </div>
              <Link className="text-xs font-bold text-[var(--glass-accent-from)]" to={buildWorkspaceStagePath(projectId, episodeId, 'assets')}>
                去素材阶段确认
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--glass-stroke-base)] bg-white/60 p-3">
                <p className="field-label">说话人</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from(speakerSet).slice(0, 12).map((speaker) => (
                    <span key={speaker} className="stage-pill">{speaker}</span>
                  ))}
                  {speakerSet.size === 0 ? <span className="text-xs text-[var(--glass-text-tertiary)]">尚未识别对白角色</span> : null}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--glass-stroke-base)] bg-white/60 p-3">
                <p className="field-label">场景线索</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sceneHints.map((scene) => (
                    <span key={scene} className="stage-pill">{scene}</span>
                  ))}
                  {sceneHints.length === 0 ? <span className="text-xs text-[var(--glass-text-tertiary)]">等待文本输入</span> : null}
                </div>
              </div>
            </div>
          </SectionCard>

          {submitInfo ? (
            <SectionCard className="glass-success rounded-2xl p-4 text-sm">
              已提交剧本片段任务：task_id={submitInfo.task_id}
              {submitInfo.run_id ? `，run_id=${submitInfo.run_id}` : ''}
            </SectionCard>
          ) : null}

          {parsedLines.length > 0 ? (
            <SectionCard className="grid gap-3">
              <div>
                <p className="field-label">Production segments</p>
                <h3 className="mt-1 text-base font-black">可制作片段预览</h3>
              </div>
              <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">
                {parsedLines.slice(0, 18).map((line) => {
                  const speaker = inferSpeaker(line.text)
                  return (
                    <article key={line.id} className="card-base rounded-xl p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-[var(--glass-accent-from)]">片段 {String(line.order).padStart(2, '0')}</p>
                        <span className="text-[11px] text-[var(--glass-text-tertiary)]">{speaker || inferSceneHint(line.text)}</span>
                      </div>
                      <p className="mt-1 line-clamp-3 text-sm leading-6 text-[var(--glass-text-secondary)]">{line.text}</p>
                    </article>
                  )
                })}
              </div>
            </SectionCard>
          ) : (
            <EmptyState
              title="尚无剧本文本"
              description="输入或粘贴本集原文后，这里会出现可进入素材、分镜、配音的片段预览。"
            />
          )}
        </div>
      </div>

      <Link
        to={buildWorkspaceStagePath(projectId, episodeId, 'assets')}
        className="page-command fixed bottom-6 right-6 z-40 px-6 py-3 text-sm font-black text-[var(--glass-text-primary)] transition hover:border-[var(--glass-stroke-strong)] hover:bg-amber-200/10"
      >
        继续制作：角色场景资产
      </Link>
    </div>
  )
}
