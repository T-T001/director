import type { LucideIcon } from 'lucide-react'
import { BookOpenText, Clapperboard, Film, Mic, ScrollText, SquareKanban, Users } from 'lucide-react'

import type { WorkspaceStage } from '../../../app/router/routes'

export type CanvasNodeId = 'source' | WorkspaceStage

export type CanvasNodeDef = {
  id: CanvasNodeId
  label: string
  description: string
  icon: LucideIcon
  stage?: WorkspaceStage
  defaultPosition: { x: number; y: number }
}

export const canvasNodeDefs: CanvasNodeDef[] = [
  {
    id: 'source',
    label: '智能分析 · 原文',
    description: '本集小说原文与项目级拆集入口',
    icon: BookOpenText,
    defaultPosition: { x: 0, y: 60 },
  },
  {
    id: 'script',
    label: '剧本',
    description: '原文拆解为剧本片段',
    icon: ScrollText,
    stage: 'script',
    defaultPosition: { x: 330, y: 0 },
  },
  {
    id: 'assets',
    label: '素材',
    description: '角色、场景与道具资产',
    icon: Users,
    stage: 'assets',
    defaultPosition: { x: 660, y: 120 },
  },
  {
    id: 'storyboard',
    label: '分镜',
    description: '剧本片段转镜头面板',
    icon: SquareKanban,
    stage: 'storyboard',
    defaultPosition: { x: 990, y: 20 },
  },
  {
    id: 'prompts',
    label: '提示词',
    description: '逐镜头审校图像/视频提示词',
    icon: Clapperboard,
    stage: 'prompts',
    defaultPosition: { x: 1320, y: 140 },
  },
  {
    id: 'voice',
    label: '配音',
    description: '台词音色绑定与整集配音',
    icon: Mic,
    stage: 'voice',
    defaultPosition: { x: 1650, y: 30 },
  },
  {
    id: 'video',
    label: '视频',
    description: '分镜视频化与成片输出',
    icon: Film,
    stage: 'video',
    defaultPosition: { x: 1980, y: 110 },
  },
]

export const canvasEdgeDefs: Array<{ source: CanvasNodeId; target: CanvasNodeId }> = [
  { source: 'source', target: 'script' },
  { source: 'script', target: 'assets' },
  { source: 'assets', target: 'storyboard' },
  { source: 'storyboard', target: 'prompts' },
  { source: 'prompts', target: 'voice' },
  { source: 'voice', target: 'video' },
]

export const pipelineNodeOrder: CanvasNodeId[] = ['script', 'assets', 'storyboard', 'prompts', 'voice', 'video']
