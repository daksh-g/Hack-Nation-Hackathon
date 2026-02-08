# NEXUS UI Implementation Plan — Missing Features

> **Goal**: Emphasize ease of interfacing with AI. Every interaction should feel like talking to a
> brilliant Chief of Staff who already knows the org — not like filling out forms.
>
> **Judge criteria we're targeting**: "Voice and low-friction interaction, minimal typing and clicks"
> and "visualizing agentic AI reasoning and communication flows."

---

## Design Philosophy

The challenge PDF says: *"Not a chatbot. Not a feed. But a new intelligence layer."*

Every new UI element should reinforce this. The AI shouldn't feel like a tool you operate —
it should feel like a colleague who proactively surfaces what matters. Three principles:

1. **Zero-click insights** — The AI presents information before you ask
2. **One-action commands** — Any interaction is at most one click or one sentence
3. **Visible reasoning** — When the AI works, you see *how* it thinks (agents running, graph traversal, routing logic)

---

## Priority Map

| Priority | Feature | Judge Criteria Hit | Time Est |
|----------|---------|-------------------|----------|
| **P0** | Command Bar (Cmd+K) | UX & Interaction, Demo Quality | 2h |
| **P0** | Voice Input | UX & Interaction (explicitly requested) | 1h |
| **P0** | Briefing View | Communication Intelligence, Demo Quality | 2h |
| **P1** | Immune Scan Visualization | Deconfliction, Visualizing AI Reasoning | 1.5h |
| **P1** | People & Workforce View | Knowledge Graph, Stakeholder Map | 2h |
| **P2** | Notification Center | Communication Intelligence, Routing | 1h |
| **P2** | Task Graph View | Creativity, Moonshot Thinking | 1.5h |
| **P2** | LLM Usage Overlay | Demo polish | 30m |

---

## P0 — Must Build

### 1. Command Bar (Cmd+K Spotlight)

**Why**: This is the single highest-impact addition. It unifies every AI interaction into one
low-friction entry point. Instead of navigating to different views and clicking buttons, the user
presses Cmd+K and talks to NEXUS in natural language. NEXUS figures out what to do.

**Route**: Global overlay (no route — appears on any page via Cmd+K or clicking the search icon)

**File**: `nexus-ui/src/components/CommandBar.tsx`

**Behavior**:
```
User presses Cmd+K → modal overlay appears with input field + mic button
User types or speaks: "What changed today?"
  → NEXUS classifies intent → routes to /api/ask → streams response inline
User types: "Run an immune scan"
  → NEXUS routes to /api/immune/scan → shows agent progress inline
User types: "Brief me as Sarah Chen"
  → NEXUS routes to /api/briefing/generate → streams briefing
User types: "Show me the pricing contradiction"
  → NEXUS routes to /alerts with filter → navigates there
User types: "Who's overloaded right now?"
  → NEXUS routes to /api/workers/status → shows inline summary
```

**Layout**:
```
┌──────────────────────────────────────────────────┐
│  🔍  Ask NEXUS anything...              [🎤] [⌘K] │
├──────────────────────────────────────────────────┤
│                                                    │
│  Recent:                                           │
│    "What changed today?"                           │
│    "Run immune scan"                               │
│    "Brief me as David Kim"                         │
│                                                    │
│  Quick Actions:                                    │
│    ⚡ Morning Briefing    🛡️ Run Immune Scan       │
│    👥 Workforce Status    📊 What Changed?         │
│                                                    │
└──────────────────────────────────────────────────┘
```

When a response streams in, the modal expands to show it:
```
┌──────────────────────────────────────────────────┐
│  🔍  "what changed today?"              [🎤] [⌘K] │
├──────────────────────────────────────────────────┤
│                                                    │
│  🤖 NEXUS is thinking...                           │
│  ┌─ Routing ──────────────────────────────────┐   │
│  │ Intent: organizational_query               │   │
│  │ Agent: RAG + Context Builder               │   │
│  │ Sources: 87 nodes, 7 alerts, 5 decisions   │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  Three things changed in the last 24 hours:        │
│                                                    │
│  1. ⚠️ Pricing contradiction between Sarah Chen    │
│     and Nova-Sales ($20 vs $15 premium tier)       │
│     → [View Alert] [Trace Decision Chain]          │
│                                                    │
│  2. 📉 Atlas-Code's REST v3 API doc is stale       │
│     (team switched to GraphQL 3 weeks ago)         │
│     → [View on Graph] [Mark as Resolved]           │
│                                                    │
│  3. 🔴 Catherine Moore at 88% cognitive load       │
│     (4 active commitments, 2 pending decisions)    │
│     → [View Person] [Redistribute Tasks]           │
│                                                    │
└──────────────────────────────────────────────────┘
```

