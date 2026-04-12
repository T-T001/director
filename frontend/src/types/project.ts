export type Project = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type ProjectSettings = {
  analysis_model: string | null
  character_model?: string | null
  location_model?: string | null
  storyboard_model?: string | null
  video_model: string | null
  audio_model: string | null
  art_style: string
  video_ratio: string
  video_resolution: string
}

export type Episode = {
  id: string
  project_id: string
  episode_number: number
  name: string
  description: string | null
  novel_text: string | null
  srt_content: string | null
  audio_media_id: string | null
  created_at: string
  updated_at: string
}

export type WorkspaceTask = {
  id: string
  task_type: string
  status: string
  progress: number
  updated_at: string
  target_type?: string | null
  target_id?: string | null
  run_id?: string | null
}

export type Workspace = {
  project: Project
  settings: ProjectSettings | null
  episodes: Episode[]
  latest_active_tasks: WorkspaceTask[]
}

export type AssetItem = {
  id: string
  name: string
  kind: 'character' | 'location' | 'prop' | string
  description?: string | null
  image_url?: string | null
  updated_at?: string
}

export type StoryboardPanel = {
  id: string
  panel_index: number
  description: string
  image_prompt?: string | null
  video_prompt?: string | null
  image_media_id?: string | null
  video_media_id?: string | null
}

export type Storyboard = {
  id: string
  episode_id: string
  panel_count: number
  panels: StoryboardPanel[]
}
