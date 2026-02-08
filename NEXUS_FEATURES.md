# NEXUS — Comprehensive Feature Documentation

**Product**: NEXUS — Organizational Nervous System for Hybrid Human + AI Workforces
**Demo Company**: Meridian Technologies (4 divisions, 20 people, 4 AI agents)
**Stack**: React 19 + TypeScript + Tailwind (frontend) | FastAPI + Python (backend)
**Hackathon**: Hack-Nation MIT x OpenAI, February 7–8, 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Demo View — Cinematic Presentation](#3-demo-view--cinematic-presentation)
4. [Pulse View — Knowledge Graph Explorer](#4-pulse-view--knowledge-graph-explorer)
5. [Alerts View — Immune System Dashboard](#5-alerts-view--immune-system-dashboard)
6. [Ask NEXUS — Natural Language Query Interface](#6-ask-nexus--natural-language-query-interface)
7. [Decision Explorer — Decision Archaeology](#7-decision-explorer--decision-archaeology)
8. [Shared UI Components](#8-shared-ui-components)
9. [Backend API Reference](#9-backend-api-reference)
10. [Data Model & Schema](#10-data-model--schema)
11. [Data Pipeline](#11-data-pipeline)
12. [Visual Design System](#12-visual-design-system)
13. [Animation Systems](#13-animation-systems)
14. [Resilience & Demo Mode](#14-resilience--demo-mode)
15. [Tech Stack & Dependencies](#15-tech-stack--dependencies)
16. [File Structure](#16-file-structure)
17. [Running the Application](#17-running-the-application)

---

## 1. System Overview

NEXUS treats an organization as a living organism. Every person, AI agent, decision, fact, commitment, and open question is a node in a knowledge graph. Relationships between them are edges — communication channels, ownership, delegation, dependency, contradiction.

Six "immune system" agents continuously monitor the graph for anomalies:

| Agent | What It Detects |
|-------|-----------------|
| **Contradiction Agent** | Two nodes claiming conflicting facts (e.g., two different prices quoted to the same client) |
| **Staleness Agent** | Knowledge units whose freshness has decayed below threshold (half-life model) |
| **Silo Agent** | Divisions with high code/work overlap but near-zero communication edges |
| **Overload Agent** | People or agents whose cognitive load exceeds 80% capacity |
| **Coordination Agent** | Human-AI trust breakdowns — agents operating with `review_required` trust level |
| **Drift Agent** | AI agents producing work based on superseded context (e.g., using deprecated APIs) |

The system surfaces these anomalies as prioritized alerts and provides tools to trace their origins through decision chains, understand downstream impact, and resolve them.

---

## 2. Architecture

### Data Flow

```
Data Sources (Slack, Email, Jira, GitHub, Calendars)
       ↓
  Sensory System (entity/relationship extraction)
       ↓
  Knowledge Graph (nodes + edges + metadata)
       ↓
  Immune System (6 anomaly-detection agents)
       ↓
  Cortex / UI (5 views — Demo, Pulse, Alerts, Ask, Decisions)
       ↓
  Feedback Loop (thumbs up/down, InfoDrop → back to graph)
```

### Frontend Architecture

```
App.tsx (React Router)
├── /demo    → DemoView (full-screen, no layout, self-contained)
├── /pulse   → Layout + PulseView (force-directed graph)
├── /alerts  → Layout + AlertsView (immune system dashboard)
├── /ask     → Layout + AskNexusView (natural language query)
├── /decisions → Layout + DecisionExplorerView (archaeology)
└── /*       → Redirect to /demo
```

### Backend Architecture

```
main.py (FastAPI)
├── /api/graph          → graph.py router
├── /api/alerts         → alerts.py router
├── /api/ask            → ask.py router
├── /api/decisions      → decisions.py router
├── /api/info           → info.py router
└── /api/feedback       → feedback.py router

Services:
├── graph_store.py   → JSON file loading + caching
├── rag.py           → Cache matching + keyword fallback
├── archaeology.py   → BFS decision chain traversal
└── agents.py        → 5 immune system anomaly detectors
```

---

## 3. Demo View — Cinematic Presentation

**Route**: `/demo`
**File**: `nexus-ui/src/views/DemoView.tsx`
**Purpose**: Full-screen cinematic visualization for live presentations. Runs entirely standalone with zero API calls — all data is embedded directly in the component.

### 3.1 Canvas Visualization

The entire visualization is rendered on a single HTML5 `<canvas>` element using `requestAnimationFrame` for 60fps animation. No external graph library is used.

**24 Nodes** arranged in 4 division clusters:
- **Headquarters** (top center, red `#ff6b6b`): Alex Reeves (CEO), Catherine Moore (CSO), Robert Daniels (CFO), Nina Volkov (General Counsel)
- **North America** (left, cyan `#4ecdc4`): Marcus Rivera (VP Eng), Priya Sharma (Sr. Backend), James Liu (Staff Eng), Anika Patel (Eng Mgr), David Kim (Head of Product), Sarah Chen (VP Sales), Tom Bradley (Account Exec), Maria Santos (VP Customer Success)
- **EMEA** (right, yellow `#ffe66d`): Henrik Johansson (EMEA Eng Lead), Elena Kowalski (Sr. Eng), Omar Hassan (Backend Dev), Sophie Dubois (EMEA Ops Mgr), Lars Mueller (EMEA Sales Dir)
- **Asia-Pacific** (bottom, green `#a8e6cf`): Yuki Tanaka (APAC Eng Lead), Wei Zhang (Growth Lead)
- **AI Agents** (placed within their divisions):
  - Atlas-Code (Coding Agent, NA)
  - Iris-Research (Research Agent, HQ)
  - Sentinel-Compliance (Compliance Agent, HQ)
  - Nova-Sales (Sales Agent, NA)

**34 Connections** representing communication pathways, reporting lines, delegation chains, and cross-division bridges. Edge weight (0.0–1.0) determines visual thickness and particle count.

**Visual Encoding**:
- **Circles** = Human employees (radius scales with cognitive load)
- **Hexagons** = AI agents (drawn via 6-point polygon rotation)
- **Division color** determines the base color of each node
- **Radial gradient glow** surrounds each node (outer glow radius = 3.5x node radius)
- **Node labels** show the person's last name below the node; full name + role on hover
- **Division labels** appear as faint uppercase text above each cluster

### 3.2 Animation Systems

All animations run on every `requestAnimationFrame` tick (~16ms):

**Heartbeat Pulse**: A global sinusoidal oscillation applied to all elements:
```
hb = sin(time * 1.2) * 0.12 + 0.88    // Oscillates between 0.76 and 1.0
```
This creates a subtle "breathing" effect across the entire canvas.

**Node Pulse**: Each node has a random `pulsePhase` offset:
```
pulse = sin(time * 2 + node.pulsePhase) * 0.2 + 0.8    // Node radius oscillates ±20%
```

**Gentle Drift**: Nodes float slightly around their base positions:
```
x = baseX + sin(time * 0.5 + pulsePhase) * 5    // ±5 pixel horizontal drift
y = baseY + cos(time * 0.4 + pulsePhase * 1.3) * 4    // ±4 pixel vertical drift
```

**Particle Flow**: Each connection spawns `floor(weight * 4) + 1` particles that travel along the edge:
- Particles start at random progress (0–1) along the edge
- Speed: 0.001–0.004 per frame
- AI connections use cyan `#06b6d4` particles; human connections use division color
- Particles have a glow core (3x size, 12% opacity) and a bright core
- When a particle reaches `progress > 1`, it resets to 0 (infinite loop)

**Trail Effect**: Instead of clearing the canvas each frame, the background is drawn with alpha:
```
ctx.fillStyle = 'rgba(8, 10, 18, 0.12)'    // 12% opacity dark overlay per frame
```
This creates a smooth trail/fade effect rather than hard frame clearing.

### 3.3 Interactive Demo Buttons

Six glass-morphism buttons at the bottom of the screen:

#### Button 1: Show Contradiction (Red Dot)
**What happens**:
1. All other overlays reset
2. The edges between Sarah Chen ↔ Nova-Sales and Sarah Chen ↔ Tom Bradley pulse red:
   ```
   strokeStyle = rgba(255, 50, 50, 0.6 * heartbeat)
   lineWidth = 2.5
   ```
3. The nodes for Sarah Chen and Nova-Sales get pulsing red borders:
   ```
   strokeStyle = rgba(255, 50, 50, 0.5 + sin(time * 4) * 0.5)    // Fast 4Hz pulse
   ```
4. A **Contradiction Panel** slides in from the left (width: 360px):
   - Red pulsing dot + "CONTRADICTION DETECTED" header
   - Title: "Conflicting Pricing Sent to Acme Corp"
   - **Human — Sarah Chen** card (red border): "VP Sarah Chen verbally committed $20/seat to Acme Corp (500 seats, $120K ARR)" — Source: Client Call, Feb 3
   - Lightning bolt separator
   - **AI Agent — Nova-Sales** card (cyan border): "Nova-Sales sent automated proposal at $15/seat using outdated Q3 pricing sheet" — Source: Auto-Proposal, Feb 7 09:30
   - **Downstream Impact** section (red left borders):
     - Acme Corp enterprise deal ($120K ARR)
     - SEC quarterly filing accuracy
     - Nova-Sales pricing database audit
   - **Resolution**: Sarah Chen (VP Sales) — must contact Acme Corp to confirm $20/seat

#### Button 2: Show Silo (Yellow Dot)
**What happens**:
1. All overlays reset
2. The canvas draws a **dashed yellow line** between the centroid of NA human nodes and EMEA human nodes:
   ```
   ctx.setLineDash([8, 8])
   strokeStyle = rgba(255, 200, 50, 0.6 + sin(time * 3) * 0.3)    // Pulsing 3Hz
   ```
3. Floating label at the midpoint of the dashed line:
   - "83% CODE OVERLAP · 0 COMMUNICATION"
   - "SILO DETECTED"

**The Story**: NA Payments and EMEA Billing teams independently built nearly identical retry logic for failed transactions. 83% code overlap but zero direct communication channels between the teams. ~$45K in duplicated engineering effort.

#### Button 3: Decision Ripple (Teal Ring)
**What happens**:
1. A ripple animation triggers from Alex Reeves (CEO, id: `person-19`)
2. Three concentric rings expand outward from the CEO node:
   ```
   for i in 0..3:
       radius = ((time * 0.8 + i) % 3) * 120    // 120 units per ring interval
       alpha = max(0, 1 - radius / 360)          // Fade as radius grows
   ```
3. Rings are drawn with cyan stroke `rgba(78, 205, 196, alpha * 0.5)`, lineWidth 2
4. The ripple auto-stops after 6 seconds

**The Story**: Demonstrates how a CEO-level decision ripples through the entire organization, reaching every division and every person/agent.

#### Button 4: What Changed Today? (Lightning Bolt)
**What happens**:
1. All overlays reset
2. Contradiction overlay activates (red edges + nodes)
3. Silo overlay activates (dashed yellow line)
4. A **Briefing Panel** slides in from the right (width: 380px):
   - Circle icon with lightning bolt + "What changed today?" header
   - Timer showing elapsed seconds (0–45s)
   - **Typewriter text** that reveals 2 characters every 18ms:

     > Three things need your attention.
     >
     > First — a critical contradiction. Sarah Chen quoted Acme Corp $20 per seat, but Nova-Sales sent them $15 per seat three hours later using an outdated pricing sheet. The customer now has two conflicting proposals. $30K in annual revenue at stake. This needs resolution today.
     >
     > Second — a knowledge silo. NA Payments and EMEA Billing both independently built retry logic for failed transactions. 83% code overlap, zero communication between the teams. That's roughly $45K in duplicated engineering effort.
     >
     > Third — strategic drift. Atlas-Code is still generating REST v3 code, but the Payments team switched to GraphQL two days ago. Every commit Atlas-Code makes is technical debt. Its context needs to be updated immediately.

   - A blinking cyan cursor follows the text as it types
   - When typing completes, two action buttons appear:
     - "Resolve Contradiction →"
     - "Update Atlas-Code →"

#### Button 5: New Joiner — Time Machine Onboarding (Teal Circle)
**What happens**:
1. All overlays reset
2. A centered **Onboarding Modal** (520px wide) appears with blur backdrop
3. Header: "TIME MACHINE · ONBOARDING" / "Welcome to NA Engineering"
4. A 5-segment progress bar tracks current step
5. Previous/Next navigation buttons with step counter (e.g., "2 / 5")

**Step 1 — The World You're Joining**:
- Prose paragraph explaining: NA Engineering team (8 people + 2 AI agents), led by Marcus Rivera. Communicates heavily with EMEA Engineering and HQ Strategy. Current cognitive load is elevated due to major API architecture decision.
- Team Health card grid:
  - 9 Active Commitments
  - 2 AI Agents
  - 58% Avg Cognitive Load

**Step 2 — 5 Decisions That Shape Your Work**:
- Vertical timeline with dates and descriptions:
  - Feb 7: Billing API switched from REST v3 to GraphQL
  - Feb 3: Enterprise pricing raised to $20/seat
  - Jan 28: APAC market entry timeline finalized
  - Jan 20: EMEA headcount expanded by 3 engineers
  - Jan 15: Unified data platform migration approved

**Step 3 — People & AI Agents You Need to Know**:
- 2x3 card grid with name, role, and relevance:
  - Marcus Rivera — VP Engineering, your team lead
  - Priya Sharma — Sr. Backend Engineer, closest collaborator
  - Atlas-Code (AI) — Coding Agent, needs context updates
  - Sarah Chen — VP Sales, drives client requirements
  - Nova-Sales (AI) — Sales Agent, uses your pricing data
  - Henrik Johansson — EMEA Eng Lead, cross-division dependency

**Step 4 — Open Tensions & Unresolved Issues**:
- Three alert cards with severity coloring:
  - **Critical** (red): Nova-Sales sent conflicting pricing to Acme Corp ($20 vs $15, $30K ARR)
  - **Warning** (yellow): Atlas-Code building on superseded REST v3 spec
  - **Note** (subtle): NA Payments & EMEA Billing duplicate retry logic (83% overlap)

**Step 5 — What's Expected of You**:
- Three objective cards with your specific role:
  - Complete GraphQL API migration by March 1 → You own the payments endpoint
  - Resolve Atlas-Code context staleness → You define the AI context refresh pipeline
  - Prepare for unified data platform migration → You document integration points with EMEA
- "Estimated time to full context: **5 minutes** (vs. industry average: 3–6 months)"

#### Button 6: Reset (Refresh Arrow)
Clears all overlays, panels, and selections. Returns to the default state.

### 3.4 Node Detail Panel

Clicking any node on the canvas opens a slide-in panel on the right (300px wide):
- **Name** (large, white) with AI badge if applicable
- **Role** (smaller, gray)
- **Division badge** (colored pill matching division)
- **Cognitive Load bar**: 0–100% with color coding:
  - Cyan `#4ecdc4` for < 60%
  - Yellow `#ffe66d` for 60–80%
  - Red `#ff6b6b` for > 80%
- **Commitments** count (large number)
- **Bus Factor** score (large number, red if > 6)
- **Single Point of Failure warning** (if bus score > 6):
  > "If unavailable for 48h, {N} active workstreams would stall."

### 3.5 Top Bar

- Left: Pulsing cyan dot + "NEXUS" in JetBrains Mono + "ORGANIZATIONAL NERVOUS SYSTEM" subtitle
- Right: Stats in monospace font:
  - 24 NODES
  - 34 PATHWAYS
  - 4 AI AGENTS
  - 7 ALERTS (red)
  - 2 STALE (yellow)

---

## 4. Pulse View — Knowledge Graph Explorer

**Route**: `/pulse`
**File**: `nexus-ui/src/views/PulseView/PulseView.tsx`
**Purpose**: Interactive force-directed graph visualization of the full organizational knowledge graph.

### 4.1 Graph Rendering

Uses `react-force-graph-2d` (Canvas-based) with custom node rendering:

**Node Shapes by Type**:
| Type | Shape | Color Source |
|------|-------|-------------|
| `person` | Circle | Health color (green/yellow/orange/red based on cognitive load) |
| `agent` | Hexagon | Cyan `#06B6D4` with bright edge `#22D3EE` |
| `team` | Small circle with border | Health color at 50% opacity |
| `decision`, `fact`, `commitment`, `question`, `topic` | Diamond | Health color at 70% opacity |

Each node has:
- **Multi-layer glow**: 2-3 concentric transparent fills (outer glow → inner glow → solid core)
- **Highlight rim**: 15% white stroke on people
- **Label**: Drawn below the node in Inter font, opacity adjusts with zoom level

**Edge Rendering**:
- Color by interaction type:
  - `human-human` → White `#FFFFFF`
  - `human-ai` → Cyan `#06B6D4`
  - `ai-ai` → Violet `#8B5CF6`
- Width: `0.5 + weight * 2.5` pixels
- Hover shows edge label in a dark pill tooltip at midpoint

**Force Configuration**:
- Charge strength: -80 (weak, to preserve golden layout)
- Link distance: 100
- Alpha decay: 0.05 (slow settling)
- Velocity decay: 0.3
- Cooldown: 3000ms
- Initial zoom-to-fit after 500ms

### 4.2 Animation Hooks

Three custom React hooks power the animations:

**`usePulseAnimation`** — Sinusoidal breathing effect:
- Global opacity oscillates: `1 - sin(time * 1.2) * 0.015` (subtle 1.5% variation)
- Per-node scale: `1 + sin(time * 2 + phase) * (0.015 + load * 0.015)` (higher load = bigger pulse)
- Per-node glow intensity: `0.6 + sin(time * 1.5 + phase) * 0.4` (oscillates 0.2–1.0)

**`useParticles`** — Dots flowing along edges:
- Each edge spawns 1–5 particles (based on weight)
- Speed: `0.05 + weight * 0.15` units per second
- Color matches interaction type
- Particles render as small circles (radius 1.5, opacity 0.6)

**`useRipple`** — Expanding ring animation (triggered by InfoDrop):
- Creates expanding concentric rings from a source point
- Rings travel at 200 units/second, max radius 500
- Nodes within the ripple radius get a "flash" overlay (matching ring color, fading intensity)
- Each ring has a 0.3px cyan stroke that fades with distance

### 4.3 InfoDrop Widget

**File**: `nexus-ui/src/views/PulseView/InfoDrop.tsx`
**Position**: Bottom-left corner of the Pulse View

A floating textarea where users can drop unstructured text into the knowledge graph:
- 3-row textarea with placeholder "Drop info here..."
- Submit with the button or **Cmd/Ctrl+Enter** keyboard shortcut
- On submit:
  1. Sends text to `POST /api/info`
  2. Backend classifies it as a knowledge type (fact, decision, commitment, question)
  3. Finds related nodes via keyword matching
  4. Creates new edges connecting the new knowledge unit to related nodes
  5. Returns a `ripple_target` node ID
  6. Frontend triggers a ripple animation from that node
  7. Success message: "Classified as '{type}' — ripple sent"

### 4.4 Node Detail Panel

**File**: `nexus-ui/src/components/NodeDetailPanel.tsx`

A slide-in drawer from the right edge (320px wide) with spring animation via Framer Motion. Content varies by node type:

**Person Node**:
- Avatar placeholder + name + role
- Team/Division/Department badges
- Health badge (green/yellow/orange/red)
- Cognitive Load bar (percentage with color)
- Activity section: active commitments, pending decisions
- Related Alerts placeholder

**Agent Node**:
- Bot avatar + name
- Agent type badge: coding/research/operations/customer
- Trust level badge: autonomous (green) / supervised (amber) / review_required (red)
- Supervising human name
- Authority scope description
- Active tasks list (with Zap icons)
- Context freshness indicator (Fresh/Aging/Stale/Expired)

**Knowledge Node** (decision/fact/commitment/question):
- Type badge + Division badge + Status tag
- Content text
- Metadata: source (Human/AI Agent), created date, freshness score, blast radius, half-life
- "View Decision Chain" link (for decision nodes, navigates to `/decisions?id={id}`)
- Feedback widget

**Interactions**:
- Click backdrop or X button to close
- Framer Motion spring animation (damping: 25, stiffness: 300)

---

## 5. Alerts View — Immune System Dashboard

**Route**: `/alerts`
**File**: `nexus-ui/src/views/AlertsView.tsx`
**Purpose**: Filterable, expandable list of all immune system alerts.

### 5.1 Filter System

8 filter tabs along the top:
- **All** — Unresolved alerts (default)
- **Contradictions** — Conflicting facts
- **Staleness** — Decayed knowledge
- **Silos** — Missing communication channels
- **Overload** — High cognitive load
- **Drift** — AI agents using outdated context
- **Coordination** — Human-AI trust breakdowns
- **Resolved** — Previously resolved alerts

### 5.2 Alert Cards

Alerts are grouped by division scope (cross-division first, then NA, EMEA, APAC, HQ). Each card shows:

**Collapsed State**:
- Severity dot (red = critical, amber = warning, blue = info)
- Agent type badge (color-coded: contradiction=red, staleness=amber, silo=violet, overload=orange, drift=cyan, coordination=blue)
- Division scope badge (Globe icon for cross-division, MapPin for regional)
- Relative timestamp (e.g., "3h ago", "just now")
- Headline text

**Expanded State** (click to toggle, Framer Motion animation):
- Full detail paragraph
- Affected Nodes — clickable pills showing node labels (looked up from graph data via nodeMap)
- Estimated Cost — orange highlighted box (e.g., "$30K ARR at risk")
- Resolution section — authority person's name (resolved from ID to label) + required action
- **Resolve button** (green) — calls `POST /api/alerts/{id}/resolve`, marks alert as resolved
- **Trace Decision Chain** button (blue) — navigates to `/decisions?id={affected_node_id}`
- Feedback widget (thumbs up/down)

### 5.3 Demo Alerts (7 Total)

| # | Agent | Severity | Headline | Scope |
|---|-------|----------|----------|-------|
| 1 | Contradiction | Critical | Conflicting pricing sent to Acme Corp ($20 vs $15/seat) | Cross-division |
| 2 | Contradiction | Warning | v2.0 launch date conflict (Mar 15 vs Apr 1) | Cross-division |
| 3 | Staleness | Warning | Atlas-Code using deprecated REST v3 spec | NA |
| 4 | Silo | Warning | NA Payments & EMEA Billing duplicate retry logic (83% overlap) | Cross-division |
| 5 | Overload | Warning | Catherine Moore (CSO) at 88% cognitive load | HQ |
| 6 | Silo | Info | Team communication gap detected | Cross-division |
| 7 | Coordination | Warning | Nova-Sales operating at review_required trust level | NA |

---

## 6. Ask NEXUS — Natural Language Query Interface

**Route**: `/ask`
**File**: `nexus-ui/src/views/AskNexusView.tsx`
**Purpose**: Natural language interface for querying the organizational knowledge graph.

### 6.1 Search Interface

- Centered search bar with Search icon
- Submit on **Enter** key
- 5 suggested query chips (clickable):
  1. "What changed today?"
  2. "Is anything about to go wrong?"
  3. "Why did we switch pricing?"
  4. "Who should be in the payments review?"
  5. "What is Atlas-Code working on?"

### 6.2 Response Format

Each query returns multiple response items displayed as numbered cards:

**Card Layout**:
- Number badge (1, 2, 3...)
- Type badge (contradiction/staleness/silo/overload/drift/answer) with left border color
- Division scope badge
- **Headline** (bold)
- **Detail** paragraph
- Action buttons (navigate to relevant views)
- Feedback widget

**"Highlight on Pulse View" button**: If the response includes `highlight_node_ids`, a prominent button appears that navigates to `/pulse?highlight={ids}` to visually highlight the relevant nodes on the graph.

### 6.3 RAG Engine

**Backend File**: `nexus-api/services/rag.py`

The query pipeline uses a three-tier matching system:

1. **Exact cache match**: Normalize query (lowercase, strip whitespace), check against `ask_cache.json` keys
2. **Fuzzy cache match**: Use `difflib.SequenceMatcher` with ratio threshold > 0.5, plus substring containment check
3. **Keyword fallback**: Strip stop words, score each graph node by keyword overlap, return top 5 as generic "answer" items

### 6.4 Pre-Computed Responses

5 cached query-response pairs in `ask_cache.json`:

- **"what changed today?"** → 3 items (pricing contradiction, silo detection, Atlas-Code drift)
- **"is anything about to go wrong?"** → 3 items (overload warning, stale context, coordination issue)
- **"why did we switch pricing?"** → 2 items (enterprise pricing decision chain, contradiction)
- **"who should be in the payments review?"** → 2 items (key stakeholders, cross-division impact)
- **"what is atlas-code working on?"** → 2 items (active tasks, staleness warning)

---

## 7. Decision Explorer — Decision Archaeology

**Route**: `/decisions`
**File**: `nexus-ui/src/views/DecisionExplorerView.tsx`
**Purpose**: Trace the full chain of a decision — from the original choice through every fact, commitment, and question it generated, and who downstream is affected.

### 7.1 Layout

Two-pane layout:
- **Left pane** (320px, fixed): Decision list
- **Right pane** (flexible): Decision chain timeline

### 7.2 Decision List (Left Pane)

Decisions are categorized:
- **Cross-Division** section (red header) — decisions affecting multiple divisions, sorted by blast_radius (highest first)
- **Per-Division** sections (gray headers, grouped by division name)

Each decision card shows:
- Label (2-line max, truncated)
- Division scope badge
- Created date
- Status tag (active/superseded/resolved)
- Blast radius indicator (orange badge, e.g., "7 blast")

**URL Parameter Support**: Opening `/decisions?id={decision_id}` auto-selects that decision.

### 7.3 Decision Chain Timeline (Right Pane)

A vertical timeline with connecting line and dot markers:

Each chain node shows:
- **Blue dot** on the timeline
- **Knowledge type badge** (decision/fact/commitment/question)
- **Division badge**
- **Freshness indicator** (if available)
- **Date** (with Calendar icon)
- **Label** (bold)
- **Content** (if different from label)
- **Source attribution**: "Source: Human (person-id)" or "Source: AI Agent (agent-id)"
- **Status tag**
- **Feedback widget**

**Relationship labels** appear between chain nodes (e.g., "depends on", "supersedes", "contradicts") as italic pills.

### 7.4 Downstream Impact

Below the chain, a "Downstream Impact" section groups affected nodes by division:
- Each affected node shows label, content (if any), and status tag
- Nodes include people, agents, and teams whose work depends on or is affected by this decision

### 7.5 Chain Traversal Algorithm

**Backend File**: `nexus-api/services/archaeology.py`

Uses **BFS (Breadth-First Search)** starting from the selected decision node:
- Walks through DEPENDS_ON, AFFECTS, BLOCKS, SUPERSEDES, CONTRADICTS, ABOUT edges
- Max depth: 6 hops
- Collects knowledge units (decision/fact/commitment/question) into the `chain`
- Collects people/agents/teams into `downstream_impact`
- Assigns relationship labels based on edge type (e.g., DEPENDS_ON → "depends on", SUPERSEDES → "supersedes")

---

## 8. Shared UI Components

**Directory**: `nexus-ui/src/components/shared/`

### 8.1 CognitiveLoadBar

Horizontal progress bar showing 0–100% cognitive load:
- **Low** (< 40%): Green `#22C55E`
- **Moderate** (40–65%): Amber `#EAB308`
- **High** (65–85%): Orange `#F97316`
- **Critical** (> 85%): Red `#EF4444`

### 8.2 DivisionScopeBadge

Pill-shaped badge with icon:
- **Globe icon** for `cross-division`
- **MapPin icon** for regional (NA, EMEA, APAC, HQ)
- Text shows division name

### 8.3 FeedbackWidget

Two-button feedback system:
- **ThumbsUp** → Shows "Thanks!" confirmation
- **ThumbsDown** → Reveals dropdown with reasons:
  - Incorrect
  - Outdated
  - Irrelevant
  - Missing context
- Submits to `POST /api/feedback`

### 8.4 FreshnessIndicator

Dot + numeric score + label:
- **Fresh** (score >= 1.5): Green dot
- **Aging** (score 0.8–1.5): Amber dot
- **Stale** (score 0.4–0.8): Orange dot
- **Expired** (score < 0.4): Red dot

### 8.5 KnowledgeTypeBadge

Icon + label for knowledge unit types:
- Decision: GitBranch icon
- Fact: FileText icon
- Commitment: Flag icon
- Question: HelpCircle icon

### 8.6 StatusTag

Dot + status label:
- `active` — Green dot
- `superseded` — Gray dot
- `resolved` — Blue dot
- `on-track` — Green dot
- `at-risk` — Amber dot
- `overdue` — Red dot
- `blocked` — Red dot

### 8.7 StatsStrip

Horizontal list of label-value pairs with vertical dividers. Used in the TopBar.

### 8.8 Breadcrumb

Hierarchical navigation with Home icon + chevron separators.

---

## 9. Backend API Reference

**Base URL**: `http://localhost:8000`

### 9.1 Graph Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/graph` | Returns full graph (all nodes + edges + metadata) |
| `GET` | `/api/graph/hierarchy` | Returns semantic zoom hierarchy (enterprise → divisions → departments → teams) |
| `GET` | `/api/graph/node/{id}` | Returns a single node + its edges + connected nodes |

### 9.2 Alerts Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/alerts` | Returns all alerts (with in-memory resolved state) |
| `POST` | `/api/alerts/{id}/resolve` | Marks an alert as resolved, returns updated alert + affected node list |

### 9.3 Ask Endpoint

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/ask` | `{ "query": "..." }` | Runs RAG pipeline: cache match → fuzzy match → keyword fallback. Returns `{ items, highlight_node_ids }` |

### 9.4 Decisions Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/decisions` | Returns decisions split into `cross_division` and `by_division` groups |
| `GET` | `/api/decisions/{id}/chain` | BFS traversal returning `{ chain, downstream_impact }` |

### 9.5 Info Endpoint

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/info` | `{ "text": "..." }` | Creates new knowledge unit (fact by default), finds related nodes via keyword matching, creates ABOUT edges, returns `{ unit, new_edges, ripple_target }` |

### 9.6 Feedback Endpoint

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/feedback` | `{ "node_id": "...", "useful": true/false, "reason": "..." }` | Records feedback (demo stub, returns `{ acknowledged: true }`) |

### 9.7 Root Endpoint

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Returns `{ name: "NEXUS API", version: "1.0.0", demo_mode: true }` |

---

## 10. Data Model & Schema

**File**: `nexus-ui/src/types/graph.ts`

### 10.1 Node Types (8)

| Type | Count (demo) | Description |
|------|-------------|-------------|
| `person` | 20 | Human employees with cognitive load, commitments, pending decisions |
| `agent` | 4 | AI agents with trust level, supervising human, active tasks, authority scope |
| `team` | 20 | Organizational teams |
| `decision` | ~10 | Strategic choices with blast radius, freshness, status |
| `fact` | ~15 | Verified knowledge units |
| `commitment` | ~10 | Promises and obligations |
| `question` | ~5 | Unresolved inquiries |
| `topic` | ~5 | Thematic clusters |

### 10.2 Node Fields

**Common fields** (all node types):
- `id`: Unique identifier (e.g., `person-1`, `agent-2`, `decision-pricing-enterprise`)
- `type`: One of the 8 types above
- `label`: Display name
- `division`: HQ, NA, EMEA, APAC
- `department`: Department name
- `team`: Team name
- `health`: Pre-computed visual health (green/yellow/orange/red)
- `size`: Pre-computed visual size
- `x`, `y`: Golden layout coordinates

**Person-specific**:
- `role`: Job title
- `cognitive_load`: 0.0–1.0 (percentage of capacity used)
- `active_commitments`: Number of active commitments
- `pending_decisions`: Number of pending decisions

**Agent-specific**:
- `agent_type`: coding, research, operations, customer
- `trust_level`: autonomous, supervised, review_required
- `supervising_human`: Person ID of the human supervisor
- `active_tasks`: Array of task description strings
- `delegated_authority_scope`: Description of what the agent is authorized to do

**Knowledge unit-specific** (decision/fact/commitment/question):
- `content`: Full text content
- `source_type`: human or ai_agent
- `source_id`: ID of the person or agent who created it
- `created_at`: ISO timestamp
- `freshness_score`: 0.0–2.0+ (decays over time via half-life model)
- `half_life_days`: Number of days for freshness to decay by 50%
- `blast_radius`: 0–10 (number of downstream nodes affected)
- `status`: active, superseded, resolved

### 10.3 Edge Types (20)

| Edge Type | Category | Description |
|-----------|----------|-------------|
| `COMMUNICATES_WITH` | Human-Human | Direct communication channel |
| `REPORTS_TO` | Human-Human | Reporting line |
| `MEMBER_OF` | Human-Team | Team membership |
| `EXPERT_IN` | Human-Knowledge | Subject matter expertise |
| `DELEGATES_TO` | Human-AI | Human delegates authority to AI agent |
| `SUPERVISED_BY` | AI-Human | AI is supervised by human |
| `REVIEWS_OUTPUT_OF` | Human-AI | Human reviews AI's output |
| `CONTEXT_FEEDS` | AI-AI | One AI feeds context to another |
| `HANDOFF` | AI-AI | Task handoff between AI agents |
| `DECIDED_BY` | Knowledge-Human | Decision made by a person |
| `AFFECTS` | Knowledge-* | Knowledge unit affects a node |
| `OWNS` | Human-Knowledge | Human owns a knowledge unit |
| `BLOCKS` | Knowledge-Knowledge | One unit blocks another |
| `DEPENDS_ON` | Knowledge-Knowledge | Dependency relationship |
| `CONTRADICTS` | Knowledge-Knowledge | Two units conflict |
| `SUPERSEDES` | Knowledge-Knowledge | One unit replaces another |
| `ABOUT` | Knowledge-Knowledge | Topical relationship |
| `CAN_ANSWER` | Human/Agent-Knowledge | Node can answer a question |
| `ASSIGNED_TO` | Knowledge-Human/Agent | Task assignment |
| `PRODUCED_BY` | Knowledge-Agent | AI-generated content |

### 10.4 Edge Fields

- `id`: Unique identifier
- `source`: Source node ID
- `target`: Target node ID
- `type`: One of the 20 EdgeTypes
- `weight`: 0.0–1.0 (strength of relationship)
- `interaction_type`: human-human, human-ai, or ai-ai
- `label`: Display text for the edge

---

## 11. Data Pipeline

### 11.1 Generation Script

**File**: `scripts/build_graph.py` (~1700 lines)

This Python script generates all synthetic demo data:

**Step 1 — Company Structure**:
Defines Meridian Technologies with 4 divisions, 12 departments, 20 teams, 20 people, and 4 AI agents. Each person has a role, cognitive load, commitments, and pending decisions.

**Step 2 — Golden Layout**:
Positions nodes on the canvas using division-based clustering:
```
Division Centers:
  HQ:   (0, 200)
  NA:   (-250, -200)
  EMEA: (250, -200)
  APAC: (250, 250)
```
Teams arranged in circles around division centers (radius 120). People positioned in sub-circles around team centers (radius 30–50). Random jitter applied for natural spacing.

**Step 3 — Knowledge Units**:
Generates decisions, facts, commitments, and questions with:
- Content text based on the demo scenario
- Freshness scores (half-life decay model)
- Blast radius calculations
- Source attribution (human or AI)

**Step 4 — Edges**:
Creates 243 edges across all relationship types. Key scenario edges:
- CONTRADICTS edge between the $20/seat and $15/seat pricing facts
- COMMUNICATES_WITH edges within and across divisions
- SUPERSEDES edge from GraphQL decision to REST v3 fact
- DEPENDS_ON chains between related decisions

**Step 5 — Scenarios**:
Hardcodes 5 specific anomaly scenarios:
1. **Acme Corp Pricing Contradiction**: Sarah Chen says $20/seat, Nova-Sales says $15/seat
2. **v2.0 Launch Date Conflict**: NA says March 15, EMEA says April 1
3. **Atlas-Code Staleness**: Still using REST v3, team switched to GraphQL
4. **NA/EMEA Silo**: 83% code overlap in retry logic, 0 communication
5. **CSO Overload**: Catherine Moore at 88% cognitive load

**Step 6 — Output**:
Writes 5 JSON files to `mock_data/` and copies them to `nexus-ui/public/mock_data/`:
- `graph.json` (~87KB) — Full graph with all nodes, edges, metadata
- `hierarchy.json` (~14KB) — Semantic zoom hierarchy
- `alerts.json` (~8KB) — 7 immune system alerts
- `ask_cache.json` (~16KB) — 5 pre-computed query-response pairs
- `company_structure.json` (~1.7KB) — Raw organizational structure

### 11.2 Health Computation

Health color is derived from cognitive load:
```
load < 40%  → green
load < 65%  → yellow
load < 85%  → orange
load >= 85% → red
```

Team health = worst health among team members.

---

## 12. Visual Design System

### 12.1 Color Palette

**Division Colors**:
| Division | Color | Hex |
|----------|-------|-----|
| HQ | Red | `#ff6b6b` |
| NA | Cyan | `#4ecdc4` |
| EMEA | Yellow | `#ffe66d` |
| APAC | Mint Green | `#a8e6cf` |

**Semantic Colors** (Tailwind custom tokens):
| Token | Color | Usage |
|-------|-------|-------|
| `accent-blue` | `#3B82F6` | Primary actions, selected states, info severity |
| `accent-green` | `#22C55E` | Success, resolve, healthy |
| `accent-amber` | `#EAB308` | Warning severity, staleness |
| `accent-orange` | `#F97316` | Estimated costs, overload |
| `accent-red` | `#EF4444` | Critical severity, contradictions |
| `agent-cyan` | `#06B6D4` | AI agents, drift |
| `agent-violet` | `#8B5CF6` | Silo detection, AI-AI interactions |

**Interaction Type Colors** (Canvas):
| Type | Color |
|------|-------|
| human-human | White `#FFFFFF` |
| human-ai | Cyan `#06B6D4` |
| ai-ai | Violet `#8B5CF6` |

**Background Colors**:
| Element | Color |
|---------|-------|
| Canvas/Main background | `#0F1419` |
| Demo background | `#080a12` |
| Sidebar | `bg-sidebar` (Tailwind) |
| Cards | `bg-cards` (Tailwind) |

### 12.2 Typography

| Font | Usage |
|------|-------|
| **Inter** (system-ui fallback) | All body text, labels, buttons |
| **JetBrains Mono** / **Space Mono** | Stats, IDs, monospace displays, NEXUS branding |

### 12.3 Glass-Morphism Panels

All floating panels in the Demo View use:
```css
background: rgba(15, 17, 28, 0.95)
border-radius: 16px
border: 1px solid rgba(255, 255, 255, 0.08)
backdrop-filter: blur(40px)
```

---

## 13. Animation Systems

### 13.1 Demo View Canvas Animations

| Animation | Frequency | Math | Effect |
|-----------|-----------|------|--------|
| Heartbeat | 1.2 Hz | `sin(t * 1.2) * 0.12 + 0.88` | Global brightness pulse |
| Node pulse | 2 Hz (per node) | `sin(t * 2 + phase) * 0.2 + 0.8` | Node radius breathes |
| Node drift | 0.5/0.4 Hz | `sin(t * 0.5 + phase) * 5` | Gentle floating motion |
| Particle flow | Continuous | `progress += 0.001–0.004` | Dots travel along edges |
| Contradiction border | 4 Hz | `sin(t * 4) * 0.5 + 0.5` | Fast red pulsing |
| Silo line | 3 Hz | `sin(t * 3) * 0.3 + 0.6` | Dashed line opacity pulse |
| Agent edge | 3 Hz | `sin(t * 3) * 0.3 + 0.5` | Cyan border shimmer |
| Ripple rings | 0.8 Hz cycle | `(t * 0.8 + i) % 3 * 120` | Expanding concentric circles |
| Typewriter | ~111 char/sec | 2 chars per 18ms interval | Text revelation |
| Cursor blink | 1 Hz | CSS `@keyframes` | Blinking cursor after text |
| Pulse dot | 0.5 Hz | CSS `@keyframes` | Status indicator pulsing |

### 13.2 Pulse View Animations (via Hooks)

| Hook | Effect | Details |
|------|--------|---------|
| `usePulseAnimation` | Breathing nodes | Scale ±1.5–3% at 2Hz, glow 0.2–1.0 at 1.5Hz |
| `useParticles` | Edge flow | 1–5 particles per edge, speed based on weight |
| `useRipple` | InfoDrop ripple | Expanding rings at 200 units/sec, node flash on reach |

### 13.3 UI Animations (Framer Motion)

| Component | Animation | Config |
|-----------|-----------|--------|
| Alert cards | Expand/collapse | height: 0→auto, opacity: 0→1, 250ms ease |
| Alert card entrance | Slide up | y: 8→0, opacity: 0→1, 200ms |
| NodeDetailPanel | Slide in from right | Spring (damping: 25, stiffness: 300) |
| Loading dots | Staggered pulse | 3 dots, 200ms stagger, CSS pulse animation |
| Filter tab active | Background color | transition-all 200ms |

---

## 14. Resilience & Demo Mode

### 14.1 Frontend Fallback

**File**: `nexus-ui/src/lib/api.ts`

Every API call uses `fetchWithFallback()`:
1. Attempt to fetch from `http://localhost:8000{path}` with 3-second timeout
2. If the request fails (timeout, network error, HTTP error), fall back to loading from `{path}.json` in `public/mock_data/`

This means the **frontend works completely without the backend running** — it just loads the static JSON files directly.

### 14.2 Backend Demo Mode

**File**: `nexus-api/main.py`

Environment variable `NEXUS_DEMO_MODE` (default: `true`) controls demo mode. In demo mode, all data comes from pre-generated JSON files.

### 14.3 Demo View Isolation

The Demo View (`/demo`) is entirely self-contained:
- Zero API calls
- All data (24 nodes, 34 connections, contradiction, briefing, onboarding) is hardcoded in the component
- No dependency on backend or mock data files
- Works even if no servers are running (just open the built HTML)

---

## 15. Tech Stack & Dependencies

### 15.1 Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.2.0 | UI framework |
| `react-dom` | 19.2.0 | DOM rendering |
| `react-router-dom` | 7.13.0 | Client-side routing |
| `framer-motion` | 12.33.0 | Animations (expand/collapse, slide-in, transitions) |
| `react-force-graph-2d` | 1.29.1 | Force-directed graph rendering (Pulse View only) |
| `lucide-react` | 0.563.0 | Icon library (Activity, AlertTriangle, Shield, etc.) |
| `tailwindcss` | 4.1.18 | Utility-first CSS framework |
| `typescript` | 5.x | Type safety |
| `vite` | Latest | Build tool + dev server |

### 15.2 Backend

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | >= 0.128.0 | API framework |
| `uvicorn[standard]` | >= 0.30.0 | ASGI server |
| `networkx` | >= 3.0 | Graph algorithms (not actively used in demo) |
| `openai` | >= 1.0.0 | OpenAI API client (placeholder for production) |
| `numpy` | >= 1.24.0 | Numerical operations |
| `pydantic` | >= 2.0.0 | Data validation |
| `python-dotenv` | >= 1.0.0 | Environment variable loading |

---

## 16. File Structure

```
Hack-Nation-Hackathon/
├── nexus-ui/                          # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── main.tsx                   # React entry point
│   │   ├── App.tsx                    # Router with 5 routes
│   │   ├── views/
│   │   │   ├── DemoView.tsx           # Full-screen cinematic demo (763 lines)
│   │   │   ├── PulseView/
│   │   │   │   ├── PulseView.tsx      # Force-directed graph view
│   │   │   │   ├── InfoDrop.tsx       # Text drop widget
│   │   │   │   └── hooks/
│   │   │   │       ├── usePulseAnimation.ts
│   │   │   │       ├── useParticles.ts
│   │   │   │       ├── useRipple.ts
│   │   │   │       └── useSemanticZoom.ts  # (not currently used)
│   │   │   ├── AlertsView.tsx         # Immune system dashboard
│   │   │   ├── AskNexusView.tsx       # Natural language query
│   │   │   └── DecisionExplorerView.tsx  # Decision archaeology
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.tsx         # Sidebar + TopBar wrapper
│   │   │   │   ├── Sidebar.tsx        # Left navigation
│   │   │   │   └── TopBar.tsx         # Stats bar
│   │   │   ├── shared/
│   │   │   │   ├── index.ts           # Re-exports
│   │   │   │   ├── Breadcrumb.tsx
│   │   │   │   ├── CognitiveLoadBar.tsx
│   │   │   │   ├── DivisionScopeBadge.tsx
│   │   │   │   ├── FeedbackWidget.tsx
│   │   │   │   ├── FreshnessIndicator.tsx
│   │   │   │   ├── KnowledgeTypeBadge.tsx
│   │   │   │   ├── StatsStrip.tsx
│   │   │   │   └── StatusTag.tsx
│   │   │   └── NodeDetailPanel.tsx     # Slide-in node details
│   │   ├── lib/
│   │   │   └── api.ts                 # API client with fallback
│   │   └── types/
│   │       └── graph.ts               # TypeScript type definitions
│   ├── public/
│   │   └── mock_data/                 # Static JSON fallback files
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.ts
│
├── nexus-api/                         # Backend (FastAPI + Python)
│   ├── main.py                        # FastAPI app entry
│   ├── routers/
│   │   ├── graph.py                   # /api/graph endpoints
│   │   ├── alerts.py                  # /api/alerts endpoints
│   │   ├── ask.py                     # /api/ask endpoint
│   │   ├── decisions.py               # /api/decisions endpoints
│   │   ├── info.py                    # /api/info endpoint
│   │   └── feedback.py                # /api/feedback endpoint
│   ├── services/
│   │   ├── graph_store.py             # JSON loader with caching
│   │   ├── rag.py                     # RAG query engine
│   │   ├── archaeology.py             # Decision chain traversal
│   │   └── agents.py                  # Immune system detectors
│   ├── requirements.txt
│   └── venv/                          # Python virtual environment
│
├── scripts/
│   ├── build_graph.py                 # Data generation script (~1700 lines)
│   └── compute_embeddings.py          # Placeholder for vector embeddings
│
├── mock_data/                         # Generated JSON data files
│   ├── graph.json                     # 87 nodes, 243 edges
│   ├── hierarchy.json                 # Semantic zoom hierarchy
│   ├── alerts.json                    # 7 demo alerts
│   ├── ask_cache.json                 # 5 cached query-response pairs
│   └── company_structure.json         # Raw org structure
│
├── Docs/                              # Project documentation
│   ├── IDEATION.md
│   ├── SPECIFICATION.md
│   ├── UI_UX_DESIGN.md
│   ├── DEMO_FEATURES.md
│   ├── AGENTS.md
│   └── NEXUS_Project_Brief_1.md
│
├── start.sh                           # Start both servers
├── setup.sh                           # Install dependencies
└── NEXUS_FEATURES.md                  # This document
```

---

## 17. Running the Application

### Quick Start

```bash
# From the project root:
./start.sh
```

This will:
1. Start the FastAPI backend on `http://localhost:8000`
2. Start the Vite dev server on `http://localhost:5173`

### Manual Start

```bash
# Terminal 1: Backend
cd nexus-api
./venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd nexus-ui
npx vite --port 5173 --host
```

### Setup (First Time)

```bash
# Install all dependencies
./setup.sh

# Generate demo data
python3 scripts/build_graph.py
```

### Access Points

| URL | What |
|-----|------|
| `http://localhost:5173/demo` | Cinematic demo presentation (default) |
| `http://localhost:5173/pulse` | Interactive knowledge graph |
| `http://localhost:5173/alerts` | Immune system alerts dashboard |
| `http://localhost:5173/ask` | Natural language query interface |
| `http://localhost:5173/decisions` | Decision archaeology explorer |
| `http://localhost:8000` | Backend API root |
| `http://localhost:8000/docs` | FastAPI auto-generated Swagger docs |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Frontend views | 5 (Demo, Pulse, Alerts, Ask, Decisions) |
| Frontend components | 17 (8 shared + 5 views + 3 layout + NodeDetailPanel) |
| Custom animation hooks | 3 (pulse, particles, ripple) |
| Backend API endpoints | 8 |
| Backend services | 4 (graph_store, rag, archaeology, agents) |
| Node types | 8 |
| Edge types | 20 |
| Demo nodes | 87 (full graph) / 24 (demo view) |
| Demo edges | 243 (full graph) / 34 (demo view) |
| Demo alerts | 7 |
| Immune system agents | 6 |
| Demo scenarios | 5 |
| Pre-computed queries | 5 |
| Total TypeScript files | ~26 |
| Total Python files | ~11 |