**Key implementation details**:
- Use `/api/ask` with `stream: true` for natural language queries
- Show a "Routing" box that reveals which backend path NEXUS chose (visible AI reasoning)
- Quick Actions are hardcoded shortcuts that call specific endpoints
- Response items have inline action buttons that navigate to the relevant view
- Escape or click-outside closes the modal
- History persisted in localStorage

**Backend integration**:
- Natural language queries → `POST /api/ask` (existing, with streaming)
- "Run immune scan" → `POST /api/immune/scan`
- "Brief me as [person]" → `POST /api/briefing/generate`
- "Workforce status" → `GET /api/workers/status`
- Intent classification happens client-side via keyword matching (fast) with LLM fallback

---

### 2. Voice Input

**Why**: The challenge PDF explicitly lists "Voice and low-friction interaction" as evaluation
criteria. Adding a mic button demonstrates multimodal input with minimal effort.

**File**: `nexus-ui/src/hooks/useVoiceInput.ts`

**Integration points**:
- Mic button in Command Bar
- Mic button in Ask NEXUS view (existing)
- Mic button in InfoDrop widget

**Implementation**:
```typescript
// useVoiceInput.ts — uses Web Speech API (built into Chrome/Edge)
// Returns: { isListening, transcript, startListening, stopListening }
// On transcript finalize → auto-submit to the active input
```

**UX flow**:
1. User clicks mic icon (or holds spacebar in Command Bar)
2. Pulsing red indicator shows recording is active
3. Real-time transcript appears in the input field
4. On silence detection (1.5s) → auto-submit
5. Response streams back as normal

**Visual indicator**: When voice is active, the Command Bar input gets a pulsing red ring
and the mic icon animates. The transcript appears in real-time as the user speaks.

**Demo script moment**: Open Cmd+K → click mic → say "What changed today?" → response
streams in. Total interaction: 1 click + 3 words spoken. This is the "superhuman" moment.

---

### 3. Briefing View

**Why**: Directly maps to the challenge scenario: *"A founder asks: What changed today? → the AI
generates a visual map of updates."* This is the AI Chief of Staff's killer feature.

**Route**: `/briefing`

**File**: `nexus-ui/src/views/BriefingView.tsx`

**Sidebar nav**: Add a new icon (📋 `Briefing` with `FileText` from lucide-react)

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  Good morning. Select your identity:                      │
│                                                           │
│  [Sarah Chen - VP Sales]  [David Kim - CTO]               │
│  [Maria Santos - COO]     [James Wright - Head of Eng]    │
│  [Catherine Moore - PM]   [Custom person ID...]           │
│                                                           │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                           │
│  ☀️ DAILY BRIEFING — Sarah Chen                           │
│  Generated by NEXUS at 9:02 AM                            │
│                                                           │
│  ┌─ What Needs Your Attention ──────────────────────────┐ │
│  │ 🔴 Pricing contradiction with Nova-Sales ($20 v $15) │ │
│  │    You set $20 on Jan 28. Nova-Sales quotes $15.     │ │
│  │    → [Resolve This] [See Decision Chain]             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─ What Changed Since Yesterday ───────────────────────┐ │
│  │ • Atlas-Code switched from REST v3 to GraphQL        │ │
│  │ • New commitment: APAC launch moved to Q3            │ │
│  │ • 2 new edges: David Kim ↔ Payments team             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─ Your Open Decisions ────────────────────────────────┐ │
│  │ 1. Premium tier pricing (BLOCKING — 3 teams)         │ │
│  │ 2. Q2 hiring plan (due Feb 15)                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─ Your Cognitive Load ────────────────────────────────┐ │
│  │ ████████░░ 65%  (3 commitments, 2 decisions)         │ │
│  │ Compared to org avg: 52%                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─ People Who Need You ────────────────────────────────┐ │
│  │ Catherine Moore (PM) — waiting on pricing decision   │ │
│  │ James Wright (Eng) — blocked on API spec approval    │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key implementation details**:
- Person selector at top (pre-populated from graph nodes where `type === 'person'`)
- Clicking a person calls `POST /api/briefing/generate { person_id, stream: true }`
- Briefing streams in section by section with typewriter effect
- Each section is a card with inline action buttons
- The "Cognitive Load" section uses the existing `CognitiveLoadBar` component
- "People Who Need You" section shows pending notifications from `/api/routing/pending?person_id=X`
- Fallback: If LLM unavailable, build briefing client-side from graph data (filter nodes/edges/alerts relevant to the person)

