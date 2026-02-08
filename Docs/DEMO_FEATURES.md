# NEXUS: Demo Features — What Would Be Really Nice to Show

**Goal: 3-minute demo that wins. Every feature below is ranked by impact-to-effort ratio.**

---

## Tier 1: Must-Have Demo Moments (These Win the Hackathon)

### 1. The Pulse View — Living Org Visualization

**Why it's a killer demo feature:** Nothing else in the competition will look like this. The moment you open NEXUS and the audience sees a living, breathing network of nodes pulsing with activity, you've already separated yourself from every team showing a static dashboard.

**What to show specifically:**
- Force-directed graph with nodes clustered by team, gently animating
- Nodes sized by activity level — the VP is large and bright, the on-PTO engineer is small and dim
- **Particle flow on edges** — animated dots flowing along communication paths like blood through veins. High-traffic edges are thick and fast; low-traffic edges are thin trickles. This single visual effect makes the audience gasp
- Color-coded health: green (healthy), yellow (elevated load), orange (immune alert), red (critical)
- A subtle global heartbeat — the whole graph gently pulses in rhythm with communication frequency
- **AI agent hexagons alongside human circles** — instantly communicates the hybrid org thesis without saying a word. Cyan-glowing hexagons for AI agents, warm circles for humans. Three edge colors: white (human-human), cyan (human-AI), violet (AI-AI)

**Why judges will love it:** The challenge says "special emphasis on visualizing agentic AI reasoning and communication flows." This IS that. You can literally watch information flow through the organization.

**Technical feasibility:** react-force-graph-2d handles this well. Particle flow is achievable with canvas animation. 8-12 hours of focused work.

---

### 2. Decision Ripple Animation

**Why it's a killer demo feature:** When a new decision enters the system, an animated ripple expands outward from the decision-maker node, touching every person and AI agent in the `AFFECTS` radius. The ripple color matches the severity. Nodes that get hit by the ripple briefly flash and then update their state.

**What to show specifically:**
- Someone makes a decision (e.g., "Switch payments from Stripe to Adyen")
- A concentric ripple expands from their node
- 6 other nodes light up as the ripple reaches them — these are the affected stakeholders
- 2 AI agent hexagons also light up — they're actively working on code that depends on this decision
- The ripple fades, but the affected nodes now show an orange indicator (they have a new alert)

**Why judges will love it:** This is the "visualizing agentic AI reasoning" moment. The audience watches a decision propagate in real-time. They *see* the blast radius. No other team will have this.

**Technical feasibility:** CSS/canvas animation on the force graph. 3-4 hours on top of the Pulse View.

---

### 3. Human-AI Contradiction Detection (The "Holy Shit" Moment)

**Why it's a killer demo feature:** This is where you sell the hybrid organization thesis. The audience sees NEXUS catch something that no human would notice — a conflict between a human decision and an AI agent's action.

