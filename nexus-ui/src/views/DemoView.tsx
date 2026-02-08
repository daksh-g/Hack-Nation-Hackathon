import { useState, useEffect, useRef, useCallback } from 'react'

// ─── DIVISIONS ───────────────────────────────────────────────
const DIVISIONS: Record<string, { label: string; color: string; cx: number; cy: number }> = {
  HQ:   { label: 'HEADQUARTERS', color: '#ff6b6b', cx: 0.5,  cy: 0.2  },
  NA:   { label: 'NORTH AMERICA', color: '#4ecdc4', cx: 0.22, cy: 0.52 },
  EMEA: { label: 'EMEA', color: '#ffe66d', cx: 0.78, cy: 0.52 },
  APAC: { label: 'ASIA-PACIFIC', color: '#a8e6cf', cx: 0.5,  cy: 0.82 },
}

// ─── PEOPLE ──────────────────────────────────────────────────
const PEOPLE = [
  // HQ
  { id: 'person-19', name: 'Alex Reeves', role: 'CEO', division: 'HQ', load: 82, commitments: 11, busScore: 9, isAgent: false },
  { id: 'person-16', name: 'Catherine Moore', role: 'CSO', division: 'HQ', load: 88, commitments: 8, busScore: 8, isAgent: false },
  { id: 'person-17', name: 'Robert Daniels', role: 'CFO', division: 'HQ', load: 75, commitments: 7, busScore: 6, isAgent: false },
  { id: 'person-18', name: 'Nina Volkov', role: 'General Counsel', division: 'HQ', load: 60, commitments: 5, busScore: 4, isAgent: false },
  // NA
  { id: 'person-1', name: 'Marcus Rivera', role: 'VP Engineering', division: 'NA', load: 72, commitments: 9, busScore: 7, isAgent: false },
  { id: 'person-2', name: 'Priya Sharma', role: 'Sr. Backend Engineer', division: 'NA', load: 55, commitments: 5, busScore: 4, isAgent: false },
  { id: 'person-3', name: 'James Liu', role: 'Staff Engineer', division: 'NA', load: 48, commitments: 4, busScore: 3, isAgent: false },
  { id: 'person-4', name: 'Anika Patel', role: 'Engineering Manager', division: 'NA', load: 62, commitments: 6, busScore: 5, isAgent: false },
  { id: 'person-5', name: 'David Kim', role: 'Head of Product', division: 'NA', load: 78, commitments: 8, busScore: 7, isAgent: false },
  { id: 'person-6', name: 'Sarah Chen', role: 'VP Sales', division: 'NA', load: 68, commitments: 7, busScore: 6, isAgent: false },
  { id: 'person-7', name: 'Tom Bradley', role: 'Account Executive', division: 'NA', load: 45, commitments: 3, busScore: 2, isAgent: false },
  { id: 'person-20', name: 'Maria Santos', role: 'VP Customer Success', division: 'NA', load: 56, commitments: 5, busScore: 4, isAgent: false },
  // EMEA
  { id: 'person-9',  name: 'Henrik Johansson', role: 'EMEA Eng Lead', division: 'EMEA', load: 58, commitments: 5, busScore: 5, isAgent: false },
  { id: 'person-10', name: 'Elena Kowalski', role: 'Senior Engineer', division: 'EMEA', load: 42, commitments: 3, busScore: 2, isAgent: false },
  { id: 'person-11', name: 'Omar Hassan', role: 'Backend Developer', division: 'EMEA', load: 35, commitments: 2, busScore: 1, isAgent: false },
  { id: 'person-12', name: 'Sophie Dubois', role: 'EMEA Ops Manager', division: 'EMEA', load: 50, commitments: 4, busScore: 3, isAgent: false },
  { id: 'person-13', name: 'Lars Mueller', role: 'EMEA Sales Director', division: 'EMEA', load: 61, commitments: 5, busScore: 4, isAgent: false },
  // APAC
  { id: 'person-14', name: 'Yuki Tanaka', role: 'APAC Eng Lead', division: 'APAC', load: 44, commitments: 3, busScore: 2, isAgent: false },
  { id: 'person-15', name: 'Wei Zhang', role: 'Growth Lead', division: 'APAC', load: 53, commitments: 4, busScore: 3, isAgent: false },
  // AI Agents
  { id: 'agent-1', name: 'Atlas-Code', role: 'Coding Agent', division: 'NA', load: 40, commitments: 6, busScore: 3, isAgent: true },
  { id: 'agent-2', name: 'Iris-Research', role: 'Research Agent', division: 'HQ', load: 65, commitments: 4, busScore: 2, isAgent: true },
  { id: 'agent-3', name: 'Sentinel-Compliance', role: 'Compliance Agent', division: 'HQ', load: 30, commitments: 3, busScore: 1, isAgent: true },
  { id: 'agent-4', name: 'Nova-Sales', role: 'Sales Agent', division: 'NA', load: 50, commitments: 5, busScore: 2, isAgent: true },
]

