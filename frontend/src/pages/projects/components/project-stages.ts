import { Sparkles, FileText, Users, Film, Mic, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ProjectStage = 'intake' | 'script' | 'assets' | 'storyboard' | 'voice' | 'video'

export const projectStages: Array<{ id: ProjectStage; label: string; icon: LucideIcon; tip: string }> = [
  { id: 'intake', label: '智能分析', icon: Sparkles, tip: '粘贴原文自动拆集、生成剧集骨架' },
  { id: 'script', label: '剧本', icon: FileText, tip: '撰写与修订每一集的剧本内容' },
  { id: 'assets', label: '素材', icon: Users, tip: '管理角色、场景与道具素材' },
  { id: 'storyboard', label: '分镜', icon: Film, tip: '生成分镜与面板提示词' },
  { id: 'voice', label: '配音', icon: Mic, tip: '台词与音色生成' },
  { id: 'video', label: '视频', icon: Video, tip: '渲染与成片导出' },
]
