import type { Episode, Workspace } from '../../../types/project'

export type WorkspaceStagePageProps = {
  projectId: string
  episodeId: string
  workspace: Workspace
  episode: Episode
}
