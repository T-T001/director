export const workspaceStages = ['script', 'assets', 'storyboard', 'prompts', 'voice', 'video'] as const

export type WorkspaceStage = (typeof workspaceStages)[number]

export const workspaceStageItems: Array<{ stage: WorkspaceStage; label: string; description: string }> = [
  { stage: 'script', label: '剧本', description: '撰写与拆分剧本' },
  { stage: 'assets', label: '素材', description: '角色与场景素材' },
  { stage: 'storyboard', label: '分镜', description: '镜头分镜规划' },
  { stage: 'prompts', label: '提示词', description: '生成提示词管理' },
  { stage: 'voice', label: '配音', description: '语音合成与对齐' },
  { stage: 'video', label: '视频', description: '渲染与导出' },
]

export function isWorkspaceStage(value: string | undefined | null): value is WorkspaceStage {
  if (!value) return false
  return workspaceStages.includes(value as WorkspaceStage)
}

export function buildWorkspaceStagePath(projectId: string, episodeId: string, stage: WorkspaceStage) {
  return `/workspace/${projectId}/${episodeId}/${stage}`
}

export function resolveWorkspaceStageFromPathname(pathname: string): WorkspaceStage | null {
  const parts = pathname.split('/').filter(Boolean)
  const segment = parts[parts.length - 1]
  if (!segment || !isWorkspaceStage(segment)) return null
  return segment
}
