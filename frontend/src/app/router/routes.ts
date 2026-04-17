export const workspaceStages = ['config', 'script', 'assets', 'storyboard', 'prompts', 'voice', 'video'] as const

export type WorkspaceStage = (typeof workspaceStages)[number]

export const workspaceStageItems: Array<{ stage: WorkspaceStage; label: string }> = [
  { stage: 'config', label: 'Config' },
  { stage: 'script', label: 'Script' },
  { stage: 'assets', label: 'Assets' },
  { stage: 'storyboard', label: 'Storyboard' },
  { stage: 'prompts', label: 'Prompts' },
  { stage: 'voice', label: 'Voice' },
  { stage: 'video', label: 'Video' },
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
