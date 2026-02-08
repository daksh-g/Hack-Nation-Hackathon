import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GraphNode } from '../types/graph'

interface NodeDetailPanelProps {
  node: GraphNode | null
  onClose: () => void
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-[400px] bg-panels border-l border-white/10 z-50 overflow-y-auto"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">{node.label}</h2>
              <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-text-tertiary">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-text-tertiary">Node type: {node.type}</p>
            <p className="text-sm text-text-tertiary">ID: {node.id}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
