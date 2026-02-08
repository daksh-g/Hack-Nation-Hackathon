import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  ChevronLeft,
  Clock,
  FileText,
  Sparkles,
  Sun,
  Users,
  Zap,
} from 'lucide-react'
import type { GraphData, GraphNode } from '../types/graph'
import { getGraph } from '../lib/api'
import {
  CognitiveLoadBar,
  DivisionScopeBadge,
  FeedbackWidget,
  ReasoningTrace,
} from '../components/shared'
import type { ReasoningStep } from '../components/shared/ReasoningTrace'

// ── Briefing Data Types ─────────────────────────────────────────────────────

interface AttentionItem {
  type: 'critical' | 'warning' | 'info'
  text: string
  action: string
  route: string
}

interface DecisionItem {
  id: string
  title: string
  status: string
  urgency: 'high' | 'medium' | 'low'
  stakeholders: number
}

interface PersonNeedItem {
  id: string
  name: string
  reason: string
  urgency: 'high' | 'medium' | 'low'
}

interface BriefingSections {
  attention: AttentionItem[]
  changes: string[]
  decisions: DecisionItem[]
  people_needing_you: PersonNeedItem[]
  predictions: string[]
}

interface BriefingData {
  person_id: string
  person_name: string
  role: string
  generated_at?: string
  cognitive_load: number
  sections: BriefingSections
}

type BriefingMockData = Record<string, BriefingData>

// ── Reasoning Steps ─────────────────────────────────────────────────────────

const REASONING_STEPS: ReasoningStep[] = [
  { label: 'Analyzing knowledge graph (87 nodes)' },
  { label: 'Cross-referencing active alerts' },
  { label: 'Evaluating decision dependencies' },
  { label: 'Computing cognitive load factors' },
  { label: 'Generating management briefing' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

const ATTENTION_BORDER: Record<string, string> = {
  critical: 'border-l-accent-red',
  warning: 'border-l-accent-amber',
  info: 'border-l-accent-blue',
}

const URGENCY_BADGE: Record<string, string> = {
  high: 'bg-accent-red/15 text-accent-red',
  medium: 'bg-accent-amber/15 text-accent-amber',
  low: 'bg-accent-green/15 text-accent-green',
}

function buildGenericBriefing(
  person: GraphNode,
  graph: GraphData,
): BriefingData {
  // Find decisions where this person is the source
  const relatedDecisions = graph.nodes.filter(
    (n) => n.type === 'decision' && n.source_id === person.id,
  )

  // Find connected person/agent nodes via edges
  const connectedIds = new Set<string>()
  for (const edge of graph.edges) {
    if (edge.source === person.id) connectedIds.add(edge.target)
    if (edge.target === person.id) connectedIds.add(edge.source)
  }
  const connectedPeople = graph.nodes.filter(
    (n) =>
      connectedIds.has(n.id) && (n.type === 'person' || n.type === 'agent'),
  )

  return {
    person_id: person.id,
    person_name: person.label,
    role: person.role ?? 'Team Member',
    cognitive_load: person.cognitive_load ?? 40,
    sections: {
      attention:
        relatedDecisions.length > 0
          ? [
              {
                type: 'info',
                text: `You have ${relatedDecisions.length} active decision(s) in the knowledge graph.`,
                action: 'View decisions',
                route: '/decisions',
              },
            ]
          : [
              {
                type: 'info',
                text: 'No critical items requiring your attention right now.',
                action: 'View graph',
                route: '/pulse',
              },
            ],
      changes: [
        `Graph data loaded with ${graph.nodes.length} nodes and ${graph.edges.length} edges`,
        `${connectedPeople.length} connected collaborators identified`,
      ],
      decisions: relatedDecisions.map((d) => ({
        id: d.id,
        title: d.label,
        status: d.status ?? 'active',
        urgency: 'medium' as const,
        stakeholders: graph.edges.filter(
          (e) => e.source === d.id || e.target === d.id,
        ).length,
      })),
      people_needing_you: connectedPeople.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.label,
        reason: 'Connected via knowledge graph',
        urgency: 'medium' as const,
      })),
      predictions: [
        'NEXUS is monitoring for patterns across the organization.',
        'No significant risk trends detected for your scope at this time.',
      ],
    },
  }
}

// ── Section Components ──────────────────────────────────────────────────────

