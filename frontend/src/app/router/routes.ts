export const workspaceStages = ['config', 'script', 'assets', 'storyboard', 'voice', 'video'] as const

export type WorkspaceStage = (typeof workspaceStages)[number]

export const workspaceStageItems: Array<{ stage: WorkspaceStage; label: string }> = [
  { stage: 'config', label: '配置' },
  { stage: 'script', label: '剧本' },
  { stage: 'assets', label: '资产' },
  { stage: 'storyboard', label: '分镜' },
  { stage: 'voice', label: '配音' },
  { stage: 'video', label: '视频' },
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
