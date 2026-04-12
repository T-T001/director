import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { EmptyState, SectionCard } from '../../components/common/PageState'
import { useEditorStore } from '../../app/store/editor.store'

export function EditorPage() {
  const { episodeId = '' } = useParams()

  const playing = useEditorStore((state) => state.playing)
  const zoom = useEditorStore((state) => state.zoom)
  const setPlaying = useEditorStore((state) => state.setPlaying)
  const setZoom = useEditorStore((state) => state.setZoom)

  const timelineLabel = useMemo(() => `时间轴缩放：${zoom.toFixed(1)}x`, [zoom])

  return (
    <div className="grid gap-4">
      <SectionCard className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">编辑器</h1>
          <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">剧集 ID：{episodeId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setPlaying(!playing)}>
            {playing ? '暂停' : '播放'}
          </Button>
          <Button variant="secondary" onClick={() => setZoom(Math.max(0.5, Number((zoom - 0.1).toFixed(1))))}>
            缩小
          </Button>
          <Button variant="secondary" onClick={() => setZoom(Math.min(3, Number((zoom + 0.1).toFixed(1))))}>
            放大
          </Button>
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-sm text-[var(--glass-text-secondary)]">{timelineLabel}</p>
      </SectionCard>

      <EmptyState title="Remotion 编辑能力待接入" description="第一版先完成页面骨架与本地编辑状态管理，后续接入轨道、片段和导出任务。" />

      <Link to="/projects">
        <Button variant="secondary">返回项目</Button>
      </Link>
    </div>
  )
}
