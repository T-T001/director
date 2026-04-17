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
      setFeedback('Script text saved.')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to save script text.'
      setFeedback(message)
    },
  })

  const storyToScriptMutation = useMutation({
    mutationFn: () => storyToScript(episodeId, {}),
    onSuccess: (result) => {
      setSubmitInfo({ task_id: result.task_id, run_id: result.run_id })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.workspace(projectId) })
      setFeedback('Story-to-script task submitted.')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to submit task.'
      setFeedback(message)
    },
  })

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    await saveMutation.mutateAsync()
  }

  const injectSample = () => {
    const sample = [
      'Hero: The city lights are too quiet tonight.',
      'Narrator: A sudden storm rolls in from the harbor.',
      'Companion: We should move before the signal disappears.',
    ].join('\n')
    setNovelText((previous) => (previous.trim() ? previous : sample))
  }

  return (
    <div className="space-y-6 pb-20 animate-page-enter">
      <SectionCard className="glass-surface-elevated grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Script Stage</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">
              Write and save source text, then trigger story-to-script task for downstream stages.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'config')}>
              <Button variant="secondary">Back Config</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'assets')}>
              <Button variant="secondary">Go Assets</Button>
            </Link>
            <Link to={buildWorkspaceStagePath(projectId, episodeId, 'storyboard')}>
              <Button variant="secondary">Go Storyboard</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Characters</p>
            <p className="mt-1 text-2xl font-semibold">{novelText.length}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Words</p>
            <p className="mt-1 text-2xl font-semibold">{wordCount(novelText)}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Segments</p>
            <p className="mt-1 text-2xl font-semibold">{parsedLines.length}</p>
          </article>
          <article className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Detected Speakers</p>
            <p className="mt-1 text-2xl font-semibold">{speakerSet.size}</p>
          </article>
        </div>
      </SectionCard>

      {feedback ? <SectionCard className="glass-success rounded-2xl p-4 text-sm">{feedback}</SectionCard> : null}

      <SectionCard className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Script Editor</h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={injectSample}>
              Insert Sample
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setNovelText(currentEpisode.novel_text ?? '')}
              disabled={!draftDirty || saveMutation.isPending}
            >
              Reset
            </Button>
          </div>
        </div>
        <form className="grid gap-3" onSubmit={handleSave}>
          <textarea
            className="glass-input min-h-64"
            value={novelText}
            onChange={(event) => setNovelText(event.target.value)}
            placeholder="Paste novel text or write script content line-by-line here..."
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!draftDirty || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Text'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => storyToScriptMutation.mutate()}
              disabled={storyToScriptMutation.isPending}
            >
              {storyToScriptMutation.isPending ? 'Submitting...' : 'Run Story To Script'}
            </Button>
          </div>
        </form>
      </SectionCard>

      {episodeQuery.isLoading ? <LoadingState message="Loading episode content..." /> : null}
      {episodeQuery.isError ? <ErrorState message="Failed to load episode details." /> : null}

      {submitInfo ? (
        <SectionCard className="glass-success rounded-2xl p-4 text-sm">
          Submitted task: task_id={submitInfo.task_id}
          {submitInfo.run_id ? `, run_id=${submitInfo.run_id}` : ''}
        </SectionCard>
      ) : null}

      {parsedLines.length > 0 ? (
        <SectionCard className="grid gap-3">
          <h3 className="text-base font-semibold">Segment Preview</h3>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {parsedLines.slice(0, 12).map((line) => (
              <article key={line.id} className="card-base rounded-xl p-3">
                <p className="text-xs text-[var(--glass-text-tertiary)]">Segment {line.order}</p>
                <p className="mt-1 text-sm text-[var(--glass-text-secondary)]">{line.text}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : (
        <EmptyState
          title="No script text yet"
          description="Add text in the editor and save to continue storyboard generation."
        />
      )}

      <Link
        to={buildWorkspaceStagePath(projectId, episodeId, 'assets')}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--glass-accent-from)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--glass-shadow-lg)] transition-colors hover:bg-[var(--glass-accent-to)]"
      >
        Continue To Assets
      </Link>
    </div>
  )
}