const CONNECTIONS = [
  // HQ internal
  { from: 'person-19', to: 'person-16', weight: 0.9 },
  { from: 'person-19', to: 'person-17', weight: 0.85 },
  { from: 'person-19', to: 'person-18', weight: 0.7 },
  { from: 'person-16', to: 'person-17', weight: 0.6 },
  // HQ → NA
  { from: 'person-19', to: 'person-1', weight: 0.8 },
  { from: 'person-19', to: 'person-5', weight: 0.75 },
  { from: 'person-19', to: 'person-6', weight: 0.7 },
  { from: 'person-17', to: 'person-6', weight: 0.5 },
  // NA internal
  { from: 'person-1', to: 'person-2', weight: 0.85 },
  { from: 'person-1', to: 'person-3', weight: 0.7 },
  { from: 'person-1', to: 'person-4', weight: 0.75 },
  { from: 'person-6', to: 'person-7', weight: 0.8 },
  { from: 'person-6', to: 'person-20', weight: 0.65 },
  { from: 'person-5', to: 'person-1', weight: 0.6 },
  { from: 'person-5', to: 'person-6', weight: 0.55 },
  // EMEA internal
  { from: 'person-9', to: 'person-10', weight: 0.8 },
  { from: 'person-9', to: 'person-11', weight: 0.7 },
  { from: 'person-9', to: 'person-12', weight: 0.5 },
  { from: 'person-13', to: 'person-12', weight: 0.6 },
  // Cross-division
  { from: 'person-1', to: 'person-9', weight: 0.5 },
  { from: 'person-5', to: 'person-9', weight: 0.4 },
  { from: 'person-6', to: 'person-13', weight: 0.35 },
  { from: 'person-19', to: 'person-14', weight: 0.3 },
  { from: 'person-9', to: 'person-14', weight: 0.25 },
  // AI Agent connections
  { from: 'agent-1', to: 'person-2', weight: 0.9 },
  { from: 'agent-1', to: 'person-3', weight: 0.6 },
  { from: 'agent-1', to: 'person-1', weight: 0.5 },
  { from: 'agent-2', to: 'person-16', weight: 0.85 },
  { from: 'agent-2', to: 'person-17', weight: 0.4 },
  { from: 'agent-3', to: 'person-18', weight: 0.8 },
  { from: 'agent-3', to: 'person-12', weight: 0.35 },
  { from: 'agent-4', to: 'person-6', weight: 0.9 },
  { from: 'agent-4', to: 'person-7', weight: 0.7 },
  { from: 'agent-4', to: 'person-13', weight: 0.3 },
]

const CONTRADICTION = {
  title: 'Conflicting Pricing Sent to Acme Corp',
  factA: { text: 'VP Sarah Chen verbally committed $20/seat to Acme Corp (500 seats, $120K ARR)', source: 'Sarah Chen → Client Call, Feb 3', person: 'person-6' },
  factB: { text: 'Nova-Sales sent automated proposal at $15/seat using outdated Q3 pricing sheet', source: 'Nova-Sales → Auto-Proposal, Feb 7 09:30', person: 'agent-4' },
  impact: 'Acme Corp now has two conflicting quotes. $30K ARR at stake.',
  downstream: ['Acme Corp enterprise deal ($120K ARR)', 'SEC quarterly filing accuracy', 'Nova-Sales pricing database audit'],
  resolver: 'Sarah Chen (VP Sales) — must contact Acme Corp to confirm $20/seat',
}

const BRIEFING_TEXT = `Three things need your attention.

First — a critical contradiction. Sarah Chen quoted Acme Corp $20 per seat, but Nova-Sales sent them $15 per seat three hours later using an outdated pricing sheet. The customer now has two conflicting proposals. $30K in annual revenue at stake. This needs resolution today.

Second — a knowledge silo. NA Payments and EMEA Billing both independently built retry logic for failed transactions. 83% code overlap, zero communication between the teams. That's roughly $45K in duplicated engineering effort.

Third — strategic drift. Atlas-Code is still generating REST v3 code, but the Payments team switched to GraphQL two days ago. Every commit Atlas-Code makes is technical debt. Its context needs to be updated immediately.`

