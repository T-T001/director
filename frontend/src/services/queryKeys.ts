export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  projects: {
    all: () => ['projects'] as const,
    detail: (projectId: string) => ['projects', projectId] as const,
    workspace: (projectId: string) => ['workspace', projectId] as const,
  },
  episodes: {
    byProject: (projectId: string) => ['episodes', 'project', projectId] as const,
    detail: (episodeId: string) => ['episodes', episodeId] as const,
  },
  assets: {
    byProject: (projectId: string) => ['assets', 'project', projectId] as const,
    global: () => ['assets', 'global'] as const,
  },
  storyboards: {
    byEpisode: (episodeId: string) => ['storyboards', 'episode', episodeId] as const,
    detail: (storyboardId: string) => ['storyboards', storyboardId] as const,
  },
  tasks: {
    byProject: (projectId: string) => ['tasks', 'project', projectId] as const,
    detail: (taskId: string) => ['tasks', taskId] as const,
  },
  runs: {
    events: (runId: string) => ['runs', runId, 'events'] as const,
  },
  settings: {
    current: () => ['settings'] as const,
  },
}
