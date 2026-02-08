import { useEffect, useState } from 'react'
import type { GraphData, GraphNode } from '../../types/graph'
import { getGraph } from '../../lib/api'
import { NodeDetailPanel } from '../../components/NodeDetailPanel'

export function PulseView() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  useEffect(() => {
    getGraph().then(setGraphData).catch(console.error)
  }, [])

  return (
    <div className="relative w-full h-full bg-canvas">
      {!graphData ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-text-tertiary animate-pulse">Loading Pulse View...</div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-text-tertiary">
          Graph: {graphData.nodes.length} nodes, {graphData.edges.length} edges
        </div>
      )}
      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  )
}
