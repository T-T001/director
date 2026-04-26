from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NovelIntakeCharacterInsight(BaseModel):
    name: str
    lineCount: int
    wordCount: int
    sampleQuote: str | None = None
    firstAppearanceRatio: float


class NovelIntakeSceneInsight(BaseModel):
    index: int
    location: str
    positionRatio: float
    preview: str


class NovelIntakeKeywordInsight(BaseModel):
    word: str
    frequency: int


class NovelIntakeDialogueInsight(BaseModel):
    totalLines: int
    averageLength: int
    longestLength: int
    ratioOfTotalText: float


class NovelIntakeEmotionInsight(BaseModel):
    key: str
    label: str
    count: int


class NovelIntakeAnalysis(BaseModel):
    totalChars: int
    totalWords: int
    paragraphCount: int
    sentenceCount: int
    characters: list[NovelIntakeCharacterInsight]
    scenes: list[NovelIntakeSceneInsight]
    dialogue: NovelIntakeDialogueInsight
    keywords: list[NovelIntakeKeywordInsight]
    emotions: list[NovelIntakeEmotionInsight]
    genre: str
    sentimentScore: float
    pace: str


class NovelIntakeSplitEpisode(BaseModel):
    number: int
    title: str
    summary: str
    content: str
    wordCount: int


class NovelIntakePreviewRequest(BaseModel):
    content: str = Field(min_length=80)


class NovelIntakePreviewResponse(BaseModel):
    analysis: NovelIntakeAnalysis
    split_episodes: list[NovelIntakeSplitEpisode]
    model_used: str
    request_url: str


class NovelPromotionProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    analysis_model: str | None = None
    image_model: str | None = None
    video_model: str | None = None
    audio_model: str | None = None
    character_model: str | None = None
    location_model: str | None = None
    storyboard_model: str | None = None
    edit_model: str | None = None
    video_ratio: str
    tts_rate: str
    art_style: str
    art_style_prompt: str | None = None
    video_resolution: str
    image_resolution: str
    workflow_mode: str
    global_asset_text: str | None = None
    capability_overrides: str | None = None
    last_episode_id: str | None = None
    import_status: str | None = None
    created_at: datetime
    updated_at: datetime


class NovelPromotionProjectUpdate(BaseModel):
    analysis_model: str | None = None
    image_model: str | None = None
    video_model: str | None = None
    audio_model: str | None = None
    character_model: str | None = None
    location_model: str | None = None
    storyboard_model: str | None = None
    edit_model: str | None = None
    video_ratio: str | None = None
    tts_rate: str | None = None
    art_style: str | None = Field(default=None, max_length=64)
    art_style_prompt: str | None = None
    video_resolution: str | None = None
    image_resolution: str | None = None
    workflow_mode: str | None = None
    global_asset_text: str | None = None
    capability_overrides: str | None = None
    last_episode_id: str | None = None
    import_status: str | None = None