**Static fallback for demo** (no LLM needed):
- Read the person's node from graph
- Find all edges connected to them
- Find all alerts where they're in `affected_node_ids`
- Find all decisions where they're the `source_id`
- Render these as the briefing sections

---

## P1 — Should Build

### 4. Immune Scan Visualization (enhance existing AlertsView)

**Why**: The judges specifically look for "Deconfliction & Critique" and "visualizing agentic AI
reasoning." Running 6 parallel agents and showing their status live is the most direct way to
demonstrate multi-agent AI reasoning.

**File**: Modify existing `nexus-ui/src/views/AlertsView.tsx`

**Addition**: A "Run Immune Scan" button at the top + an agent status panel

**Layout addition at top of AlertsView**:
```
┌──────────────────────────────────────────────────────────┐
│  🛡️ NEXUS Immune System                    [Run Scan ▶]  │
│                                                           │
│  When scan is running:                                    │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Scanning organization...                            │  │
│  │                                                      │  │
│  │  ✅ Contradiction Agent    — 2 findings              │  │
│  │  ✅ Staleness Agent        — 1 finding               │  │
│  │  ⏳ Silo Detection Agent   — analyzing...            │  │
│  │  ⏳ Overload Agent         — analyzing...            │  │
│  │  ⬜ Coordination Agent     — queued                  │  │
│  │  ⬜ Drift Agent            — queued                  │  │
│  │                                                      │  │
│  │  ████████████░░░░░░░░  4/6 agents complete           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  (existing alert cards below...)                          │
└──────────────────────────────────────────────────────────┘
```

**Key implementation details**:
- "Run Scan" calls `POST /api/immune/scan` (returns all 6 agent results)
- While waiting, show progress animation with 6 agent slots
- Since the API returns all at once, simulate sequential completion for visual drama:
  - Show agents completing one by one with 300ms stagger
  - Each agent slot transitions from ⬜ → ⏳ → ✅ with finding count
- New alerts from scan results get prepended to the alert list with a "NEW" badge
- "Scan History" link calls `GET /api/immune/history`

**Alternative**: Run each agent individually via `POST /api/immune/scan/{agent_name}` for real
parallel execution with live updates per agent. More impressive but requires 6 parallel API calls.

---

### 5. People & Workforce View

**Why**: Maps to "Knowledge Graph & Stakeholder Map" criteria. Shows every person and AI agent
in the org with their cognitive load, assignments, and relationships. This is where the
"Who needs to know this?" question gets answered visually.

**Route**: `/people`

**File**: `nexus-ui/src/views/PeopleView.tsx`

**Sidebar nav**: Add icon (👥 `Users` from lucide-react)

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  People & Agents                          [Analyze ▶]     │
│                                                           │
│  ┌─ Filter ──────────────────────────────────────────┐    │
│  │ [All] [People] [AI Agents] │ [By Division ▼]     │    │
│  └───────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─ Attention Required ──────────────────────────────────┐│
│  │ 🔴 Catherine Moore — 88% cognitive load (overloaded)  ││
│  │ 🟡 James Wright — 2 blocked decisions                 ││
│  │ 🟡 Nova-Sales — trust level: review_required          ││
│  └───────────────────────────────────────────────────────┘│
│                                                           │
│  ┌─ North America Division ──────────────────────────────┐│
│  │                                                       ││
│  │  Sarah Chen          David Kim         Catherine Moore││
│  │  VP Sales, NA        CTO, HQ           PM, NA        ││
│  │  ██████░░ 65%        ████░░░░ 45%      ████████░ 88% ││
│  │  2 decisions         1 decision        4 commitments  ││
│  │  🟢 healthy          🟢 healthy        🔴 overloaded  ││
│  │                                                       ││
│  │  🤖 Nova-Sales       🤖 Atlas-Code                    ││
│  │  Sales AI Agent      Coding AI Agent                  ││
│  │  ⬡ supervised        ⬡ autonomous                    ││
│  │  3 active tasks      2 active tasks                   ││
│  │  🟡 review_required  🟢 trusted                       ││
│  └───────────────────────────────────────────────────────┘│
│                                                           │
│  Clicking a person card expands to show:                  │
│  ┌─ Sarah Chen ──────────────────────────────────────────┐│
│  │ Role: VP Sales, North America                         ││
│  │ Cognitive Load: ██████░░ 65%                          ││
│  │ Active Commitments: 3                                 ││
│  │ Pending Decisions: 2                                  ││
│  │ Connected to: 8 people, 2 AI agents, 4 teams         ││
│  │ Open Alerts: 1 (pricing contradiction)                ││
│  │                                                       ││
│  │ [Generate Briefing] [View on Graph] [See Assignments] ││
│  └───────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