const ONBOARDING_STEPS = [
  {
    title: 'The World You\'re Joining',
    content: (
      <div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
          You&apos;re joining the <strong style={{ color: '#4ecdc4' }}>NA Engineering team</strong> (8 people + 2 AI agents), led by Marcus Rivera.
          Your team communicates most heavily with <strong style={{ color: '#ffe66d' }}>EMEA Engineering</strong> and <strong style={{ color: '#ff6b6b' }}>HQ Strategy</strong>.
          The team&apos;s current cognitive load is <strong style={{ color: '#ffe66d' }}>elevated</strong> — a major API architecture decision was made this week.
        </p>
        <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Team Health</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[{ label: 'Active Commitments', val: '9' }, { label: 'AI Agents', val: '2' }, { label: 'Avg Cognitive Load', val: '58%' }].map(m => (
              <div key={m.label}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{m.val}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '5 Decisions That Shape Your Work',
    content: (
      <div>
        {[
          { date: 'Feb 7', text: 'Billing API switched from REST v3 to GraphQL', impact: 'All new endpoints use GraphQL — REST is deprecated' },
          { date: 'Feb 3', text: 'Enterprise pricing raised to $20/seat', impact: 'Affects every client-facing proposal' },
          { date: 'Jan 28', text: 'APAC market entry timeline finalized', impact: 'Cross-team dependencies on your deliverables' },
          { date: 'Jan 20', text: 'EMEA headcount expanded by 3 engineers', impact: 'New collaborators on shared services' },
          { date: 'Jan 15', text: 'Unified data platform migration approved', impact: 'Your code will run on the new infrastructure' },
        ].map((d, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ fontSize: 10, color: 'rgba(78,205,196,0.6)', fontFamily: '"Space Mono", monospace', minWidth: 55, paddingTop: 2 }}>{d.date}</div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{d.text}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{d.impact}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'People & AI Agents You Need to Know',
    content: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { name: 'Marcus Rivera', role: 'Your team lead', why: 'VP Engineering — owns all technical decisions', agent: false },
          { name: 'Priya Sharma', role: 'Sr. Backend Engineer', why: 'Your closest collaborator on the API layer', agent: false },
          { name: 'Atlas-Code', role: 'Coding Agent (AI)', why: 'Generates code for your team — needs context updates', agent: true },
          { name: 'Sarah Chen', role: 'VP Sales', why: 'Drives client requirements that shape your API', agent: false },
          { name: 'Nova-Sales', role: 'Sales Agent (AI)', why: 'Sends client proposals — uses your pricing data', agent: true },
          { name: 'Henrik Johansson', role: 'EMEA Eng Lead', why: 'Cross-division dependency on shared services', agent: false },
        ].map(p => (
          <div key={p.name} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.agent ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.05)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {p.agent && <span style={{ fontSize: 8, padding: '2px 5px', borderRadius: 4, background: 'rgba(6,182,212,0.15)', color: '#06b6d4', fontWeight: 700 }}>AI</span>}
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{p.name}</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(78,205,196,0.6)', marginTop: 2 }}>{p.role}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 1.5 }}>{p.why}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Open Tensions & Unresolved Issues',
    content: (
      <div>
        {[
          { severity: 'critical', title: 'Nova-Sales sent conflicting pricing to Acme Corp', detail: 'VP quoted $20/seat, AI agent sent $15/seat. Customer has both. $30K ARR difference.' },
          { severity: 'warning', title: 'Atlas-Code is building on superseded REST v3 spec', detail: 'Team switched to GraphQL 2 days ago. Every AI commit is now tech debt until context is refreshed.' },
          { severity: 'info', title: 'NA Payments and EMEA Billing built duplicate retry logic', detail: '83% code overlap, zero communication. Potential merge opportunity.' },
        ].map((t, i) => (
          <div key={i} style={{
            padding: 14, borderRadius: 10, marginBottom: 8,
            background: t.severity === 'critical' ? 'rgba(255,60,60,0.06)' : t.severity === 'warning' ? 'rgba(255,230,100,0.04)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${t.severity === 'critical' ? 'rgba(255,60,60,0.2)' : t.severity === 'warning' ? 'rgba(255,230,100,0.15)' : 'rgba(255,255,255,0.06)'}`,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, color: t.severity === 'critical' ? '#ff6b6b' : t.severity === 'warning' ? '#ffe66d' : 'rgba(255,255,255,0.4)' }}>
              {t.severity === 'critical' ? '● Critical' : t.severity === 'warning' ? '● Warning' : '● Note'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{t.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6, lineHeight: 1.5 }}>{t.detail}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'What\'s Expected of You',
    content: (
      <div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 16 }}>
          The NA Engineering team is driving toward three objectives. Your contributions will feed into these:
        </p>
        {[
          { obj: 'Complete GraphQL API migration by March 1', your: 'You\'ll own the payments endpoint migration' },
          { obj: 'Resolve Atlas-Code context staleness', your: 'You\'ll help define the AI agent context refresh pipeline' },
          { obj: 'Prepare for unified data platform migration', your: 'You\'ll document integration points with EMEA' },
        ].map((o, i) => (
          <div key={i} style={{ marginBottom: 12, padding: 14, borderRadius: 10, background: 'rgba(78,205,196,0.04)', border: '1px solid rgba(78,205,196,0.1)' }}>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{o.obj}</div>
            <div style={{ fontSize: 11, color: 'rgba(78,205,196,0.7)', marginTop: 6 }}>Your role: {o.your}</div>
          </div>
        ))}
        <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Estimated time to full context:</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#4ecdc4', marginTop: 4 }}>5 minutes</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>vs. industry average: 3–6 months</div>
        </div>
      </div>
    ),
  },
]

// ─── PARTICLE ────────────────────────────────────────────────
interface NodeRef {
  id: string; name: string; role: string; division: string
  load: number; commitments: number; busScore: number; isAgent: boolean
  x: number; y: number; baseX: number; baseY: number
  pulsePhase: number; radius: number
}
class Particle {
  fromX: number; fromY: number; toX: number; toY: number
  progress: number; speed: number; color: string; size: number; opacity: number
  constructor(fromX: number, fromY: number, toX: number, toY: number, color: string) {
    this.fromX = fromX; this.fromY = fromY; this.toX = toX; this.toY = toY
    this.progress = Math.random()
    this.speed = 0.001 + Math.random() * 0.003
    this.color = color; this.size = 1 + Math.random() * 2
    this.opacity = 0.3 + Math.random() * 0.5
  }
  update() { this.progress += this.speed; if (this.progress > 1) this.progress = 0 }
  getPos() {
    const t = this.progress
    return { x: this.fromX + (this.toX - this.fromX) * t, y: this.fromY + (this.toY - this.fromY) * t }
  }
}

// ─── HELPERS ─────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function getLoadColor(load: number): string {
  if (load > 80) return '#ff6b6b'
  if (load > 60) return '#ffe66d'
  return '#4ecdc4'
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export function DemoView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<NodeRef[]>([])
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)
  const timeRef = useRef(0)

  const [selectedNode, setSelectedNode] = useState<NodeRef | null>(null)
  const [showContradiction, setShowContradiction] = useState(false)
  const [showBriefing, setShowBriefing] = useState(false)
  const [briefingProgress, setBriefingProgress] = useState(0)
  const [showSilo, setShowSilo] = useState(false)
  const [showRipple, setShowRipple] = useState(false)
  const [rippleNode, setRippleNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)

  // Initialize nodes
  useEffect(() => {
    const w = window.innerWidth
    const h = window.innerHeight
    nodesRef.current = PEOPLE.map(p => {
      const div = DIVISIONS[p.division]
      const jX = (Math.random() - 0.5) * w * 0.13
      const jY = (Math.random() - 0.5) * h * 0.13
      return {
        ...p, x: div.cx * w + jX, y: div.cy * h + jY,
        baseX: div.cx * w + jX, baseY: div.cy * h + jY,
        pulsePhase: Math.random() * Math.PI * 2,
        radius: p.isAgent ? 10 + (p.load / 100) * 12 : 7 + (p.load / 100) * 16,
      }
    })

    const particles: Particle[] = []
    CONNECTIONS.forEach(conn => {
      const from = nodesRef.current.find(n => n.id === conn.from)
      const to = nodesRef.current.find(n => n.id === conn.to)
      if (from && to) {
        const isAI = from.isAgent || to.isAgent
        const color = isAI ? '#06b6d4' : DIVISIONS[from.division]?.color || '#ffffff'
        const count = Math.floor(conn.weight * 4) + 1
        for (let i = 0; i < count; i++) particles.push(new Particle(from.x, from.y, to.x, to.y, color))
      }
    })
    particlesRef.current = particles
  }, [])

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width = window.innerWidth
    const h = canvas.height = window.innerHeight

    const animate = () => {
      timeRef.current += 0.016
      ctx.fillStyle = 'rgba(8, 10, 18, 0.12)'
      ctx.fillRect(0, 0, w, h)

      const hb = Math.sin(timeRef.current * 1.2) * 0.12 + 0.88

      // Gentle node drift
      nodesRef.current.forEach(node => {
        node.x = node.baseX + Math.sin(timeRef.current * 0.5 + node.pulsePhase) * 5
        node.y = node.baseY + Math.cos(timeRef.current * 0.4 + node.pulsePhase * 1.3) * 4
      })

      // Update particle source positions
      particlesRef.current.forEach(p => {
        const connIdx = CONNECTIONS.findIndex(c => {
          const fn = nodesRef.current.find(n => n.id === c.from)
          const tn = nodesRef.current.find(n => n.id === c.to)
          return fn && tn && Math.abs(p.fromX - fn.baseX) < 120 && Math.abs(p.toX - tn.baseX) < 120
        })
        if (connIdx >= 0) {
          const c = CONNECTIONS[connIdx]
          const fn = nodesRef.current.find(n => n.id === c.from)
          const tn = nodesRef.current.find(n => n.id === c.to)
          if (fn) { p.fromX = fn.x; p.fromY = fn.y }
          if (tn) { p.toX = tn.x; p.toY = tn.y }
        }
      })

      // Draw connections
      CONNECTIONS.forEach(conn => {
        const from = nodesRef.current.find(n => n.id === conn.from)
        const to = nodesRef.current.find(n => n.id === conn.to)
        if (!from || !to) return

        const isContra = showContradiction && (
          (conn.from === 'person-6' && conn.to === 'agent-4') ||
          (conn.from === 'agent-4' && conn.to === 'person-6') ||
          (conn.from === 'agent-4' && conn.to === 'person-7') ||
          (conn.from === 'person-6' && conn.to === 'person-7')
        )

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = isContra
          ? `rgba(255, 50, 50, ${0.6 * hb})`
          : `rgba(255, 255, 255, ${conn.weight * 0.06 * hb})`
        ctx.lineWidth = isContra ? 2.5 : conn.weight * 1.2
        ctx.stroke()
      })

      // Draw silo highlight
      if (showSilo) {
        const naNodes = nodesRef.current.filter(n => n.division === 'NA' && !n.isAgent)
        const emeaNodes = nodesRef.current.filter(n => n.division === 'EMEA' && !n.isAgent)
        const naCx = naNodes.reduce((s, n) => s + n.x, 0) / naNodes.length
        const naCy = naNodes.reduce((s, n) => s + n.y, 0) / naNodes.length
        const eCx = emeaNodes.reduce((s, n) => s + n.x, 0) / emeaNodes.length
        const eCy = emeaNodes.reduce((s, n) => s + n.y, 0) / emeaNodes.length

        ctx.setLineDash([8, 8])
        ctx.beginPath()
        ctx.moveTo(naCx, naCy)
        ctx.lineTo(eCx, eCy)
        ctx.strokeStyle = `rgba(255, 200, 50, ${0.6 + Math.sin(timeRef.current * 3) * 0.3})`
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.setLineDash([])

        const mx = (naCx + eCx) / 2
        const my = (naCy + eCy) / 2
        ctx.font = '600 11px "Inter", sans-serif'
        ctx.fillStyle = `rgba(255, 200, 50, ${0.8 + Math.sin(timeRef.current * 3) * 0.2})`
        ctx.textAlign = 'center'
        ctx.fillText('83% CODE OVERLAP · 0 COMMUNICATION', mx, my - 12)
        ctx.fillText('SILO DETECTED', mx, my + 4)
      }

      // Draw particles
      particlesRef.current.forEach(p => {
        p.update()
        const pos = p.getPos()
        const rgb = hexToRgb(p.color)
        // Glow
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, p.size * 3 * hb, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb}, ${p.opacity * 0.12 * hb})`
        ctx.fill()
        // Core
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, p.size * hb, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb}, ${p.opacity * hb})`
        ctx.fill()
      })

      // Draw ripple
      if (showRipple && rippleNode) {
        const node = nodesRef.current.find(n => n.id === rippleNode)
        if (node) {
          const age = (timeRef.current * 0.8) % 3
          for (let i = 0; i < 3; i++) {
            const r = ((age + i) % 3) * 120
            const alpha = Math.max(0, 1 - r / 360)
            ctx.beginPath()
            ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(78, 205, 196, ${alpha * 0.5})`
            ctx.lineWidth = 2
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      nodesRef.current.forEach(node => {
        const div = DIVISIONS[node.division]
        const pulse = Math.sin(timeRef.current * 2 + node.pulsePhase) * 0.2 + 0.8
        const r = node.radius * pulse * hb
        const isHovered = hoveredNode === node.id
        const isContraNode = showContradiction && (node.id === 'person-6' || node.id === 'agent-4')
        const isSelected = selectedNode?.id === node.id

        // Outer glow
        const glowR = r * 3.5
        const glow = ctx.createRadialGradient(node.x, node.y, r * 0.3, node.x, node.y, glowR)
        const glowRgb = isContraNode ? '255,50,50' : node.isAgent ? '6,182,212' : hexToRgb(div.color)
        glow.addColorStop(0, `rgba(${glowRgb}, ${0.25 * pulse})`)
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow
        if (node.isAgent) { drawHexagon(ctx, node.x, node.y, glowR); ctx.fill() }
        else { ctx.beginPath(); ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2); ctx.fill() }

        // Node body
        const bodyColor = isContraNode
          ? `rgba(255,60,60,${0.9 * pulse})`
          : node.isAgent
            ? `rgba(6,182,212,${0.85 * pulse})`
            : node.load > 80
              ? `rgba(255,150,50,${0.85 * pulse})`
              : `rgba(${hexToRgb(div.color)},${0.85 * pulse})`

        if (node.isAgent) {
          drawHexagon(ctx, node.x, node.y, r)
          ctx.fillStyle = bodyColor
          ctx.fill()
          ctx.strokeStyle = `rgba(6,182,212,${0.5 + Math.sin(timeRef.current * 3) * 0.3})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
          ctx.fillStyle = bodyColor
          ctx.fill()
        }

        // Pulsing border for contradiction or selected
        if (isContraNode) {
          if (node.isAgent) { drawHexagon(ctx, node.x, node.y, r + 2) } else { ctx.beginPath(); ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2) }
          ctx.strokeStyle = `rgba(255,50,50,${0.5 + Math.sin(timeRef.current * 4) * 0.5})`
          ctx.lineWidth = 2.5
          ctx.stroke()
        }
        if (isSelected) {
          if (node.isAgent) { drawHexagon(ctx, node.x, node.y, r + 3) } else { ctx.beginPath(); ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2) }
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Label
        const showLabel = r > 8 || isHovered || isSelected
        if (showLabel) {
          ctx.font = `${isHovered || isSelected ? '600' : '400'} ${isHovered || isSelected ? 12 : 10}px "Inter", sans-serif`
          ctx.fillStyle = `rgba(255,255,255,${isHovered || isSelected ? 1 : 0.7})`
          ctx.textAlign = 'center'
          const label = node.name.includes('-') ? node.name : node.name.split(' ').pop() || node.name
          ctx.fillText(label!, node.x, node.y + r + 14)
          if (isHovered || isSelected) {
            ctx.font = '400 9px "Inter", sans-serif'
            ctx.fillStyle = node.isAgent ? 'rgba(6,182,212,0.7)' : 'rgba(255,255,255,0.4)'
            ctx.fillText(node.role, node.x, node.y + r + 26)
          }
        }
      })

      // Division labels
      Object.values(DIVISIONS).forEach(div => {
        ctx.font = '700 11px "Inter", sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.textAlign = 'center'
        ctx.fillText(div.label, div.cx * w, div.cy * h - 70)
      })

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [showContradiction, showSilo, showRipple, rippleNode, hoveredNode, selectedNode])

  // Handle clicks
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const clicked = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) < n.radius + 8)
    if (clicked) setSelectedNode(clicked)
    else setSelectedNode(null)
  }, [])

  const handleCanvasMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const hovered = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) < n.radius + 8)
    setHoveredNode(hovered?.id || null)
  }, [])

  // Briefing typewriter
  useEffect(() => {
    if (!showBriefing) { setBriefingProgress(0); return }
    const interval = setInterval(() => {
      setBriefingProgress(p => { if (p >= BRIEFING_TEXT.length) { clearInterval(interval); return p }; return p + 2 })
    }, 18)
    return () => clearInterval(interval)
  }, [showBriefing])

  const triggerRipple = () => {
    setRippleNode('person-19')
    setShowRipple(true)
    setTimeout(() => setShowRipple(false), 6000)
  }

  const resetAll = () => {
    setShowContradiction(false); setShowSilo(false); setShowBriefing(false)
    setSelectedNode(null); setShowRipple(false); setShowOnboarding(false)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#080a12', overflow: 'hidden', position: 'relative', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <canvas ref={canvasRef} onClick={handleCanvasClick} onMouseMove={handleCanvasMove}
        style={{ position: 'absolute', top: 0, left: 0, cursor: hoveredNode ? 'pointer' : 'default' }} />

      {/* ─── TOP BAR ─── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(8,10,18,0.9), transparent)', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ecdc4', boxShadow: '0 0 12px #4ecdc4', animation: 'nexus-pulse-dot 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: 4, textTransform: 'uppercase' }}>NEXUS</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, letterSpacing: 1 }}>ORGANIZATIONAL NERVOUS SYSTEM</div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)', pointerEvents: 'auto', fontFamily: '"JetBrains Mono", monospace' }}>
          <span>24 NODES</span>
          <span>34 PATHWAYS</span>
          <span>4 AI AGENTS</span>
          <span style={{ color: '#ff6b6b' }}>7 ALERTS</span>
          <span style={{ color: '#ffe66d' }}>2 STALE</span>
        </div>
      </div>

      {/* ─── CONTROL BAR ─── */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
        {[
          { icon: '●', color: '#ff6b6b', label: 'Show Contradiction', onClick: () => { resetAll(); setShowContradiction(true) } },
          { icon: '●', color: '#ffe66d', label: 'Show Silo', onClick: () => { resetAll(); setShowSilo(true) } },
          { icon: '◎', color: '#4ecdc4', label: 'Decision Ripple', onClick: triggerRipple },
          { icon: '⚡', color: '#fff', label: 'What Changed Today?', onClick: () => { resetAll(); setShowBriefing(true); setShowContradiction(true); setShowSilo(true) } },
          { icon: '◉', color: '#4ecdc4', label: 'New Joiner', onClick: () => { resetAll(); setShowOnboarding(true); setOnboardingStep(0) } },
          { icon: '↺', color: '#fff', label: 'Reset', onClick: resetAll },
        ].map(btn => (
          <button key={btn.label} onClick={btn.onClick}
            style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 500, cursor: 'pointer', backdropFilter: 'blur(20px)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 8, fontFamily: '"Inter", sans-serif' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
          >
            <span style={{ color: btn.color, fontSize: 10 }}>{btn.icon}</span>
            {btn.label}
          </button>
        ))}
      </div>

      {/* ─── NODE DETAIL ─── */}
      {selectedNode && !showBriefing && !showOnboarding && (
        <div style={{ position: 'absolute', top: '50%', right: 32, transform: 'translateY(-50%)', width: 300, background: 'rgba(15,17,28,0.95)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 24, zIndex: 20, backdropFilter: 'blur(40px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{selectedNode.name}</span>
                {selectedNode.isAgent && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(6,182,212,0.2)', color: '#06b6d4', fontWeight: 700, letterSpacing: 1 }}>AI</span>}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{selectedNode.role}</div>
              <div style={{ display: 'inline-block', marginTop: 8, padding: '3px 10px', borderRadius: 100, background: DIVISIONS[selectedNode.division].color + '22', color: DIVISIONS[selectedNode.division].color, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                {DIVISIONS[selectedNode.division].label}
              </div>
            </div>
            <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
          </div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Cognitive Load</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: getLoadColor(selectedNode.load) }}>{selectedNode.load}%</span>
              </div>
              <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ width: `${selectedNode.load}%`, height: '100%', borderRadius: 2, background: getLoadColor(selectedNode.load), transition: 'width 0.5s ease', boxShadow: `0 0 8px ${getLoadColor(selectedNode.load)}40` }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{selectedNode.commitments}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Commitments</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: selectedNode.busScore > 6 ? '#ff6b6b' : '#fff' }}>{selectedNode.busScore}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Bus Factor</div>
              </div>
            </div>
            {selectedNode.busScore > 6 && (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 8, background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#ff6b6b', textTransform: 'uppercase', letterSpacing: 1 }}>● Single Point of Failure</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.5 }}>
                  If unavailable for 48h, {selectedNode.busScore} active workstreams would stall.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CONTRADICTION PANEL ─── */}
      {showContradiction && !showBriefing && !showOnboarding && (
        <div style={{ position: 'absolute', top: '50%', left: 32, transform: 'translateY(-50%)', width: 360, background: 'rgba(15,17,28,0.95)', borderRadius: 16, border: '1px solid rgba(255,60,60,0.25)', padding: 24, zIndex: 20, backdropFilter: 'blur(40px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3c3c', boxShadow: '0 0 12px #ff3c3c', animation: 'nexus-pulse-dot 1s ease-in-out infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#ff6b6b', textTransform: 'uppercase', letterSpacing: 2, fontFamily: '"JetBrains Mono", monospace' }}>
              Contradiction Detected
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 }}>{CONTRADICTION.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,60,60,0.06)', border: '1px solid rgba(255,60,60,0.15)' }}>
              <div style={{ fontSize: 9, color: '#ff6b6b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Human — Sarah Chen</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{CONTRADICTION.factA.text}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{CONTRADICTION.factA.source}</div>
            </div>
            <div style={{ textAlign: 'center', color: 'rgba(255,60,60,0.5)', fontSize: 16 }}>⚡</div>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <div style={{ fontSize: 9, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>AI Agent — Nova-Sales</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{CONTRADICTION.factB.text}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{CONTRADICTION.factB.source}</div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Downstream Impact</div>
            {CONTRADICTION.downstream.map((d, i) => (
              <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, paddingLeft: 12, borderLeft: '2px solid rgba(255,60,60,0.3)' }}>{d}</div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Resolution:</strong> {CONTRADICTION.resolver}
          </div>
        </div>
      )}

      {/* ─── BRIEFING PANEL ─── */}
      {showBriefing && (
        <div style={{ position: 'absolute', top: '50%', right: 32, transform: 'translateY(-50%)', width: 380, background: 'rgba(15,17,28,0.95)', borderRadius: 16, border: '1px solid rgba(78,205,196,0.2)', padding: 24, zIndex: 20, backdropFilter: 'blur(40px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(78,205,196,0.15)', border: '1px solid rgba(78,205,196,0.3)' }}>
              <span style={{ fontSize: 16 }}>⚡</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>What changed today?</div>
              <div style={{ fontSize: 10, color: 'rgba(78,205,196,0.7)', fontFamily: '"JetBrains Mono", monospace' }}>
                BRIEFING · {Math.min(Math.floor(briefingProgress / BRIEFING_TEXT.length * 45), 45)}s
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, maxHeight: 380, overflowY: 'auto' }}>
            {BRIEFING_TEXT.slice(0, briefingProgress)}
            {briefingProgress < BRIEFING_TEXT.length && <span style={{ display: 'inline-block', width: 2, height: 14, background: '#4ecdc4', marginLeft: 2, animation: 'nexus-blink 1s infinite', verticalAlign: 'middle' }} />}
          </div>
          {briefingProgress >= BRIEFING_TEXT.length && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(78,205,196,0.3)', background: 'rgba(78,205,196,0.1)', color: '#4ecdc4', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                Resolve Contradiction →
              </button>
              <button style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                Update Atlas-Code →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── ONBOARDING PANEL ─── */}
      {showOnboarding && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 520, background: 'rgba(15,17,28,0.97)', borderRadius: 20, border: '1px solid rgba(78,205,196,0.15)', padding: 32, zIndex: 25, backdropFilter: 'blur(40px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(78,205,196,0.7)', textTransform: 'uppercase', letterSpacing: 2, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>Time Machine · Onboarding</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginTop: 6 }}>Welcome to NA Engineering</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Context package generated for: New Engineer</div>
            </div>
            <button onClick={() => setShowOnboarding(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 20, padding: 4 }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
            {['Your World', 'Key Decisions', 'Key People', 'Open Tensions', 'Expectations'].map((s, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= onboardingStep ? '#4ecdc4' : 'rgba(255,255,255,0.06)', transition: 'background 0.3s ease' }} />
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>{ONBOARDING_STEPS[onboardingStep].title}</div>
          {ONBOARDING_STEPS[onboardingStep].content}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button onClick={() => setOnboardingStep(Math.max(0, onboardingStep - 1))} disabled={onboardingStep === 0}
              style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: onboardingStep === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', fontSize: 11, cursor: onboardingStep === 0 ? 'default' : 'pointer' }}>
              ← Previous
            </button>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }}>{onboardingStep + 1} / 5</span>
            <button onClick={() => setOnboardingStep(Math.min(4, onboardingStep + 1))} disabled={onboardingStep === 4}
              style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(78,205,196,0.3)', background: 'rgba(78,205,196,0.1)', color: onboardingStep === 4 ? 'rgba(255,255,255,0.2)' : '#4ecdc4', fontSize: 11, cursor: onboardingStep === 4 ? 'default' : 'pointer' }}>
              Next →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes nexus-pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
        @keyframes nexus-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  )
}
