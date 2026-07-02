import type { WorkspaceStage } from '../../app/router/routes'
import type { WorkspaceStageSignal } from '../../components/layout/WorkspaceStageNav'
import type { WorkspaceTask } from '../../types/project'

export type { WorkspaceStageSignal, WorkspaceStageStatus } from '../../components/layout/WorkspaceStageNav'

export function isRunningTask(status: string) {
  return ['queued', 'processing', 'running'].includes(status)
}

const stageTaskMatchers: Record<WorkspaceStage, RegExp> = {
  script: /(script|analy|novel)/i,
  assets: /(asset|character|location|prop)/i,
  storyboard: /(storyboard)/i,
  prompts: /(prompt|image)/i,
  voice: /(voice|audio|srt|tts)/i,
  video: /(video|lipsync|render)/i,
}

export function findRunningStageTasks(tasks: WorkspaceTask[], stage: WorkspaceStage) {
  return tasks.filter((task) => isRunningTask(task.status) && stageTaskMatchers[stage].test(task.task_type))
}

export function buildStageSignals({
  hasNovelText,
  hasSrt,
  hasAudio,
  tasks,
}: {
  hasNovelText: boolean
  hasSrt: boolean
  hasAudio: boolean
  tasks: WorkspaceTask[]
}): Record<WorkspaceStage, WorkspaceStageSignal> {
  const processing = (stage: WorkspaceStage) => findRunningStageTasks(tasks, stage).length > 0
  return {
    script: {
      status: processing('script') ? 'processing' : hasNovelText ? 'ready' : 'active',
      detail: hasNovelText ? '原文已进入剧本拆解' : '先导入本集原文或剧本文本',
    },
    assets: {
      status: processing('assets') ? 'processing' : hasNovelText ? 'active' : 'empty',
      detail: hasNovelText ? '补齐角色、场景、道具资产' : '等待剧本识别角色与场景',
    },
    storyboard: {
      status: processing('storyboard') ? 'processing' : hasNovelText ? 'active' : 'empty',
      detail: hasNovelText ? '把剧本片段转成镜头面板' : '需要先准备剧本片段',
    },
    prompts: {
      status: processing('prompts') ? 'processing' : hasNovelText ? 'active' : 'empty',
      detail: '审校每个镜头的图像/视频提示词',
    },
    voice: {
      status: processing('voice') ? 'processing' : hasAudio ? 'ready' : hasSrt || hasNovelText ? 'active' : 'empty',
      detail: hasAudio ? '本集已有音频资产' : '绑定说话人音色并生成台词音频',
    },
    video: {
      status: processing('video') ? 'processing' : hasAudio ? 'active' : 'empty',
      detail: hasAudio ? '组合分镜、配音与口型同步' : '等待分镜画面和配音资产',
    },
  }
}