**Key implementation details**:
- Load all nodes where `type === 'person'` or `type === 'agent'` from `/api/graph`
- "Attention Required" section auto-computes: cognitive_load > 0.8, nodes with health=red/orange
- "Analyze" button calls `POST /api/workers/analyze` → shows AI-generated insights
- Group by division (from node.division field)
- Person cards show: name, role (from extras), cognitive_load bar, commitment count, health dot
- Agent cards show: name, agent_type, trust_level (hexagon icon for agents), active_tasks count
- Clicking a card expands inline (like AlertsView)
- "Generate Briefing" navigates to `/briefing?person=X`
- "View on Graph" navigates to `/pulse?highlight=X`

**Backend integration**:
- Person/agent data: from `GET /api/graph` (filter nodes)
- Worker analysis: `POST /api/workers/analyze`
- Individual assignments: `GET /api/workers/{id}/assignments`

---

## P2 — Nice to Have

### 6. Notification Center (Slide-out Panel)

**Why**: Demonstrates intelligent routing — "NEXUS decided you need to see this." Shows the AI
acting proactively rather than reactively.

**File**: `nexus-ui/src/components/NotificationPanel.tsx`

**Trigger**: Bell icon in TopBar with unread count badge

**Layout** (slides in from right):
```
┌────────────────────────────────┐
│  📬 Routed to You          [×] │
│                                 │
│  NEXUS determined these need    │
│  your attention:                │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ⚡ HIGH PRIORITY          │   │
│  │ Pricing contradiction    │   │
│  │ affects your Q2 forecast │   │
│  │ Source: Immune System    │   │
│  │ [Acknowledge] [View]    │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 📋 MEDIUM                │   │
│  │ Atlas-Code team switched │   │
│  │ to GraphQL (affects docs)│   │
│  │ [Acknowledge] [View]    │   │
│  └─────────────────────────┘   │
└────────────────────────────────┘
```

**Backend**: `GET /api/routing/pending?person_id=X`, `POST /api/routing/acknowledge`

---

### 7. Task Graph View

**Why**: Shows organizational task dependencies and critical path — demonstrates "the AI
understands dependencies" from the challenge.

**Route**: `/tasks`

**File**: `nexus-ui/src/views/TasksView.tsx`

**Layout**: A DAG visualization (could use react-flow or a simple vertical timeline) showing
tasks with dependencies, owners, and a highlighted critical path.

**Backend**: `POST /api/tasks/generate`, `GET /api/tasks/current`, `GET /api/tasks/critical-path`

---

### 8. LLM Usage Overlay

**Why**: Light polish — shows token usage and cost transparency in the TopBar. Demonstrates
awareness of AI costs and resource management.

**File**: Modify `nexus-ui/src/components/layout/TopBar.tsx`

**Addition**: Small badge showing "42 LLM calls | $0.03" from `GET /api/llm/usage`

---

## Navigation Changes

### Updated Sidebar (6 items)

```typescript
const navItems = [
  { path: '/pulse',     icon: Activity,       label: 'Pulse' },
  { path: '/briefing',  icon: FileText,       label: 'Briefing' },
  { path: '/alerts',    icon: AlertTriangle,  label: 'Alerts' },
  { path: '/people',    icon: Users,          label: 'People' },
  { path: '/ask',       icon: MessageSquare,  label: 'Ask NEXUS' },
  { path: '/decisions', icon: GitBranch,      label: 'Decisions' },
]
```

### Global Command Bar Trigger
- Cmd+K (or Ctrl+K) from anywhere
- Also triggered by clicking a search icon in TopBar
- The Command Bar replaces the need to navigate to Ask NEXUS for simple queries

---

## Bugfix (Required Before Build)

**DemoView.tsx line 774**: Change `.map((s, i)` → `.map((_, i)` — unused variable blocks
`npm run build`.

---

## Implementation Order

### Phase 1: Foundation (30 min)
1. Fix DemoView.tsx build error
2. Create `useVoiceInput.ts` hook (Web Speech API wrapper)
3. Add new routes to `App.tsx` (`/briefing`, `/people`)
4. Update `Sidebar.tsx` with new nav items