function AttentionSection({
  items,
  navigate,
}: {
  items: AttentionItem[]
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="bg-cards rounded-xl border border-white/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-accent-red" />
        <h3 className="text-sm font-semibold text-text-primary">
          Needs Your Attention
        </h3>
        <span className="ml-auto text-xs text-text-tertiary font-mono">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={`border-l-2 ${ATTENTION_BORDER[item.type]} pl-4 py-2 bg-white/[0.02] rounded-r-lg`}
          >
            <p className="text-sm text-text-secondary leading-relaxed mb-2">
              {item.text}
            </p>
            <button
              onClick={() => navigate(item.route)}
              className="flex items-center gap-1.5 text-xs font-medium text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              {item.action}
              <ArrowRight size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChangesSection({ changes }: { changes: string[] }) {
  return (
    <div className="bg-cards rounded-xl border border-white/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={16} className="text-accent-amber" />
        <h3 className="text-sm font-semibold text-text-primary">
          What Changed
        </h3>
      </div>
      <ul className="space-y-2">
        {changes.map((change, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="flex items-start gap-2.5 text-sm text-text-secondary leading-relaxed"
          >
            <span className="mt-2 w-1 h-1 rounded-full bg-text-tertiary flex-shrink-0" />
            {change}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function DecisionsSection({
  decisions,
  navigate,
}: {
  decisions: DecisionItem[]
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="bg-cards rounded-xl border border-white/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} className="text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">
          Open Decisions
        </h3>
        <span className="ml-auto text-xs text-text-tertiary font-mono">
          {decisions.length}
        </span>
      </div>
      <div className="space-y-2">
        {decisions.map((d) => (
          <button
            key={d.id}
            onClick={() => navigate(`/decisions?id=${d.id}`)}
            className="w-full text-left p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${URGENCY_BADGE[d.urgency]}`}
              >
                {d.urgency}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                {d.status}
              </span>
              <span className="ml-auto flex items-center gap-1 text-[11px] text-text-tertiary">
                <Users size={10} />
                {d.stakeholders}
              </span>
            </div>
            <p className="text-sm font-medium text-text-primary group-hover:text-accent-blue transition-colors leading-snug">
              {d.title}
            </p>
          </button>
        ))}
        {decisions.length === 0 && (
          <p className="text-sm text-text-tertiary italic py-2">
            No open decisions at this time.
          </p>
        )}
      </div>
    </div>
  )
}

function PeopleNeedSection({
  people,
  navigate,
}: {
  people: PersonNeedItem[]
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="bg-cards rounded-xl border border-white/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-agent-violet" />
        <h3 className="text-sm font-semibold text-text-primary">
          People Who Need You
        </h3>
        <span className="ml-auto text-xs text-text-tertiary font-mono">
          {people.length}
        </span>
      </div>
      <div className="space-y-2">
        {people.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate('/pulse')}
            className="w-full text-left p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-text-primary group-hover:text-agent-violet transition-colors">
                {p.name}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${URGENCY_BADGE[p.urgency]}`}
              >
                {p.urgency}
              </span>
            </div>
            <p className="text-xs text-text-tertiary leading-relaxed">
              {p.reason}
            </p>
          </button>
        ))}
        {people.length === 0 && (
          <p className="text-sm text-text-tertiary italic py-2">
            No one is currently waiting on you.
          </p>
        )}
      </div>
    </div>
  )
}

function PredictionsSection({ predictions }: { predictions: string[] }) {
  return (
    <div className="bg-cards rounded-xl border border-white/5 p-5 relative overflow-hidden">
      {/* Gradient accent on left */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-agent-cyan to-agent-violet" />

      <div className="flex items-center gap-2 mb-4 pl-3">
        <Sparkles size={16} className="text-agent-cyan" />
        <h3 className="text-sm font-semibold text-text-primary">
          NEXUS Predictions
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-agent-cyan/15 to-agent-violet/15 text-[10px] font-semibold text-agent-cyan uppercase tracking-wider border border-agent-cyan/20">
          AI Generated
        </span>
      </div>
      <ul className="space-y-3 pl-3">
        {predictions.map((pred, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.15, duration: 0.3 }}
            className="text-sm text-text-secondary italic leading-relaxed flex items-start gap-2.5"
          >
            <Brain
              size={14}
              className="text-agent-cyan/60 flex-shrink-0 mt-0.5"
            />
            {pred}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

// ── Person Selector Card ────────────────────────────────────────────────────

function PersonCard({
  person,
  onClick,
}: {
  person: GraphNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 bg-cards rounded-xl border border-white/5 hover:border-accent-blue/30 hover:bg-cards/80 transition-all duration-200 group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-accent-blue/15 flex items-center justify-center flex-shrink-0 group-hover:bg-accent-blue/25 transition-colors">
          <span className="text-sm font-bold text-accent-blue">
            {person.label
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate group-hover:text-accent-blue transition-colors">
            {person.label}
          </p>
          {person.role && (
            <p className="text-xs text-text-tertiary truncate mt-0.5">
              {person.role}
            </p>
          )}
          {person.division && (
            <div className="mt-1.5">
              <DivisionScopeBadge scope={person.division} />
            </div>
          )}
          {person.cognitive_load != null && (
            <div className="mt-2">
              <CognitiveLoadBar load={person.cognitive_load} />
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function BriefingView() {
  const navigate = useNavigate()

  // Data state
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [mockBriefings, setMockBriefings] = useState<BriefingMockData | null>(
    null,
  )
  const [loading, setLoading] = useState(true)

  // Selection state
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  // Streaming simulation state
  const [showReasoning, setShowReasoning] = useState(false)
  const [visibleSections, setVisibleSections] = useState(0)

  // ── Load data ───────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getGraph(),
      fetch('/mock_data/briefing.json')
        .then((res) => res.json() as Promise<BriefingMockData>)
        .catch(() => null),
    ])
      .then(([graphData, briefings]) => {
        setGraph(graphData)
        setMockBriefings(briefings)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Derived data ────────────────────────────────────────────────────────
  const people = useMemo(() => {
    if (!graph) return []
    return graph.nodes.filter((n) => n.type === 'person')
  }, [graph])

  const briefing = useMemo<BriefingData | null>(() => {
    if (!selectedPersonId || !graph) return null
    // Try mock data first
    if (mockBriefings && mockBriefings[selectedPersonId]) {
      return mockBriefings[selectedPersonId]
    }
    // Generate generic from graph
    const person = graph.nodes.find((n) => n.id === selectedPersonId)
    if (!person) return null
    return buildGenericBriefing(person, graph)
  }, [selectedPersonId, graph, mockBriefings])

  // ── Streaming simulation ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPersonId || !briefing) return

    // Reset
    setShowReasoning(true)
    setVisibleSections(0)

    // After reasoning trace completes (~2s), start revealing sections
    const reasoningTimer = setTimeout(() => {
      setShowReasoning(false)

      // Stagger section reveals at 300ms each
      for (let i = 1; i <= 5; i++) {
        setTimeout(() => setVisibleSections(i), i * 300)
      }
    }, 2000)

    return () => {
      clearTimeout(reasoningTimer)
      setShowReasoning(false)
      setVisibleSections(0)
    }
  }, [selectedPersonId, briefing])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSelectPerson = useCallback((id: string) => {
    setSelectedPersonId(id)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedPersonId(null)
    setShowReasoning(false)
    setVisibleSections(0)
  }, [])

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-tertiary animate-pulse">
          Loading briefing data...
        </div>
      </div>
    )
  }

  // ── Person selector (no person selected) ────────────────────────────────
  if (!selectedPersonId) {
    return (
      <div className="p-6 overflow-y-auto h-full">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-amber/15 flex items-center justify-center">
              <Sun size={20} className="text-accent-amber" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">
                Morning Briefing
              </h1>
              <p className="text-xs text-text-tertiary">
                Select a person to generate their personalized briefing
              </p>
            </div>
          </div>

          {/* People grid */}
          {people.length === 0 ? (
            <div className="text-center py-16">
              <Users
                className="mx-auto mb-3 text-text-tertiary/50"
                size={32}
              />
              <p className="text-text-tertiary text-sm">
                No people found in the knowledge graph
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {people.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  onClick={() => handleSelectPerson(person.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Briefing display (person selected) ──────────────────────────────────
  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button and cognitive load */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors mb-4"
          >
            <ChevronLeft size={14} />
            Back to people
          </button>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-accent-blue/15 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-accent-blue">
                {briefing
                  ? briefing.person_name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                  : '??'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-text-primary">
                  {briefing?.person_name ?? 'Loading...'}
                </h1>
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <Sun size={12} className="text-accent-amber" />
                  Morning Briefing
                </div>
              </div>
              {briefing?.role && (
                <p className="text-sm text-text-tertiary mt-0.5">
                  {briefing.role}
                </p>
              )}

              {/* Large cognitive load gauge */}
              {briefing && (
                <div className="mt-3 max-w-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={12} className="text-text-tertiary" />
                    <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium">
                      Cognitive Load
                    </span>
                  </div>
                  <CognitiveLoadBar
                    load={briefing.cognitive_load}
                    showLabel
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reasoning trace */}
        <AnimatePresence>
          {showReasoning && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mb-6 bg-cards rounded-xl border border-white/5 p-4"
            >
              <ReasoningTrace steps={REASONING_STEPS} staggerMs={350} active />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Briefing sections with stagger */}
        {briefing && !showReasoning && (
          <div className="space-y-4">
            {/* Section 1: Attention */}
            <AnimatePresence>
              {visibleSections >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <AttentionSection
                    items={briefing.sections.attention}
                    navigate={navigate}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Section 2: Changes */}
            <AnimatePresence>
              {visibleSections >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <ChangesSection changes={briefing.sections.changes} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Section 3: Decisions */}
            <AnimatePresence>
              {visibleSections >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <DecisionsSection
                    decisions={briefing.sections.decisions}
                    navigate={navigate}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Section 4: People Who Need You */}
            <AnimatePresence>
              {visibleSections >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <PeopleNeedSection
                    people={briefing.sections.people_needing_you}
                    navigate={navigate}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Section 5: Predictions */}
            <AnimatePresence>
              {visibleSections >= 5 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <PredictionsSection
                    predictions={briefing.sections.predictions}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feedback widget at the bottom */}
            {visibleSections >= 5 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="flex items-center justify-between pt-4 border-t border-white/5"
              >
                <span className="text-[11px] text-text-tertiary">
                  Was this briefing useful?
                </span>
                <FeedbackWidget nodeId={`briefing-${briefing.person_id}`} />
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
