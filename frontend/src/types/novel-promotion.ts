export type NPProject = {
  id: string
  project_id: string
  analysis_model: string | null
  image_model: string | null
  video_model: string | null
  audio_model: string | null
  character_model: string | null
  location_model: string | null
  storyboard_model: string | null
  edit_model: string | null
  video_ratio: string
  tts_rate: string
  art_style: string
  art_style_prompt: string | null
  video_resolution: string
  image_resolution: string
  workflow_mode: string
  global_asset_text: string | null
  capability_overrides: string | null
  last_episode_id: string | null
  import_status: string | null
  created_at: string
  updated_at: string
}

export type NPProjectUpdate = Partial<{
  analysis_model: string | null
  image_model: string | null
  video_model: string | null
  audio_model: string | null
  character_model: string | null
  location_model: string | null
  storyboard_model: string | null
  edit_model: string | null
  video_ratio: string
  tts_rate: string
  art_style: string
  art_style_prompt: string | null
  video_resolution: string
  image_resolution: string
  workflow_mode: string
  global_asset_text: string | null
  capability_overrides: string | null
  last_episode_id: string | null
  import_status: string | null
}>

export type NPEpisode = {
  id: string
  np_project_id: string
  episode_number: number
  name: string
  description: string | null
  novel_text: string | null
  audio_url: string | null
  audio_media_id: string | null
  srt_content: string | null
  speaker_voices: string | null
  created_at: string
  updated_at: string
}

export type NPEpisodeCreate = {
  episode_number: number
  name: string
  description?: string | null
  novel_text?: string | null
}

export type NPEpisodeUpdate = Partial<{
  name: string
  description: string | null
  novel_text: string | null
  audio_url: string | null
  audio_media_id: string | null
  srt_content: string | null
  speaker_voices: string | null
}>

export type NPEpisodeBatchCreate = {
  episodes: NPEpisodeCreate[]
}

export type NPClip = {
  id: string
  episode_id: string
  start: number | null
  end: number | null
  duration: number | null
  summary: string
  location: string | null
  content: string
  characters: string | null
  props: string | null
  start_text: string | null
  end_text: string | null
  shot_count: number | null
  screenplay: string | null
  created_at: string
  updated_at: string
}

export type NPClipCreate = Partial<{
  start: number | null
  end: number | null
  duration: number | null
  summary: string
  content: string
  location: string | null
  characters: string | null
  props: string | null
  shot_count: number | null
}>

export type NPClipUpdate = Partial<{
  start: number | null
  end: number | null
  duration: number | null
  summary: string
  content: string
  location: string | null
  characters: string | null
  props: string | null
  start_text: string | null
  end_text: string | null
  shot_count: number | null
  screenplay: string | null
}>

export type NPCharacter = {
  id: string
  np_project_id: string
  name: string
  aliases: string | null
  custom_voice_url: string | null
  custom_voice_media_id: string | null
  voice_id: string | null
  voice_type: string | null
  profile_data: string | null
  profile_confirmed: boolean
  introduction: string | null
  source_global_character_id: string | null
  created_at: string
  updated_at: string
}

export type NPCharacterCreate = {
  name: string
  aliases?: string | null
  introduction?: string | null
}

export type NPCharacterUpdate = Partial<{
  name: string
  aliases: string | null
  introduction: string | null
  voice_id: string | null
  voice_type: string | null
  custom_voice_url: string | null
  custom_voice_media_id: string | null
  profile_data: string | null
  profile_confirmed: boolean
}>

export type NPAppearance = {
  id: string
  character_id: string
  appearance_index: number
  description: string | null
  image_prompt: string | null
  image_url: string | null
  image_media_id: string | null
  candidate_images: string | null
  selected: boolean
  created_at: string
  updated_at: string
}

export type NPAppearanceCreate = Partial<{
  description: string | null
  image_prompt: string | null
  image_url: string | null
}>

export type NPAppearanceUpdate = Partial<{
  description: string | null
  image_prompt: string | null
  image_url: string | null
  image_media_id: string | null
  candidate_images: string | null
  selected: boolean
}>

export type NPSelectCharacterImagePayload = {
  appearance_id: string
  image_url?: string | null
  image_media_id?: string | null
}

export type NPAICreateCharacterPayload = {
  name: string
  hints?: string | null
}

export type NPAIModifyAppearancePayload = {
  appearance_id: string
  prompt?: string | null
}

export type NPReferenceToCharacterPayload = {
  reference_image_url: string
  name?: string | null
}

export type NPGenerateCharacterImagePayload = Partial<{
  appearance_id: string | null
  prompt: string | null
}>

export type NPLocation = {
  id: string
  np_project_id: string
  name: string
  summary: string | null
  asset_kind: string
  source_global_location_id: string | null
  selected_image_id: string | null
  created_at: string
  updated_at: string
}

export type NPLocationCreate = {
  name: string
  summary?: string | null
}

export type NPLocationUpdate = Partial<{
  name: string
  summary: string | null
  selected_image_id: string | null
}>

export type NPLocationImage = {
  id: string
  location_id: string
  image_prompt: string | null
  image_url: string | null
  image_media_id: string | null
  created_at: string
  updated_at: string
}

export type NPAICreateLocationPayload = {
  name: string
  hints?: string | null
}

export type NPAIModifyLocationPayload = {
  prompt: string
}

export type NPSelectLocationImagePayload = {
  image_id: string
}