### Phase 2: Command Bar (1.5h)
1. Build `CommandBar.tsx` — modal overlay with input + quick actions
2. Add intent classification (keyword matching for routing)
3. Wire streaming responses from `/api/ask`
4. Add visible "Routing" reasoning box
5. Integrate `useVoiceInput` — mic button in command bar
6. Add Cmd+K keyboard shortcut listener in `App.tsx`

### Phase 3: Briefing View (1.5h)
1. Build `BriefingView.tsx` — person selector + streamed briefing sections
2. Build static fallback (construct briefing from graph data, no LLM needed)
3. Add action buttons per section (Resolve, View on Graph, etc.)
4. Add cognitive load visualization using existing `CognitiveLoadBar`

### Phase 4: Immune Scan Enhancement (1h)
1. Add "Run Scan" button + agent progress panel to `AlertsView.tsx`
2. Wire to `POST /api/immune/scan` with staggered completion animation
3. Merge new alerts into existing list with "NEW" badges

### Phase 5: People View (1.5h)
1. Build `PeopleView.tsx` — filter tabs + person/agent cards grouped by division
2. "Attention Required" auto-computed section at top
3. Expandable card detail with actions
4. Wire "Analyze" button to `POST /api/workers/analyze`

### Phase 6: Polish (30 min)
1. Notification bell in TopBar (if time)
2. LLM usage badge in TopBar
3. Test full demo flow end-to-end

---

## Demo Script (3 minutes)

With these additions, the demo flow becomes:

1. **Open on DemoView** (0:00-0:30) — "This is Meridian Technologies' organizational nervous
   system. 87 people, agents, decisions, and knowledge units. Watch how information flows."
   Click "Show Contradiction" → click "What Changed Today?"

2. **Cmd+K → Voice** (0:30-1:00) — Press Cmd+K. Click mic. Say: "What changed today?"
   NEXUS shows routing reasoning, then streams the answer. "Three things need attention."
   Click on the pricing contradiction action button → navigates to Alerts.

3. **Immune Scan** (1:00-1:30) — On Alerts view, click "Run Scan." Watch 6 AI agents
   analyze the organization in parallel. Agents complete one by one. New alerts appear.
   "NEXUS continuously monitors for contradictions, staleness, silos, and overload."

4. **Briefing** (1:30-2:00) — Navigate to Briefing. Select Sarah Chen.
   Briefing streams in: attention items, changes, open decisions, cognitive load.
   "Every person gets a personalized morning briefing, generated by AI from the live
   knowledge graph."

5. **People View** (2:00-2:20) — Navigate to People. Point out Catherine Moore at 88%
   load. "NEXUS proactively detects overloaded team members before burnout happens."
   Click "Generate Briefing" → shows her view.

6. **Pulse View** (2:20-2:50) — Navigate to Pulse. Show the full graph. "This is the
   living knowledge graph. Every node persists in Supabase. Changes propagate in real-time
   via WebSocket subscriptions. Drop new information..." → use InfoDrop.

7. **Close** (2:50-3:00) — "NEXUS is the company's memory, filter, coordinator, and
   Chief of Staff. Not more communication — better communication."

---

## Technical Notes

### Voice Input (Web Speech API)
- Built into Chrome, Edge, Safari — no API key needed
- `SpeechRecognition` API provides real-time transcription
- Fallback: If browser doesn't support it, hide the mic button gracefully
- No backend changes needed — voice transcript becomes text input

### Command Bar Intent Classification (Client-side)
Simple keyword matching is sufficient for demo. No LLM call needed for routing:
```typescript
const INTENTS = [
  { keywords: ['scan', 'immune', 'check health'], action: 'immune_scan' },
  { keywords: ['brief', 'morning', 'what changed', 'update'], action: 'briefing' },
  { keywords: ['overload', 'workforce', 'who is', 'cognitive'], action: 'workers' },
  { keywords: ['task', 'critical path', 'schedule'], action: 'tasks' },
]
// Default: fall through to /api/ask for general natural language queries
```

### Streaming Responses
All LLM-backed endpoints already support SSE streaming. The Command Bar and Briefing View
should use the existing `streamPost()` utility from `lib/sse.ts`.

### Static Fallbacks (No LLM Required)
Every new view must work without the OpenAI API key (demo safety):
- **Briefing**: Construct from graph data (person's edges, connected alerts, decisions)
- **Immune Scan**: Return the 7 pre-seeded alerts as "scan results"
- **Worker Analysis**: Compute from node cognitive_load and active_commitments fields
- **Command Bar**: Route to cached Ask responses or static graph queries
