import { useQuery } from '@tanstack/react-query'

import { listProjectAssets } from '../../../services/api/assets'
import { buildMediaUrl } from '../../../services/api/client'
import { listStoryboards } from '../../../services/api/storyboards'
import { queryKeys } from '../../../services/queryKeys'
import type { Episode, Workspace } from '../../../types/project'
import type { CanvasNodeId } from './canvas-graph'

export type StageSummaryRow = { label: string; value: string }

const THUMBNAIL_LIMIT = 4

export function useStageSummaries({
  projectId,
  episode,
  workspace,
}: {
  projectId: string
  episode: Episode
  workspace: Workspace
}) {
  const assetsQuery = useQuery({
    queryKey: queryKeys.assets.byProject(projectId),
    queryFn: () => listProjectAssets(projectId),
    enabled: Boolean(projectId),
  })

  const storyboardsQuery = useQuery({
    queryKey: queryKeys.storyboards.byEpisode(episode.id),
    queryFn: () => listStoryboards(episode.id),
    enabled: Boolean(episode.id),
  })

  const assets = assetsQuery.data ?? []
  const characterCount = assets.filter((asset) => asset.kind === 'character').length
  const locationCount = assets.filter((asset) => asset.kind === 'location').length
  const propCount = assets.filter((asset) => asset.kind === 'prop').length
  const assetsMissingImage = assets.filter((asset) => !asset.image_url).length

  const storyboards = storyboardsQuery.data ?? []
  const panels = storyboards.flatMap((storyboard) => storyboard.panels)
  const panelCount = panels.length
  const panelWithImage = panels.filter((panel) => Boolean(panel.image_media_id)).length
  const panelWithVideo = panels.filter((panel) => Boolean(panel.video_media_id)).length
  const panelWithPrompt = panels.filter((panel) => Boolean(panel.image_prompt?.trim() || panel.video_prompt?.trim())).length

  const novelLength = episode.novel_text?.trim().length ?? 0
  const intakeLength = workspace.project.intake_novel_text?.trim().length ?? 0

  const assetThumbnails = assets
    .filter((asset) => Boolean(asset.image_url))
    .slice(0, THUMBNAIL_LIMIT)
    .map((asset) => asset.image_url as string)
  const panelImageThumbnails = panels
    .filter((panel) => Boolean(panel.image_media_id))
    .slice(0, THUMBNAIL_LIMIT)
    .map((panel) => buildMediaUrl(panel.image_media_id as string))
  // 视频节点用已出视频镜头的首帧图当封面
  const videoCoverThumbnails = panels
    .filter((panel) => Boolean(panel.video_media_id && panel.image_media_id))
    .slice(0, THUMBNAIL_LIMIT)
    .map((panel) => buildMediaUrl(panel.image_media_id as string))

  const thumbnails: Partial<Record<CanvasNodeId, string[]>> = {
    assets: assetThumbnails,
    storyboard: panelImageThumbnails,
    prompts: panelImageThumbnails,
    video: videoCoverThumbnails,
  }

  const summaries: Record<CanvasNodeId, StageSummaryRow[]> = {
    source: [
      { label: '本集原文', value: novelLength > 0 ? `${novelLength} 字` : '未导入' },
      { label: '项目原文', value: intakeLength > 0 ? `${intakeLength} 字` : '未填写' },
      { label: '项目剧集', value: `${workspace.episodes.length} 集` },
    ],
    script: [
      { label: '剧本文本', value: novelLength > 0 ? `${novelLength} 字` : '待导入' },
      { label: '字幕 SRT', value: episode.srt_content?.trim() ? '已有' : '暂无' },
    ],
    assets: [
      { label: '角色 / 场景 / 道具', value: `${characterCount} / ${locationCount} / ${propCount}` },
      { label: '缺立绘资产', value: assetsMissingImage > 0 ? `${assetsMissingImage} 个` : '已齐' },
    ],
    storyboard: [
      { label: '镜头面板', value: panelCount > 0 ? `${panelCount} 镜` : '未生成' },
      { label: '已出图', value: panelCount > 0 ? `${panelWithImage} / ${panelCount}` : '-' },
    ],
    prompts: [
      { label: '含提示词镜头', value: panelCount > 0 ? `${panelWithPrompt} / ${panelCount}` : '-' },
    ],
    voice: [
      { label: '整集音频', value: episode.audio_media_id ? '已生成' : '未生成' },
      { label: '字幕时间轴', value: episode.srt_content?.trim() ? '已有' : '暂无' },
    ],
    video: [
      { label: '已出视频镜头', value: panelCount > 0 ? `${panelWithVideo} / ${panelCount}` : '-' },
    ],
  }

  return {
    summaries,
    thumbnails,
    assets,
    panels,
    isLoading: assetsQuery.isLoading || storyboardsQuery.isLoading,
  }
}
