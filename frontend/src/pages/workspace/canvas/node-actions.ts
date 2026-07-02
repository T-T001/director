import { generateAsset } from '../../../services/api/assets'
import { appendPromptSource, voiceGenerate } from '../../../services/api/episodes'
import { generatePanelVideo, scriptToStoryboard, storyToScript } from '../../../services/api/storyboards'
import type { AssetItem, Episode, StoryboardPanel } from '../../../types/project'
import type { CanvasNodeId } from './canvas-graph'

export type NodeActionContext = {
  episode: Episode
  assets: AssetItem[]
  panels: StoryboardPanel[]
}

export type NodeActionDef = {
  label: string
  /** 返回 null 表示前置条件满足；否则返回不可执行原因 */
  blockedReason: (context: NodeActionContext) => string | null
  /** 满足前置但无事可做（用于自动流水线跳过），如素材已全部出图 */
  skipReason?: (context: NodeActionContext) => string | null
  /** 自动流水线中前置不满足时跳过而不是中断（如剧本拆解未产生资产时跳过素材生图） */
  optionalInPipeline?: boolean
  run: (context: NodeActionContext) => Promise<string[]>
}

/** 限制并发的批量执行，避免一次性把所有生成任务压给模型网关 */
const BATCH_CONCURRENCY = 3

async function runBatch<T>(items: T[], runner: (item: T) => Promise<{ task_id: string }>) {
  const taskIds: string[] = []
  for (let index = 0; index < items.length; index += BATCH_CONCURRENCY) {
    const chunk = items.slice(index, index + BATCH_CONCURRENCY)
    const results = await Promise.all(chunk.map((item) => runner(item)))
    taskIds.push(...results.map((result) => result.task_id))
  }
  return taskIds
}

export const nodeActions: Partial<Record<CanvasNodeId, NodeActionDef>> = {
  script: {
    label: '拆解剧本',
    blockedReason: ({ episode }) => (episode.novel_text?.trim() ? null : '需要先导入本集原文'),
    run: async ({ episode }) => {
      const result = await storyToScript(episode.id)
      return [result.task_id]
    },
  },
  assets: {
    label: '生成缺图资产',
    blockedReason: ({ assets }) => (assets.length > 0 ? null : '尚无资产，先拆解剧本识别角色与场景'),
    skipReason: ({ assets }) => (assets.some((asset) => !asset.image_url) ? null : '资产立绘已齐全'),
    optionalInPipeline: true,
    run: async ({ assets }) => {
      const pending = assets.filter((asset) => !asset.image_url)
      return runBatch(pending, (asset) => generateAsset(asset.id))
    },
  },
  storyboard: {
    label: '生成分镜',
    blockedReason: ({ episode }) => (episode.novel_text?.trim() ? null : '需要先准备剧本文本'),
    run: async ({ episode }) => {
      const result = await scriptToStoryboard(episode.id)
      return [result.task_id]
    },
  },
  prompts: {
    label: '补全提示词',
    blockedReason: ({ panels }) => (panels.length > 0 ? null : '需要先生成分镜面板'),
    skipReason: ({ panels }) =>
      panels.some((panel) => !panel.image_prompt?.trim() && !panel.video_prompt?.trim()) ? null : '镜头提示词已齐全',
    optionalInPipeline: true,
    run: async ({ episode }) => {
      const result = await appendPromptSource(episode.id, {})
      return [result.task_id]
    },
  },
  voice: {
    label: '生成整集配音',
    blockedReason: ({ episode }) => (episode.novel_text?.trim() || episode.srt_content?.trim() ? null : '需要剧本或字幕文本'),
    skipReason: ({ episode }) => (episode.audio_media_id ? '整集音频已存在' : null),
    run: async ({ episode }) => {
      const result = await voiceGenerate(episode.id)
      return [result.task_id]
    },
  },
  video: {
    label: '批量生成镜头视频',
    blockedReason: ({ panels }) => (panels.length > 0 ? null : '需要先生成分镜面板'),
    skipReason: ({ panels }) => (panels.some((panel) => !panel.video_media_id) ? null : '全部镜头已有视频'),
    run: async ({ panels }) => {
      const pending = panels.filter((panel) => !panel.video_media_id)
      return runBatch(pending, (panel) => generatePanelVideo(panel.id))
    },
  },
}