export type NPShot = {
  id: string
  episode_id: string
  clip_id: string | null
  shot_id: string
  srt_start: number
  srt_end: number
  srt_duration: number
  sequence: string | null
  locations: string | null
  characters: string | null
  plot: string | null
  image_prompt: string | null
  scale: string | null
  module: string | null
  focus: string | null
  zh_summarize: string | null
  pov: string | null
  image_url: string | null
  image_media_id: string | null
  created_at: string
  updated_at: string
}

export type NPShotUpdate = Partial<{
  sequence: string | null
  locations: string | null
  characters: string | null
  plot: string | null
  image_prompt: string | null
  scale: string | null
  module: string | null
  focus: string | null
  zh_summarize: string | null
  pov: string | null
  image_url: string | null
  image_media_id: string | null
}>

export type NPStoryboard = {
  id: string
  episode_id: string
  clip_id: string
  storyboard_image_url: string | null
  panel_count: number
  storyboard_text_json: string | null
  image_history: string | null
  candidate_images: string | null
  last_error: string | null
  photography_plan: string | null
  created_at: string
  updated_at: string
}

export type NPStoryboardCreate = {
  panel_count?: number
}

export type NPStoryboardUpdate = Partial<{
  storyboard_image_url: string | null
  panel_count: number
  storyboard_text_json: string | null
  photography_plan: string | null
}>

export type NPPanel = {
  id: string
  storyboard_id: string
  panel_index: number
  panel_number: number | null
  shot_type: string | null
  camera_move: string | null
  description: string | null
  location: string | null
  characters: string | null
  props: string | null
  srt_segment: string | null
  srt_start: number | null
  srt_end: number | null
  duration: number | null
  image_prompt: string | null
  image_url: string | null
  image_media_id: string | null
  image_history: string | null
  video_prompt: string | null
  first_last_frame_prompt: string | null
  video_url: string | null
  video_generation_mode: string | null
  video_media_id: string | null
  scene_type: string | null
  candidate_images: string | null
  linked_to_next_panel: boolean
  lip_sync_task_id: string | null
  lip_sync_video_url: string | null
  lip_sync_video_media_id: string | null
  sketch_image_url: string | null
  sketch_image_media_id: string | null
  previous_image_url: string | null
  previous_image_media_id: string | null
  photography_rules: string | null
  acting_notes: string | null
  created_at: string
  updated_at: string
}

export type NPPanelCreate = {
  panel_index: number
  description?: string | null
  image_prompt?: string | null
}

export type NPPanelUpdate = Partial<{
  panel_index: number
  panel_number: number | null
  shot_type: string | null
  camera_move: string | null
  description: string | null
  location: string | null
  characters: string | null
  props: string | null
  srt_segment: string | null
  srt_start: number | null
  srt_end: number | null
  duration: number | null
  image_prompt: string | null
  image_url: string | null
  image_media_id: string | null
  video_prompt: string | null
  first_last_frame_prompt: string | null
  video_url: string | null
  video_generation_mode: string | null
  video_media_id: string | null
  scene_type: string | null
  linked_to_next_panel: boolean
  sketch_image_url: string | null
  photography_rules: string | null
  acting_notes: string | null
}>

export type NPPanelLinkPayload = {
  linked_to_next_panel: boolean
}

export type NPPanelVariantPayload = {
  variant_type?: string
  prompt?: string | null
}

export type NPPanelSelectCandidatePayload = Partial<{
  image_url: string | null
  image_media_id: string | null
}>

export type NPPanelPromptUpdatePayload = Partial<{
  image_prompt: string | null
  video_prompt: string | null
}>

export type NPPanelAIModifyPromptPayload = {
  directive: string
}

export type NPSupplementaryPanel = {
  id: string
  storyboard_id: string
  source_type: string
  source_panel_id: string | null
  description: string | null
  image_prompt: string | null
  image_url: string | null
  image_media_id: string | null
  characters: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export type NPSupplementaryPanelCreate = {
  source_type: string
  source_panel_id?: string | null
  description?: string | null
  image_prompt?: string | null
}

export type NPVoiceLine = {
  id: string
  episode_id: string
  line_index: number
  speaker: string
  content: string
  voice_preset_id: string | null
  audio_url: string | null
  audio_media_id: string | null
  matched_panel_id: string | null
  srt_start: number | null
  srt_end: number | null
  created_at: string
  updated_at: string
}

export type NPVoiceLineCreate = {
  line_index: number
  speaker?: string
  content: string
  voice_preset_id?: string | null
  matched_panel_id?: string | null
  srt_start?: number | null
  srt_end?: number | null
}

export type NPVoiceLineUpdate = Partial<{
  line_index: number
  speaker: string
  content: string
  voice_preset_id: string | null
  matched_panel_id: string | null
  audio_url: string | null
  audio_media_id: string | null
  srt_start: number | null
  srt_end: number | null
}>

export type NPSpeakerVoicePayload = {
  speaker: string
  voice_preset_id: string
}

export type NPEpisodeSplitPayload = {
  split_points: number[]
}

export type NPEpisodeSplitByMarkersPayload = {
  markers: string[]
}

export type NPProfileConfirmPayload = {
  profile_data?: string | null
}

export type NPBatchProfileConfirmPayload = {
  character_ids: string[]
}

export type NPTaskQueued = {
  task_id: string
  status?: string
  run_id?: string
  deduped?: boolean
}
