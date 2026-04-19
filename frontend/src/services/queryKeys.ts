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
  novelPromotion: {
    project: (projectId: string) => ['np', 'project', projectId] as const,
    episodes: (projectId: string) => ['np', 'episodes', projectId] as const,
    episode: (projectId: string, episodeId: string) =>
      ['np', 'episode', projectId, episodeId] as const,
    clips: (projectId: string, episodeId: string) =>
      ['np', 'clips', projectId, episodeId] as const,
    clip: (projectId: string, clipId: string) => ['np', 'clip', projectId, clipId] as const,
    characters: (projectId: string) => ['np', 'characters', projectId] as const,
    character: (projectId: string, characterId: string) =>
      ['np', 'character', projectId, characterId] as const,
    appearances: (projectId: string, characterId: string) =>
      ['np', 'appearances', projectId, characterId] as const,
    locations: (projectId: string) => ['np', 'locations', projectId] as const,
    shots: (projectId: string, episodeId: string) =>
      ['np', 'shots', projectId, episodeId] as const,
    storyboardForClip: (projectId: string, clipId: string) =>
      ['np', 'storyboard', projectId, 'clip', clipId] as const,
    storyboard: (projectId: string, storyboardId: string) =>
      ['np', 'storyboard', projectId, storyboardId] as const,
    panels: (projectId: string, storyboardId: string) =>
      ['np', 'panels', projectId, storyboardId] as const,
    panel: (projectId: string, panelId: string) => ['np', 'panel', projectId, panelId] as const,
    voiceLines: (projectId: string, episodeId: string) =>
      ['np', 'voice-lines', projectId, episodeId] as const,
  },
}
