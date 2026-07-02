import { useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import { AlignHorizontalDistributeCenter, RotateCcw } from 'lucide-react'

import { canvasEdgeDefs, canvasNodeDefs, type CanvasNodeId } from './canvas-graph'
import { ChildCardNode } from './nodes/ChildCardNode'
import { ImageNode } from './nodes/ImageNode'
import { NoteNode } from './nodes/NoteNode'
import { StageNode, type StageNodeData } from './nodes/StageNode'

const nodeTypes = { stageNode: StageNode, childCard: ChildCardNode, noteNode: NoteNode, imageNode: ImageNode }

function nodeStatusColor(data: StageNodeData) {
  if (data.pipelineError) return 'rgba(255, 107, 95, 0.85)'
  if (data.signal.status === 'processing' || data.actionBusy || data.isPipelineCurrent) return 'rgba(255, 179, 71, 0.9)'
  if (data.signal.status === 'ready') return 'rgba(79, 209, 143, 0.85)'
  if (data.signal.status === 'active') return 'rgba(255, 211, 102, 0.55)'
  return 'rgba(255, 255, 255, 0.18)'
}

export function ProductionCanvas({
  nodeData,
  positions,
  extraNodes = [],
  extraEdges = [],
  onMoveNode,
  onNodeClick,
  onResetLayout,
  onArrangeLayout,
}: {
  nodeData: Record<CanvasNodeId, StageNodeData>
  positions: Record<CanvasNodeId, { x: number; y: number }>
  /** 子节点 / 便签 / 参考图等附加节点 */
  extraNodes?: Node[]
  extraEdges?: Edge[]
  onMoveNode: (nodeId: string, position: { x: number; y: number }) => void
  onNodeClick?: (nodeId: string) => void
  onResetLayout: () => void
  onArrangeLayout: () => void
}) {
  const { fitView } = useReactFlow()

  const refitSoon = () => {
    window.setTimeout(() => {
      void fitView({ padding: 0.18, duration: 420, maxZoom: 1 })
    }, 50)
  }

  const nodes = useMemo<Node[]>(
    () => [
      ...canvasNodeDefs.map((def) => ({
        id: def.id,
        type: 'stageNode',
        position: positions[def.id] ?? def.defaultPosition,
        data: nodeData[def.id],
        draggable: true,
      })),
      ...extraNodes,
    ],
    [extraNodes, nodeData, positions],
  )

  const edges = useMemo<Edge[]>(
    () => [
      ...canvasEdgeDefs.map(({ source, target }) => {
        const targetData = nodeData[target]
        const flowing = targetData.signal.status === 'processing' || targetData.actionBusy || targetData.isPipelineCurrent
        return {
          id: `${source}->${target}`,
          source,
          target,
          type: 'smoothstep',
          animated: Boolean(flowing),
          style: flowing ? { strokeWidth: 2.2 } : undefined,
        }
      }),
      ...extraEdges,
    ],
    [extraEdges, nodeData],
  )

  return (
    <div className="director-canvas relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
        minZoom={0.35}
        maxZoom={1.5}
        nodesConnectable={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
        onNodesChange={(changes) => {
          // 节点数据由上层派生（受控模式），这里只回放拖拽位置变化
          for (const change of changes) {
            if (change.type === 'position' && change.position) {
              onMoveNode(change.id, change.position)
            }
          }
        }}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        onNodeDoubleClick={(_, node) => {
          const data = nodeData[node.id as CanvasNodeId]
          if (data) data.onOpenStage()
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1.4} color="rgba(255, 229, 180, 0.12)" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeColor={(node) => (node.type === 'stageNode' ? nodeStatusColor(node.data as StageNodeData) : 'rgba(255,255,255,0.22)')}
          nodeStrokeColor="rgba(0,0,0,0.4)"
        />
      </ReactFlow>

      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => {
            onArrangeLayout()
            refitSoon()
          }}
          className="glass-btn-base glass-btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          <AlignHorizontalDistributeCenter className="h-3.5 w-3.5" />
          自动排列
        </button>
        <button
          type="button"
          onClick={() => {
            onResetLayout()
            refitSoon()
          }}
          className="glass-btn-base glass-btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          重置布局
        </button>
      </div>
    </div>
  )
}