**What to show specifically:**
- Pulse View is running. The Coordination Agent flags a red alert
- Click into it: "VP of Sales told customer Acme Corp the price is $20/seat in a call 2 hours ago. The AI Sales Agent sent Acme an automated proposal at $15/seat this morning based on last quarter's pricing authority."
- NEXUS shows: the contradiction, the customer impact (Acme now has two conflicting quotes), the resolution authority (VP of Sales), and the recommended action (pause AI agent's email capability, draft correction)
- The visual: two nodes (one circle, one hexagon) connected by a red `CONTRADICTS` edge, with the downstream customer node also highlighted

**Why judges will love it:** This is a failure mode that literally didn't exist before 2025. No other team will demo AI-agent-specific organizational intelligence. This is the moment judges lean forward and think "this is real."

**Technical feasibility:** This can be pre-computed/mock data shown in a polished UI. 4-5 hours.

---

### 4. "What Changed Today?" — Voice Briefing

**Why it's a killer demo feature:** The presenter speaks to NEXUS. NEXUS speaks back with a 30-45 second personalized briefing — not a generic summary, but triaged, role-specific, action-oriented. Then the Pulse View animates to show the changes.

**What to show specifically:**
- Presenter: "NEXUS, what changed today?"
- NEXUS (spoken via TTS): "Three things. First, engineering decided to switch payments from Stripe to Adyen — this affects the checkout feature your team owns. Second, a silo has been detected: two teams are building retry logic independently. Third, the AI coding agent working on the billing API is now 4 hours into work based on a superseded API spec — I've paused it and re-contextualized."
- As NEXUS speaks, the Pulse View highlights each relevant area in sequence

**Why judges will love it:** Voice-first interaction is what the challenge describes as "AI Chief of Staff." The combination of voice + visual is powerful and memorable. The mention of the AI agent being paused sells the hybrid coordination story.

**Technical feasibility:** OpenAI Whisper (input) + GPT-4o (reasoning) + TTS (output). Pre-scripted for reliability in demo. 4-6 hours.

---

## Tier 2: High-Impact Differentiators (Build If Time Allows)

### 5. Semantic Zoom — The "Google Maps" Moment

**Why it's impressive:** Start zoomed all the way out showing 5 division-level nodes ("North America," "EMEA," "APAC," etc.). Scroll to zoom in — divisions break into departments, departments break into teams, teams break into people + AI agents. Same interface, same interaction, from 50,000-foot view to individual contributor. Demonstrates enterprise scalability in 10 seconds.

**What to show specifically:**
- Start at L1: 5 large division nodes
- Zoom into "North America" — 8 department nodes appear
- Zoom into "Engineering" — 4 team nodes appear
- Zoom into "Payments Team" — 5 human nodes + 2 AI agent hexagons
- The transition is smooth, animated, and feels like Google Maps

**Why judges will love it:** Instantly communicates "this works at 50,000 people." Most other teams' demos will visually break at 100 nodes.

**Technical feasibility:** Requires hierarchical data structure and LOD (level-of-detail) rendering on the force graph. 6-8 hours. Could simplify to just 2 zoom levels (teams → people) to save time.

---

### 6. Silo Detection — The "Wasted Money" Moment

**Why it's impressive:** Two team clusters on the Pulse View glow orange. NEXUS explains: "These two teams are working on semantically similar problems with zero communication between them. Estimated wasted effort: $20K if uncoordinated."

**What to show specifically:**
- Two clusters highlighted on the Pulse View
- Silo Agent alert card: shows the overlap, the zero communication edges, the estimated waste
- One-click action: "Suggest sync" → a new dotted communication edge appears on the graph
- Dollar value displayed prominently — judges love quantified impact

**Why judges will love it:** Tangible, quantified business value. Shows that NEXUS doesn't just visualize — it acts.

**Technical feasibility:** Pre-computed detection, UI overlay on the Pulse View. 3-4 hours.

---

### 7. Decision Archaeology — The "Time Travel" Moment

**Why it's impressive:** Someone asks "Why do we use Adyen instead of Stripe?" and NEXUS renders an interactive causal chain: the current decision → the triggering facts → the original question → the event that started it all. A new hire understands in 30 seconds what took the org 3 weeks to figure out.

**What to show specifically:**
- A horizontal timeline/chain: 5 linked nodes showing the full decision history
- Each node: decision/fact/question with source, date, who was involved
- Click any node to expand its context
- Visual: clean, minimal, reads left-to-right like a story

**Why judges will love it:** "Git blame for organizational decisions." Powerful concept, clean visualization, directly addresses the Knowledge Graph criterion.

**Technical feasibility:** Timeline component in React. Can use D3 or even a well-styled flexbox. 4-6 hours.

---

### 8. Stale Context Feed — AI Agent Gets Interrupted

**Why it's impressive:** Live on the Pulse View, an AI agent hexagon turns from cyan to orange. NEXUS explains: "This coding agent has been working for 4 hours on an API integration, but the API version decision was changed 3 hours ago. The agent is building against a superseded spec."

**What to show specifically:**
- The hexagon node pulses orange
- Alert: "Stale context detected — Devin-Payments is 4 hours into REST API v3 integration, but the team switched to GraphQL API 3 hours ago"
- One-click: "Re-contextualize agent" → the hexagon flashes, turns back to cyan, and a new `CONTEXT_FEEDS` edge appears showing the updated decision flowing in
- Counter: "Wasted compute saved: ~4 hours"

**Why judges will love it:** This is viscerally relatable to anyone who's worked with AI coding agents. "The AI kept coding the wrong thing because it didn't know the plan changed" is a universal pain point in 2026.

**Technical feasibility:** Pre-computed scenario, animated on the Pulse View. 2-3 hours on top of the existing graph.

---

## Tier 3: Nice-to-Have Polish (Last 2 Hours)

### 9. NEXUS Memory Panel

**Why it's worth showing:** Opens a side panel showing what NEXUS has learned about the user: "Payments and infrastructure are always relevant to you (learned from 14 'useful' signals). You prefer briefings at 7:45am. You corrected 3 contract-value facts this month — NEXUS now routes contract facts to you for validation."

**Impact:** Demonstrates the learning loop. Builds trust. Shows NEXUS is personalized, not generic.

**Effort:** 2-3 hours. Could be a static mock for demo.

---

### 10. Cognitive Load Heatmap

**Why it's worth showing:** Nodes on the Pulse View shift color based on cognitive load in real-time. A person with 6 pending decisions, back-to-back meetings, and 140 messages today glows hot yellow/orange. NEXUS says: "Maria is at 82% cognitive load. Holding back 3 non-critical items until tomorrow."

**Impact:** Shows NEXUS respects human bandwidth. "It doesn't just deliver information — it knows when NOT to."

**Effort:** Color mapping on existing nodes. 1-2 hours.

---

### 11. AI Agent Trust Level Indicator

**Why it's worth showing:** Each AI agent hexagon has a small badge: "Autonomous" (green), "Supervised" (yellow), or "Review Required" (red). Shows at a glance how much human oversight each AI agent needs.

**Impact:** Reinforces the governance angle. Enterprise buyers care about AI oversight.

**Effort:** Badge component on hexagon nodes. 1 hour.

---

### 12. The Onboarding Time Machine (If You Can Spare 30 Demo Seconds)

**Why it's worth showing:** A "new hire" is added. NEXUS generates a personalized onboarding in 5 cards: "The world you're joining" (simplified Pulse View), "5 decisions that shape your work" (timeline), "People + AI agents you need to know," "Open tensions," "What's expected of you."

**Impact:** Emotionally resonant. Everyone remembers being the confused new person. Shows NEXUS compresses months of learning into minutes.

**Effort:** 4-5 hours for a clean implementation. Could be simplified to just the timeline card for 2 hours.

---

## Recommended 3-Minute Demo Flow

| Time | What's on Screen | What Presenter Says | Feature |
|---|---|---|---|
| 0:00-0:20 | Pulse View loads, org pulsing alive. Circles + hexagons visible. | "This is NEXUS. You're looking at a living map of an organization — every human, every AI agent, every flow of information between them." | Pulse View (#1) |
| 0:20-0:50 | Red zone on graph. Click → contradiction alert between human VP and AI agent. | "NEXUS just caught something no human would see. The VP quoted one price, but the AI sales agent sent a different one 3 hours earlier. NEXUS shows the conflict, the customer impact, and the fix." | Human-AI Contradiction (#3) |
| 0:50-1:20 | Voice query. Pulse View animates as NEXUS speaks. | "NEXUS, what changed today?" [NEXUS speaks 30-second briefing, mentioning the AI agent with stale context] | Voice Briefing (#4) |
| 1:20-1:50 | Decision ripple animation. New decision propagates to 6 humans + 2 AI agents. | "Watch what happens when a decision is made. The ripple shows exactly who's affected — humans and AI agents alike." | Decision Ripple (#2) |
| 1:50-2:10 | Silo detection. Two clusters highlighted, dollar value shown. | "Two teams building the same thing independently. $20K of wasted effort — caught in minutes, not months." | Silo Detection (#6) |
| 2:10-2:30 | Zoom out from team → department → division → enterprise. | "And this scales. 50 people or 50,000 — same interface, same intelligence. This is what Google Maps did for geography, applied to organizations." | Semantic Zoom (#5) |
| 2:30-3:00 | Full zoom-out. Circles and hexagons pulsing together. | "Every company is becoming a hybrid organization — humans and AI, side by side. But without a nervous system connecting them, it's chaos. NEXUS is that nervous system." | Moonshot close |

---

## The Three Hooks That Win

1. **Visual hook (first 5 seconds):** The Pulse View is alive. It moves. It breathes. No other team will have this.
2. **Intellectual hook (30 seconds in):** "We're not building for a human-only org. We're building for the hybrid workforce that already exists." The human-AI contradiction catches something no human could.
3. **Emotional hook (closing):** "Every company in the world is becoming this. NEXUS is the infrastructure that makes it work." Zoom out to the full organism — circles and hexagons together.

---

## What NOT to Demo (Common Traps)

- **Don't show the tech stack.** Nobody cares that you used Neo4j. Show what it enables.
- **Don't walk through settings or configuration.** Every second of config is a second of lost storytelling.
- **Don't demo 10 features at surface depth.** Demo 5 features with depth and narrative. The story matters more than the feature count.
- **Don't explain what a knowledge graph is.** Show it working. The Pulse View IS the explanation.
- **Don't apologize for mocked data.** Present it as a simulated enterprise environment (Enron dataset). Confidence matters.
