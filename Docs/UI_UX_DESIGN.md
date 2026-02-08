# NEXUS — UI/UX Specification

**Target: Lovable build prompt | 3-minute demo | Executive persona | Enterprise-scale**

---

## Product Summary

NEXUS is an AI Chief of Staff for organizations — from 50-person startups to 50,000-person enterprises. It ingests all company communication (email, Slack, meetings, docs), decomposes it into structured knowledge (decisions, facts, commitments, open questions), builds a living knowledge graph, and surfaces what matters to the right person at the right time.

The interface is a **single-page app with four views** accessed via a persistent left sidebar. The design language is dark-theme, enterprise SaaS — think Linear meets Bloomberg Terminal. Information-dense but never cluttered. Every element earns its space.

The core UI metaphor — the Pulse View — is built on **semantic zoom**, the same principle that makes Google Maps work from continent-level down to street-level. At max zoom-out, you see divisions. Zoom in and divisions break into departments. Departments break into teams. Teams break into people. The same interface, the same interaction model, whether the org has 50 nodes or 50,000.

---

## Primary Persona: The Executive

**Who:** CEO, VP, C-Suite, Division Head. Time-starved. Oversees anywhere from 4 teams to 12 divisions spanning multiple geographies. Makes 10-20 decisions per day.

**What they need from NEXUS:**
1. Instant visual health check of the entire org — or their division, their region, their scope (10 seconds)
2. Alerts on what's broken or about to break — prioritized by blast radius across the enterprise (30 seconds)
3. Ability to ask a question and get a precise, sourced answer that spans any team or division (30 seconds)
4. Ability to trace any decision back to its origin, even across division boundaries (1 minute)

**Design constraint:** If it takes more than 2 clicks or 5 seconds of reading to get to an answer, the design has failed. This holds whether the org has 100 people or 100,000.

---

## Enterprise Scale: How the Interface Adapts

NEXUS is designed for organizations at any scale. The interface doesn't break at size — it **gains resolution.**

### Semantic Zoom Levels (The Google Maps Principle)

The Pulse View has four levels of detail. The user zooms fluidly between them. At each level, nodes represent a different granularity of the org.

| Zoom Level | Node represents | Visible at org size | What you see |
|---|---|---|---|
| **L1 — Enterprise** | Divisions / Business Units | 1,000+ people | 5-15 large nodes, each representing a division. Edges show cross-division communication volume. Color = aggregate health of that division. |
| **L2 — Division** | Departments / Functions | 200+ people | 8-30 nodes within a division. Engineering, Product, Sales, etc. Edges show cross-department flow. |
| **L3 — Department** | Teams | 20+ people | 4-15 nodes per department. Each node is a team. Edges show team-to-team communication. |
| **L4 — Team** | Individual People | Any size | 3-20 nodes. This is the view described in the rest of the spec — individual people, their load, their commitments. |

**At smaller orgs (< 200 people):** The Pulse opens directly at L3/L4 — teams and individuals are immediately visible. No zoom-out necessary. NEXUS feels lightweight and direct.

**At larger orgs (200-5,000):** The Pulse opens at L2 — departments. The executive sees "Engineering is green, Sales is amber, Marketing is red." One click into Marketing reveals the teams, one more click reveals the people. Three clicks from enterprise overview to individual contributor.

**At enterprise scale (5,000+):** The Pulse opens at L1 — divisions. "EMEA is green, North America has 2 alerts, APAC has a silo between Product and Engineering." The executive navigates from globe to street level in 3 zoom steps.

### How Scale Changes Each View

| View | Small Org (< 200) | Mid-Market (200-5,000) | Enterprise (5,000+) |
|---|---|---|---|
| **Pulse** | Individual people visible on load. Teams as clusters. | Opens at department level. Teams visible on first zoom. People on second zoom. | Opens at division level. 3 zoom levels to reach individuals. |
| **Alerts** | All alerts in a flat list. Sorted by severity. | Alerts grouped by department. Cross-department alerts pinned to top. | Alerts grouped by division. Cross-division alerts (the most expensive kind) highlighted with a special "Enterprise" severity tier. |
| **Ask NEXUS** | Searches the whole org. All results visible. | Results scoped to user's division by default. Toggle to search enterprise-wide. | Scope selector: "My Division" / "My Region" / "Enterprise-wide." Answers always cite which division the source came from. |
| **Decisions** | Flat list of all decisions. | Grouped by department. Cross-department decisions flagged. | Grouped by division. Cross-division decision chains (e.g., a pricing decision in HQ that affects regional sales teams) are surfaced as "enterprise decisions" with a globe icon. |

### Why Scale Is a Feature, Not a Problem

Most competing tools break at 500+ people — dashboards become unreadable, notification systems become noisy, knowledge graphs become hairballs. NEXUS gets *more valuable* at scale because:

- **Cross-division contradictions** are the most expensive kind. At a 50-person startup, the CEO probably knows about a conflicting launch date. At a 5,000-person company, the East Coast sales team and the West Coast product team can operate on conflicting information for months. NEXUS catches this in minutes.
- **Cross-division silos** are where the biggest duplicate-effort waste lives. Two divisions building the same internal tool because they have zero communication edges between them. At enterprise scale, this can waste millions in engineering effort per year.
- **Executive cognitive load** scales with org size but their time doesn't. A CEO of 50 people can sit in every meeting. A CEO of 5,000 cannot. NEXUS replaces that lost visibility — the executive sees the same living map regardless of org size.

---

## Human-in-the-Loop: The Learning Nervous System

NEXUS is not a static analytics dashboard that ships once and decays. It is a **learning system that gets smarter from every human interaction.** Every time a user dismisses an alert, flags a fact as outdated, corrects a misrouted insight, or endorses a recommendation, NEXUS adjusts its models. At enterprise scale with thousands of users generating feedback daily, NEXUS compounds in accuracy over time — the longer it runs, the more precisely it understands how information actually moves through the organization.

This is the key differentiator for large companies: **you cannot manually configure routing and relevance for 5,000+ people.** The system must learn. And it must learn from the humans who know their own context best.

### The Feedback Principle

Every piece of information NEXUS delivers — every alert, every briefing item, every query response, every fact in a decision chain — carries an inline feedback mechanism. The feedback is:
- **Frictionless:** One click for "useful" or "not useful." Two clicks maximum to explain why.
- **Contextual:** The reason options are specific to what went wrong, not generic thumbs up/down.
- **Consequential:** Every feedback signal directly adjusts the model. Users can see that their feedback changes behavior. This builds trust and drives continued engagement.

### The Universal Feedback Widget

This component appears on every knowledge delivery surface in NEXUS. It's small, unobtrusive, and always available.

**Default state (collapsed):**
```
[Useful ✓]  [Not useful ✗]
```
Two small ghost buttons, inline, right-aligned below any delivered content. 12px Inter medium. `#374151` text, `#1F2937` bg on hover. These don't demand attention — they're available when the user wants to provide signal.

**After clicking "Useful":**
```
✓ Noted — NEXUS will prioritize similar items for you.
```
Single-line confirmation in `#22C55E`, 12px, fades to `#6B7280` after 3 seconds. The signal feeds into the user's personal relevance model: this type of knowledge, from this source, at this level of urgency, was valuable. Increase weight for similar items.

**After clicking "Not useful" — Reason picker expands:**
```
✗ Not useful because:
[Outdated info]  [Wrong audience]  [Already knew]  [Not actionable]  [Incorrect]
Optional: [Add a note...                                              ]
```
Five reason chips (pill-shaped, 24px height, `#1F2937` bg, `#9CA3AF` text, 11px). Clicking one immediately submits the feedback. An optional text input (240px wide, 32px height) allows a free-text note for cases that don't fit the chips.

**What each reason does to the system:**

| Reason | What NEXUS learns | System adjustment |
|---|---|---|
| **Outdated info** | This fact is no longer accurate. | Triggers the Staleness Agent immediately. Reduces the half-life for this category of fact. Marks the fact for re-validation. If 3+ users flag the same fact as outdated, NEXUS auto-supersedes it and notifies the original source to confirm. |
| **Wrong audience** | This person shouldn't receive this type of information. | Reduces the TopicalProximity weight between this user and this topic cluster. At enterprise scale, if 10+ people in the same role dismiss the same alert type, NEXUS adjusts the relevance model for that entire role. |
| **Already knew** | The information was accurate but redundant — user already had this context. | Adjusts the delivery timing model. NEXUS learns this user already has high context on this topic and shifts future items from "push" to "available on-demand." Doesn't reduce relevance (the info *is* relevant), just reduces delivery aggressiveness. |
| **Not actionable** | The information was accurate and relevant, but the user can't do anything about it. | Increases the AuthorityRelevance threshold for this user. NEXUS learns not to push information that this person can observe but not influence. Routes to someone with authority instead. |
| **Incorrect** | The extracted information is factually wrong — the AI misinterpreted the source. | Flags the knowledge unit for human review. If the user provides a correction via the note field, NEXUS updates the knowledge graph immediately and logs the correction with provenance: "Corrected by Maria Chen on Feb 7 — original extraction was inaccurate." The Contradiction Agent also learns from misextraction patterns to reduce future errors. |

### Correction Flow: Fixing the Knowledge Graph from Any Surface

Users can correct facts, decisions, and commitments directly — not just flag them. This is critical for enterprise trust: if NEXUS shows something wrong, users need to fix it immediately, not file a support ticket.

**How it works on a Fact node (in a Decision Thread or briefing):**

User hovers over a fact. A small pencil icon (12px, `#374151`) appears on the right edge.

Clicking the pencil opens an inline correction form:
```
+-----------------------------------------------------------+
|  CORRECT THIS FACT                                         |
|                                                            |
|  Current: "Acme Corp contract is worth $500K/year"         |
|  Source: Sales standup, Oct 2025                           |
|                                                            |
|  What's wrong?                                             |
|  [Outdated — value has changed]                            |
|  [Incorrect — was never accurate]                          |
|  [Partially correct — needs nuance]                        |
|                                                            |
|  Updated value (optional):                                 |
|  [Acme Corp contract renewed at $450K/year             ]   |
|                                                            |
|  [Submit Correction]              [Cancel]                 |
+-----------------------------------------------------------+
```

**After submission:**
1. The old fact gets a `SUPERSEDED_BY` edge pointing to the corrected fact
2. The corrected fact's source is: "Correction by Maria Chen, Feb 7, 2026"
3. All downstream decisions that depend on this fact are flagged for review
4. Affected stakeholders receive a targeted update: "Acme contract value corrected from $500K to $450K. 3 decisions depend on this number."
5. The Staleness Agent recalibrates: this category of fact changes more often than expected — shorten the half-life

**Visual after correction:** The original fact node in the decision thread gets a small "corrected" indicator (strikethrough on the old value + green "Updated" badge), and the new value appears inline. The chain remains intact — the correction is part of the history, not a deletion.

### Persistent Memory: What NEXUS Remembers About Each User

NEXUS maintains a **per-user learning profile** that accumulates over time. This is not just a settings page — it's a living model of what the user cares about, how they prefer to receive information, and what patterns NEXUS has learned from their behavior.

**Where it's visible:** Clicking the user avatar (bottom of sidebar) opens a "NEXUS Memory" panel (400px, slides from right).

```
+------------------------------------------+
|  NEXUS MEMORY             Maria Chen     |
|                                          |
|  WHAT NEXUS HAS LEARNED        27 items  |
|                                          |
|  Relevance                               |
|  ● Payments, infrastructure, and hiring  |
|    are always relevant to you            |
|    (learned from 14 "useful" signals)    |
|  ● Finance reporting alerts are rarely   |
|    relevant to you                       |
|    (learned from 8 "wrong audience"      |
|     dismissals)                          |
|  ● Customer support topics are relevant  |
|    only when they involve Acme Corp      |
|    (learned from mixed signals)          |
|                                          |
|  Delivery                                |
|  ● You prefer morning briefings at 7:45am|
|    (learned from open-time patterns)     |
|  ● You read briefings faster when they're|
|    < 5 items. Longer briefings get       |
|    abandoned.                            |
|    (learned from read-completion rates)  |
|  ● You engage more with voice responses  |
|    between 8-9am and after 5pm           |
|    (learned from mic usage patterns)     |
|                                          |
|  Corrections                             |
|  ● You corrected 3 facts this month      |
|    — all related to contract values.     |
|    NEXUS now routes contract-value facts  |
|    to you for validation.                |
|  ● You flagged 2 decisions as            |
|    "incorrectly extracted." NEXUS        |
|    improved extraction accuracy for      |
|    Engineering Leads meetings by 12%.    |
|                                          |
|  [Clear a specific memory...]            |
|  [Pause learning for this session]       |
|                                          |
+------------------------------------------+
```

**Design details:**
- Section headers: "RELEVANCE," "DELIVERY," "CORRECTIONS" in 11px uppercase, `#6B7280`, letter-spacing 0.5px.
- Each learned item: green dot prefix (`#22C55E`, 8px). Description in 13px `#D1D5DB`. Provenance in 12px `#6B7280` (how NEXUS learned this — "from 14 'useful' signals").
- Clear a specific memory: clicking opens a list of all learned items as toggleable switches. Users can remove any individual learning they disagree with. This builds trust — the system is transparent and controllable.
- Pause learning: stops all feedback signal collection for the current session. Useful if the user is doing unusual work (e.g., researching a topic they don't normally engage with) and doesn't want it to skew their profile.

**Why this matters at enterprise scale:**
- 5,000 users x 5 feedback signals/day = 25,000 learning events per day
- After 90 days, NEXUS has processed 2.25 million feedback signals
- The relevance model becomes extraordinarily precise — each user gets a routing experience that's been calibrated by their own behavior over months
- New employees inherit a baseline model from their role and team, then personalize from there
- Employee transitions (role change, team change) trigger a "memory reset" for role-specific learnings while preserving personal preferences

### Enterprise Calibration: Admin-Level Feedback Intelligence

At enterprise scale, individual feedback signals aggregate into **organizational intelligence about information flow itself.** NEXUS exposes this to administrators and leadership.

**Accessible via:** An admin-only tab in the sidebar (visible to designated admins): `[⚙]` icon.

**What the admin calibration dashboard shows:**

**1. Routing Accuracy by Division**
```
+------------------------------------------+
|  ROUTING ACCURACY (last 30 days)         |
|                                          |
|  NA Division:     87% useful rate        |
|  EMEA Division:   91% useful rate        |
|  APAC Division:   72% useful rate  ←     |
|  HQ:              94% useful rate        |
|                                          |
|  ⚠ APAC useful rate is 15 points below  |
|  enterprise average. Top dismissal       |
|  reason: "Wrong audience" (43%).         |
|                                          |
|  NEXUS RECOMMENDATION:                   |
|  APAC has 12 cross-functional roles that |
|  are receiving Engineering alerts they   |
|  can't act on. Suggest narrowing the     |
|  TopicalProximity radius for APAC        |
|  Operations roles.                       |
|                                          |
|  [Apply Recommendation] [Investigate]    |
+------------------------------------------+
```

**2. Most Corrected Fact Categories**
```
+------------------------------------------+
|  MOST CORRECTED FACTS (last 90 days)     |
|                                          |
|  1. Contract values       23 corrections |
|     Current half-life: 90 days           |
|     Suggested half-life: 30 days         |
|     [Apply]                              |
|                                          |
|  2. Headcount numbers     18 corrections |
|     Current half-life: 30 days           |
|     Suggested half-life: 14 days         |
|     [Apply]                              |
|                                          |
|  3. Sprint commitments    14 corrections |
|     Current half-life: 7 days            |
|     Suggested half-life: 3 days          |
|     [Apply]                              |
+------------------------------------------+
```

Feedback data directly tunes the half-life system. When humans consistently correct a category of fact before its half-life expires, NEXUS recommends shortening the half-life. The admin clicks [Apply] to update the system-wide default. This closes the loop: human corrections improve the automated staleness detection.

**3. Cross-Division Feedback Patterns**
```
+------------------------------------------+
|  CROSS-DIVISION SIGNAL HEALTH            |
|                                          |
|  NA → EMEA:  Items sent: 340            |
|              Useful rate: 78%            |
|              Top issue: Timing (EMEA     |
|              receives NA alerts during   |
|              off-hours)                   |
|                                          |
|  EMEA → NA:  Items sent: 210            |
|              Useful rate: 84%            |
|              Healthy                     |
|                                          |
|  NA → APAC:  Items sent: 89             |
|              Useful rate: 61%  ←         |
|              Top issue: Wrong audience   |
|              (APAC ops receiving NA eng  |
|              alerts)                     |
+------------------------------------------+
```

This view is unique to enterprise. It shows how well NEXUS is routing information *between* divisions — the hardest routing problem at scale. Admins can see which cross-division pathways are working and which are generating noise.

**Why large companies need this specifically:**
- At 200 people, you can tune the system manually. At 5,000+, you need the system to tune itself from aggregate human feedback.
- The admin dashboard turns thousands of individual "Not useful" clicks into actionable system-wide adjustments.
- Enterprise CIOs and COOs can use this data to understand information flow health as a KPI — "Our cross-division routing accuracy improved from 72% to 89% over 6 months."
- Compliance teams can audit the correction trail: every correction has provenance (who corrected what, when, and what downstream effects it had).

---

## Global Layout

```
+----+-------------------------------------------------------------+
| S  |                                                               |
| I  |                    MAIN CONTENT AREA                          |
| D  |                    (swaps based on active view)               |
| E  |                                                               |
| B  |                                                               |
| A  |                                                               |
| R  |                                                               |
|    |                                                               |
| 64 |                                                               |
| px |                                                               |
|    |                                                               |
+----+-------------------------------------------------------------+
```

### Sidebar (64px wide, fixed left, always visible)

A narrow icon-only rail. Dark background (`#0F1117`). Four navigation icons stacked vertically, plus a bottom section.

```
+------+
| [N]  |  <- NEXUS logo mark (top, 40x40)
|      |
| [~]  |  <- Pulse View (home)
| [!]  |  <- Alerts (badge count if > 0)
| [?]  |  <- Ask NEXUS (voice/text query)
| [>>] |  <- Decision Explorer
|      |
|      |
| [🧠] |  <- NEXUS Memory (what NEXUS learned about you)
| [o]  |  <- User avatar (bottom)
+------+
```

**NEXUS Memory icon:** Brain icon, 20px, `#6B7280` default, `#A855F7` (purple) when active. Subtle purple dot badge (6px) when NEXUS has learned something new since last viewed — communicates "the system is actively improving." Clicking opens the Memory panel (400px, slides from right) showing all learned preferences, corrections, and delivery patterns. See Human-in-the-Loop section for full panel spec.

**Icon style:** Outlined, 20px, `#6B7280` default, `#F9FAFB` when active, with a 3px left-edge accent bar in `#3B82F6` (blue) on the active view.

**Alert badge:** Red dot with count (`#EF4444`) on the Alerts icon when there are unresolved alerts.

**Hover behavior:** Tooltip appears to the right of each icon with the view name. 200ms delay, `#1F2937` background, `#F9FAFB` text, 12px Inter medium.

### Top Bar (48px tall, spans the width of the main content area)

```
+-------------------------------------------------------------+
| View Title    [Scope: ▾]   [Search... Cmd+K]   [Mic]  Feb 7 |
+-------------------------------------------------------------+
```

- **Left:** Current view title ("Pulse," "Alerts," "Ask NEXUS," "Decisions") in 16px Inter semibold, `#F9FAFB`
- **Scope selector** (enterprise feature): A dropdown showing the current scope. Default: "Acme Corp" (full enterprise). Options: division names, region names, or "Enterprise-wide." Pill-shaped, `#1F2937` bg, `#9CA3AF` text, 13px. Chevron indicator. At small orgs (< 200 people), this selector is hidden — there's only one scope.
- **Center:** Search bar. Rounded rectangle (`#1F2937` background, `#374151` border, 1px). Placeholder text "Search people, decisions, facts... Cmd+K" in `#6B7280`. 360px wide. Clicking opens the command palette overlay.
- **Right:** Microphone icon (20px, `#6B7280`, hover `#F9FAFB`). Date in `#6B7280`, 13px.

---

## View 1: The Pulse (Home / Default)

This is the first thing the user sees. It communicates org health in under 10 seconds — whether the org has 50 people or 50,000.

### Layout

```
+----+-------------------------------------------------------------+
|    | Pulse  [Scope: Acme Corp ▾]  [Search.. Cmd+K]  [Mic] Feb 7 |
| S  +-------------------------------------------------------------+
| I  |         |                                                    |
| D  |  STATS  |              GRAPH CANVAS                          |
| E  |  STRIP  |          (force-directed network)                  |
| B  |  160px  |                                                    |
| A  |         |         o----o        o                            |
| R  |         |        / \    \      / \         o---o             |
|    |         |       o   o    o----o   o       /     \            |
|    |         |        \ /    /      \ /       o   o   o           |
|    |         |         o----o        o         \ | /              |
|    |         |                                   o                |
|    |         |                                                    |
|    +----+----+--------------------------------------------+------+
|    | Breadcrumb: Acme Corp > [Eng] [Product] [Sales] [Ops]| Time |
+----+-------------------------------------------------------+------+
```

### Left Stats Strip (160px wide, full height of content area)

A vertical column of 4 stat cards. Each card is a rounded rectangle (`#1F2937` bg, 8px radius, 12px padding) stacked with 12px gap. **The numbers in these cards dynamically reflect the current zoom level and scope.**

**Card 1: Scope Health**
```
+------------------------+
|  ACME CORP             |
|                        |
|   ● 2 issues           |
|                        |
|  4 divisions | 47 teams|
|  2,340 people          |
|  Active now: 1,489     |
+------------------------+
```
- At L1 (enterprise): shows division count, total people, total teams.
- At L3 (zoomed into Engineering dept): shows "ENGINEERING — 8 teams | 94 people"
- At L4 (zoomed into a team): shows "PAYMENTS TEAM — 5 people"
- Status dot: 10px circle, colored by worst active alert severity within the current scope. Green if no alerts, amber if staleness/silo, red if contradiction/overload.
- "Healthy" / "2 issues" text next to the dot, colored to match.
- Sub-stats in `#6B7280`, 12px.

**Card 2: Active Alerts**
```
+------------------------+
|  ALERTS        7 total |
|                        |
|  !! 2 Contradictions   |
|  !  3 Staleness        |
|  !  1 Silo             |
|  ~  1 Drift            |
|                        |
|  [View All ->]         |
+------------------------+
```
- Each line has severity icon (`!!` red, `!` orange, `~` amber) and agent name with count.
- At enterprise zoom, these are enterprise-wide totals. When zoomed into a division, only that division's alerts show.
- "View All ->" link in `#3B82F6`, navigates to Alerts view. 12px, medium weight.

**Card 3: Activity Today**
```
+------------------------+
|  TODAY          Feb 7  |
|                        |
|  14 decisions made     |
|  23 commitments created|
|  8 facts updated       |
|  19 questions open     |
+------------------------+
```
- Numbers reflect the current scope. Enterprise-wide shows aggregate. Zoomed into a division shows that division's numbers.
- Each line has a colored dot matching the knowledge unit type color (blue, purple, green, amber). 13px, `#9CA3AF`.

**Card 4: Top Alert Preview**
```
+------------------------+
|  !! CONTRADICTION      |
|  CROSS-DIVISION        |
|                        |
|  Launch date conflict  |
|  NA Product vs EMEA    |
|  Sales                 |
|  12 downstream impacts |
|                        |
|  [Resolve ->]          |
+------------------------+
```
- Shows the highest-severity unresolved alert within current scope. Red left border (3px, `#EF4444`).
- Cross-division alerts get a "CROSS-DIVISION" sub-label in 10px `#F97316` — these are the most expensive organizational failures and get visual priority.

### Graph Canvas (remaining width, full height)

**Background:** `#0A0E17`. No grid, no axes. Pure dark canvas.

#### Semantic Zoom: What Nodes Look Like at Each Level

**L1 — Division nodes (enterprise zoom-out):**
- Large circles: 64-96px diameter. Sized by headcount within the division.
- Fill color: aggregate health of all teams in that division (worst status wins).
- Inner ring: thin (2px) ring around the circle showing alert count. More alerts = thicker ring in that alert's color.
- Label: Division name centered inside the circle, 14px Inter semibold, `#F9FAFB`. Headcount below in 11px `#6B7280`.
- Example: A large green circle labeled "Engineering / 340 people" next to a smaller amber circle labeled "Sales / 180 people."
- Glow effect: same as person nodes but larger (16px blur, 20% opacity). Color matches health status.

**L2 — Department nodes (division zoom):**
- Medium circles: 40-72px. Sized by headcount.
- Same color logic as L1.
- Label: Department name below, 12px Inter medium, `#9CA3AF`.

**L3 — Team nodes (department zoom):**
- Smaller circles: 28-56px. Sized by activity level (commitments + decisions).
- Same color logic.
- Label: Team name below, 11px.

**L4 — Person nodes (team zoom):**
- Circle shape with soft box-shadow glow (same color as fill, 8px blur, 30% opacity)
- Size range: 20px (low activity) to 52px (high activity). Sized by `active_commitments + pending_decisions`.
- Fill color by health status:
  - `#22C55E` — load < 50 (healthy)
  - `#EAB308` — load 50-70 (elevated)
  - `#F97316` — load 70-90 (high / has alert)
  - `#EF4444` — load > 90 or unresolved critical alert
- Label: Name below the node, 11px Inter medium, `#9CA3AF`. Always visible for nodes > 36px. Hover-only for smaller nodes.
- Pulse animation: Subtle scale oscillation (97% to 103%, sinusoidal, 3-second cycle). Faster for higher-activity nodes.

#### Zoom Transition Animation

When the user double-clicks a division node (or scrolls to zoom in):
1. The clicked node expands smoothly (300ms ease-out) to fill the canvas
2. Its internal structure fades in — the departments/teams/people within it appear as the node "opens"
3. Surrounding nodes shrink and fade to 10% opacity, sliding to the canvas edges
4. The breadcrumb in the bottom bar updates: "Acme Corp > Engineering"

When the user clicks the breadcrumb to zoom back out:
1. The current view contracts back into its parent node (300ms ease-out)
2. Sibling nodes fade back in

This is the same interaction pattern as Google Maps zooming into a city, or Figma zooming into a frame. Familiar, intuitive, no learning curve.

#### Edges (Communication)

- Default: 1px line, `#1E293B` (barely visible — shows structure without noise)
- Active (communication in last 24h): 1.5px line, `#374151`, with small animated dots (3px circles) flowing from sender to receiver
  - Dot color matches knowledge unit type: `#3B82F6` (decision), `#22C55E` (fact), `#A855F7` (commitment), `#EAB308` (question)
  - Dot speed: 40px/sec. 1 dot per active knowledge unit in the last 24h, capped at 5 dots per edge.
- High-traffic: 2.5px line with faster, denser dots
- **Cross-division edges (L1):** Thicker (3px), with a faint glow. These represent information flowing between divisions — the most structurally important communication in a large org. Colored by health: green if healthy, orange if silo-risk (low volume relative to topic overlap).

#### Cluster Regions

- Faint translucent filled regions behind team members / department members (`#1E293B` at 40% opacity, soft rounded blob shape)
- Label centered in the cluster: 13px Inter semibold, `#4B5563`, uppercase, letter-spacing 1px

#### Alert Overlays on the Graph

- Contradiction: A small red lightning bolt icon (16px) positioned at the midpoint between the two conflicting source nodes. A faint red dashed line connects them. **At L1, contradictions between divisions show as a large red bolt between division nodes — immediately communicating the most expensive type of organizational conflict.**
- Silo: A dashed orange line connecting two clusters that should be communicating but aren't. Label at midpoint: "Silo detected" in 10px, `#F97316`.
- Overload: A red ring (2px, `#EF4444`) around the overloaded person's node (L4 only).

### Interactions on the Graph

**Double-click node (any zoom level):**
- Zooms into that node, revealing its internal structure at the next level of detail.
- At L4 (person level), double-click opens the Person Detail panel instead (can't zoom further).

**Single-click node:**
- A detail panel slides in from the right (400px wide, `#111827` bg).
- At L1-L3: shows a Division/Department/Team summary card — aggregate health, alert count, top contributors, recent decisions, headcount trend.
- At L4: shows the full Person Detail Panel (see below).

**Hover node:**
- That node brightens to full opacity. All connected edges brighten to `#6B7280`. All unconnected elements drop to 30% opacity.
- A tooltip appears (240px wide, `#1F2937` bg, `#374151` border, 8px radius, 8px padding):

At L1 (division):
```
North America Division
──────────────────────
12 teams | 580 people
Health: ● 1 issue (contradiction)
14 decisions this week
Top alert: Launch date conflict
```

At L4 (person):
```
Maria Chen
VP Engineering
──────────────────────
Load: 72/100  [====----]
8 commitments | 6 decisions pending
1 alert: Overload
```

**Click alert overlay (lightning bolt / silo line / red ring):**
- Navigates to the Alerts view with that specific alert expanded.

### Bottom Bar

```
+----------------------------------------------------------------+----------+
| Acme Corp > Engineering > [All] [Payments] [Platform] [Infra]  |  ◄ ▮▮ ►  |
+----------------------------------------------------------------+----------+
```

**Left: Breadcrumb + Filter chips.**
- Breadcrumb shows current zoom path: "Acme Corp > Engineering > Payments Team." Each segment is clickable to zoom back out to that level.
- Filter chips (pill-shaped, 28px height, 12px Inter medium) show siblings at the current zoom level. Clicking one highlights only that cluster. Default state: `#1F2937` bg, `#9CA3AF` text. Active state: `#1E3A5F` bg (blue tint), `#3B82F6` text, `#3B82F6` 1px border. "All" resets.

**Right: Time controls.** Small transport-style controls. Left arrow, pause/play, right arrow. Steps through time in 1-week increments. Label showing "Live" with a green dot (default) or the selected historical date.

---

## View 2: Alerts

Accessed via sidebar `[!]` icon. Shows all active and recently resolved Immune System alerts.

### Layout

```
+----+-------------------------------------------------------------+
|    | Alerts (7 active) [Scope: Acme Corp ▾] [Search..] [Mic] Feb7|
| S  +-------------------------------------------------------------+
| I  |                                                              |
| D  |  FILTER TABS                                                 |
| E  |  [All (7)] [Contradictions (2)] [Staleness (3)] [Silos (1)] |
| B  |  [Overload (0)] [Drift (1)] [Resolved (23)]                 |
| A  +--------------------------------------------------------------+
| R  |                                                              |
|    |  CROSS-DIVISION  (pinned section — enterprise scale)         |
|    |  +----------------------------------------------------------+|
|    |  | !! CONTRADICTION                          2 hours ago    ||
|    |  | CROSS-DIVISION: NA Product ↔ EMEA Sales                 ||
|    |  |                                                          ||
|    |  | Launch date: "March 15" vs "April 1"                     ||
|    |  |                                                          ||
|    |  | Source A: NA Product standup, Jan 12 — "March 15"        ||
|    |  | Source B: EMEA Engineering leads, Feb 3 — "April 1"      ||
|    |  |                                                          ||
|    |  | DOWNSTREAM IMPACT                                        ||
|    |  | 4 commitments depend on March 15 date (NA)               ||
|    |  | 2 EMEA customers were told March 15 by EMEA Sales        ||
|    |  | Marketing campaign across 3 regions for March 10         ||
|    |  | Blast radius: 12 teams across 2 divisions                ||
|    |  |                                                          ||
|    |  | Resolution authority: VP Product (Dana Torres, NA)       ||
|    |  |                                                          ||
|    |  | NEXUS RECOMMENDATION                                     ||
|    |  | Dana Torres should confirm date. NEXUS will propagate    ||
|    |  | the correction to all 12 affected teams across both      ||
|    |  | divisions in a single coordinated update.                ||
|    |  |                                                          ||
|    |  | [Resolve: Notify Dana]         [Trace Decision Chain ->] ||
|    |  +----------------------------------------------------------+|
|    |                                                              |
|    |  WITHIN DIVISIONS                                            |
|    |  +----------------------------------------------------------+|
|    |  | ! STALENESS  [NA / Finance]              1 day ago       ||
|    |  |                                                          ||
|    |  | "Acme Corp contract: $500K/year"                         ||
|    |  | Last validated: 127 days ago (half-life: 90 days)        ||
|    |  | ...                                                      ||
|    |  +----------------------------------------------------------+|
|    |                                                              |
+----+--------------------------------------------------------------+
```

### Enterprise Alert Hierarchy

At enterprise scale, alerts are grouped into two sections:

**1. CROSS-DIVISION (pinned to top)**
These are the most expensive organizational failures — contradictions, silos, or drift happening *between* divisions. At a 5,000-person company, a contradiction between two divisions can waste months of work and destroy customer trust across regions. These alerts always appear first regardless of timestamp.

Visual distinction: A thin `#F97316` top border on the section header. Each alert card in this section has a "CROSS-DIVISION" label in `#F97316`, 10px, with a small globe icon (12px). The card also shows which divisions are involved: "NA Product <-> EMEA Sales."

Added fields for cross-division alerts:
- **Blast radius:** "12 teams across 2 divisions" — quantifies the reach of the issue. Uses a wider font weight to stand out (14px semibold vs 13px regular for within-division stats).
- **Resolution propagation:** The NEXUS recommendation specifies that the resolution will be pushed across division boundaries — something that would take weeks manually at enterprise scale.

**2. WITHIN DIVISIONS**
Standard alerts scoped within a single division. Each card has a division tag: "[NA / Finance]" in 11px, `#6B7280`.

### Alert Card Component

Same structure as before, with enterprise additions:

**Container:** `#1F2937` bg, 12px radius, 16px padding, 16px gap between cards. Left border: 3px solid, colored by severity (`#EF4444` critical, `#F97316` warning, `#EAB308` info).

**Header row:**
- Left: Severity badge (`!!` / `!` / `~`). Agent name. Division tag (at enterprise scale).
- Right: Relative timestamp.

**Title:** 16px Inter semibold, `#F9FAFB`.

**Cross-division label (enterprise only):** "CROSS-DIVISION: NA Product <-> EMEA Sales" in 12px, with globe icon, `#F97316`.

**Downstream Impact section:** Includes "Blast radius" metric at enterprise scale — total teams and divisions affected. This number is the key enterprise severity indicator.

**Action buttons:**
- **Primary:** "Resolve: [specific action]". Filled, `#3B82F6`.
- **Secondary:** "Trace Decision Chain ->". Ghost, `#3B82F6`.

**Feedback row (below action buttons, separated by 1px `#374151` divider):**
```
Was this alert useful?  [Useful ✓]  [Not useful ✗]
```
12px `#6B7280` label + two small ghost buttons. Clicking "Not useful" expands the reason picker inline: `[Outdated info] [Wrong audience] [Already knew] [Not actionable] [Incorrect]`. After the user selects a reason, the row collapses to a confirmation: "✓ Noted" in `#22C55E` 12px. Feedback feeds into the Immune System's alert targeting model — if multiple users in the same role dismiss the same alert type, NEXUS adjusts who receives that alert category.

**Resolved cards:** Collapsed to single row with green left border and resolution summary.

---

## View 3: Ask NEXUS (Voice + Text Query Interface)

Accessed via sidebar `[?]` icon, or `Cmd+K` from anywhere, or the microphone icon.

### Layout (Idle State)

```
+----+-------------------------------------------------------------+
|    | Ask NEXUS   [Scope: Acme Corp ▾]  [Search.. Cmd+K] [Mic] F7|
| S  +-------------------------------------------------------------+
| I  |                                                              |
| D  |                                                              |
| E  |              +------------------------------------+          |
| B  |              | Ask anything about your org...     |          |
| A  |              |                            [Mic] > |          |
| R  |              +------------------------------------+          |
|    |                                                              |
|    |              SUGGESTED QUERIES                               |
|    |              "What changed today?"                           |
|    |              "Who should be in the pricing meeting?"         |
|    |              "Is anything about to go wrong?"                |
|    |              "Why did we choose Adyen over Stripe?"          |
|    |              "Compare Engineering health: NA vs EMEA"        |
|    |                                                              |
+----+--------------------------------------------------------------+
```

**Query input:** Centered in the content area (max 640px wide). Large rounded rectangle, `#1F2937` bg, `#374151` border (1px), 48px height, 16px text, `#F9FAFB`. Mic icon on the right inside the input. Submit arrow on far right.

**Suggested queries:** Below the input, 16px gap. Each suggestion is a clickable text line: 14px Inter regular, `#6B7280`, hover `#3B82F6`. At enterprise scale, suggestions include cross-division queries like "Compare Engineering health: NA vs EMEA" — these highlight that NEXUS works across the full org.

### Response State

```
+----+-------------------------------------------------------------+
|    | Ask NEXUS   [Scope: Acme Corp ▾]  [Search.. Cmd+K] [Mic] F7|
| S  +-------------------------------------------------------------+
| I  |                                                              |
| D  |  You: "Is anything about to go wrong?"                       |
| E  |                                                              |
| B  |  +----------------------------------------------------------+|
| A  |  | NEXUS                                     [Play Audio]   ||
| R  |  |                                                          ||
|    |  | Three things across the enterprise.                      ||
|    |  |                                                          ||
|    |  | 1. CONTRADICTION [CROSS-DIVISION]                        ||
|    |  |    NA Product and EMEA Sales have conflicting launch     ||
|    |  |    dates. Blast radius: 12 teams, 2 divisions.           ||
|    |  |    [View Alert ->]                                       ||
|    |  |                                                          ||
|    |  | 2. DRIFT [NA DIVISION]                                   ||
|    |  |    65% of NA Engineering decisions this week were about  ||
|    |  |    internal tooling. Stated Q1 priority is enterprise    ||
|    |  |    PMF. Drift increasing for 3 weeks.                    ||
|    |  |    [View Drift Analysis ->]                              ||
|    |  |                                                          ||
|    |  | 3. OVERLOAD [EMEA DIVISION]                              ||
|    |  |    Priya Sharma (EMEA Platform Lead) is single point     ||
|    |  |    of failure for 9 workstreams. Bus factor critical.    ||
|    |  |    [View Overload Detail ->]                             ||
|    |  |                                                          ||
|    |  +----------------------------------------------------------+|
|    |                                                              |
|    |  +------------------------------------+                      |
|    |  | Ask a follow-up...         [Mic] > |                      |
|    |  +------------------------------------+                      |
|    |                                                              |
+----+--------------------------------------------------------------+
```

**Response structure:** Each item includes a division tag when the response spans multiple divisions. "CROSS-DIVISION," "NA DIVISION," "EMEA DIVISION." This makes scope immediately clear in enterprise-wide queries.

**Per-item feedback:** Each numbered item in the response has a small inline feedback widget on its right edge:
```
| 1. CONTRADICTION [CROSS-DIVISION]                     [✓] [✗] |
|    NA Product and EMEA Sales have conflicting launch          |
|    dates. Blast radius: 12 teams, 2 divisions.                |
```
The `[✓]` and `[✗]` are 16px icon buttons, `#374151` default, `#22C55E` / `#EF4444` on hover. Clicking `[✗]` expands the reason picker under that specific item. This lets NEXUS learn which *types* of answer items are useful for this user — someone might always find contradiction alerts useful but never care about drift warnings. NEXUS adjusts future responses accordingly.

**Response-level feedback (below the full response card):**
```
Was this response helpful overall?  [Useful ✓]  [Not useful ✗]
```
This captures whether the response as a whole addressed the query. If "Not useful" + reason "Incorrect," NEXUS logs the query-response pair for review and retraining. Over time, this tunes the query interpretation and response generation models.

**Scope-aware responses:** When the scope selector is set to a specific division, NEXUS answers within that scope. When set to "Enterprise-wide," NEXUS answers across all divisions and cites which division each piece of information comes from.

### Voice Interaction Flow

Same as before:
1. **Listening:** Pulsing red circle, animated waveform, "Listening..."
2. **Processing:** Transcribed text appears, "Thinking..." with spinner.
3. **Response:** Card fades in (200ms). TTS auto-plays if enabled.

---

## View 4: Decision Explorer

Accessed via sidebar `[>>]` icon, or by clicking any "[View Decision ->]" link, or by clicking "Trace Decision Chain" on an alert.

### Layout

```
+----+-------------------------------------------------------------+
|    | Decisions [Scope: Acme Corp ▾]  [Search.. Cmd+K]  [Mic] Feb7|
| S  +-------------------------------------------------------------+
| I  |                                            |                 |
| D  |  RECENT DECISIONS (left column, 320px)     | DECISION THREAD |
| E  |                                            | (right, flex)   |
| B  |  CROSS-DIVISION                            |                 |
| A  |  +-------------------------------------+   |                 |
| R  |  | @ Switch to Adyen        Feb 3    > |   | (populated when |
|    |  |   NA Product + EMEA Eng             |   |  a decision is  |
|    |  +-------------------------------------+   |  selected)      |
|    |  | @ Pricing restructure    Jan 25     |   |                 |
|    |  |   Enterprise-wide                   |   |                 |
|    |  +-------------------------------------+   |                 |
|    |  |                                     |   |                 |
|    |  | NA DIVISION                         |   |                 |
|    |  +-------------------------------------+   |                 |
|    |  | o Checkout redesign      Jan 20     |   |                 |
|    |  +-------------------------------------+   |                 |
|    |  | o Expand payments team   Jan 15     |   |                 |
|    |  +-------------------------------------+   |                 |
|    |  |                                     |   |                 |
|    |  | EMEA DIVISION                       |   |                 |
|    |  +-------------------------------------+   |                 |
|    |  | o PCI v4 compliance     Dec 12      |   |                 |
|    |  +-------------------------------------+   |                 |
|    |  | o Tighten payment SLA   Nov 8       |   |                 |
|    |  +-------------------------------------+   |                 |
|    |                                            |                 |
+----+--------------------------------------------+-----------------+
```

### Left Column: Decision List (320px, scrollable)

At enterprise scale, decisions are **grouped by scope:**
- **CROSS-DIVISION** (pinned to top): Decisions that span multiple divisions. Marked with a globe icon (`@`). Show which divisions are involved below the headline.
- **[Division Name]**: Decisions within each division.

Each decision row: 64px height (slightly taller at enterprise to fit division label), full width, `#111827` bg, 1px `#1F2937` bottom border.

- Left: Colored dot (10px). Globe icon (`@`) for cross-division, standard dot (`o`) for within-division.
- Center: Decision headline in 14px Inter medium, `#F9FAFB`. Below: decider name + date + division tag in 12px `#6B7280`.
- Right: Chevron `>` in `#374151`
- Hover: Row bg shifts to `#1F2937`
- Selected: Row bg `#1E293B`, left border 3px `#3B82F6`

### Right Column: Decision Thread (remaining width)

The causal chain rendered as a **vertical timeline** reading top-to-bottom, present-to-past. At enterprise scale, each node in the chain shows its **source division** when the chain crosses division boundaries.

```
+-----------------------------------------------------------+
|                                                           |
|  Switch payments backend from Stripe to Adyen             |
|  Decided by: Maria Chen (NA)  |  Feb 3, 2026             |
|  Status: ACTIVE  |  Confidence: 94%                       |
|  Scope: Cross-division (NA Product, EMEA Engineering)     |
|                                                           |
+-----------------------------------------------------------+
|                                                           |
|  CAUSAL CHAIN                                             |
|                                                           |
|  [DECISION]  Feb 3  [NA]                                  |
|  o  Switch to Adyen                              <- HERE  |
|  |  Maria Chen, Engineering Leads Meeting                 |
|  |                                                        |
|  |  informed by                                           |
|  |                                                        |
|  [FACT]  Jan 30  [NA]                                     |
|  o  Adyen offers volume discount at our scale             |
|  |  Source: Vendor call, Adyen rep                        |
|  |  Freshness: ● 0.28 (fresh)                            |
|  |                                                        |
|  |  corroborated by                                       |
|  |                                                        |
|  [FACT]  Jan 28  [EMEA]                                   |
|  o  Stripe fees increasing 40% at our volume              |
|  |  Source: EMEA Finance analysis, James Wright           |
|  |  Freshness: ● 0.31 (fresh)                            |
|  |                                                        |
|  |  prompted by                                           |
|  |                                                        |
|  [QUESTION]  Jan 15  [ENTERPRISE]                         |
|  o  Should we renegotiate Stripe or switch?               |
|  |  Asked by: James Wright (CFO — Enterprise)             |
|  |  Status: Resolved                                      |
|  |                                                        |
|  |  triggered by                                          |
|  |                                                        |
|  [FACT]  Jan 12  [EMEA]                                   |
|  o  Q4 payment processing costs exceeded budget by 22%   |
|     Source: EMEA Quarterly financial review                |
|     Freshness: ● 0.28 (fresh)                            |
|                                                           |
+-----------------------------------------------------------+
|                                                           |
|  DOWNSTREAM IMPACT                                        |
|                                                           |
|  Commitments depending on this decision:                  |
|                                                           |
|  NA DIVISION:                                             |
|  ● Sarah Park — Adyen API spec         Due Feb 14        |
|    Status: [OVERDUE] 2 days past                          |
|  ● Jake Reeves — Checkout frontend      Due Mar 1        |
|    Status: [at risk] blocked by Sarah's spec              |
|                                                           |
|  EMEA DIVISION:                                           |
|  ● Finance — Update payment forecasts   Due Feb 10       |
|    Status: [on track]                                     |
|  ● EMEA Sales — Update customer comms   Due Feb 12       |
|    Status: [not started]                                  |
|                                                           |
|  Teams notified:              4 of 8                      |
|  ✓ NA Payments team (Feb 3)                              |
|  ✓ NA Frontend team (Feb 4)                              |
|  ✓ EMEA Engineering (Feb 4)                              |
|  ✓ EMEA Finance (Feb 5)                                  |
|  ✗ NA Customer Support                                   |
|  ✗ NA Sales                                              |
|  ✗ EMEA Sales                                            |
|  ✗ EMEA Customer Support                                 |
|                                                           |
|  [Notify All Remaining Teams (4)]                         |
|                                                           |
+-----------------------------------------------------------+
```

**Division tags in the causal chain:** Each timeline node shows a division tag: `[NA]`, `[EMEA]`, `[ENTERPRISE]`. These are small pill badges using the scope's color. When a causal chain crosses division boundaries, the tag changes as you scroll — making it visually obvious that this decision was informed by facts from multiple divisions.

**Downstream impact grouped by division:** At enterprise scale, the impact section groups commitments by division. This shows how a single decision ripples across the entire org. The "4 of 8" teams notified count gives an instant read on propagation completeness.

**Timeline node design:**
- Type badge: pill-shaped, 11px uppercase, colored by type
- Division badge: pill-shaped, 10px, `#374151` bg, `#9CA3AF` text. Different bg for each division for visual distinction.
- Date: `#6B7280`, 12px
- Circle marker: 12px, filled, colored by type. Connected by a 2px vertical line (`#374151`)
- Headline: 14px semibold `#F9FAFB`
- Metadata: 13px `#9CA3AF`
- Relationship label: 12px italic `#6B7280`

**Freshness indicator:** 8px colored dot + score.
- Green (`#22C55E`): < 0.5 (fresh)
- Amber (`#EAB308`): 0.5-1.0 (aging)
- Red (`#EF4444`): > 1.0 (stale)

**Inline correction on timeline nodes:** Every Fact and Decision node in the chain has a small pencil icon (12px, `#374151`) visible on hover, right-aligned. Clicking it opens the Correction Flow (see Human-in-the-Loop section) — the user can flag the fact as outdated, incorrect, or partially correct, and optionally provide the updated value. The correction immediately updates the knowledge graph and flags all downstream dependencies for review. This is critical at enterprise scale: a fact extracted from an EMEA meeting might be corrected by an NA leader who has newer information. The correction propagates across divisions automatically.

**Endorsement on timeline nodes:** Each node also has a small checkmark icon (12px, `#374151`) on hover, to the left of the pencil. Clicking it marks "I confirm this is still accurate" — resetting the node's `last_validated` timestamp and refreshing its staleness score. This is how high-value facts stay fresh: when a VP scrolls through a decision chain and sees a fact they know is current, one click validates it. At enterprise scale with hundreds of VPs reviewing decision chains, this creates a distributed fact-validation network.

Stale chain warning banner:
```
⚠ This decision chain includes 1 stale fact.
  Conclusions may need re-evaluation. [View stale node] [Validate all facts in chain ✓]
```
Amber background (`#78350F` at 20% opacity), amber text, 3px amber left border. The "Validate all facts in chain" button lets a knowledgeable reviewer confirm the entire chain is current in one click — a significant time saver for decision audits.

---

## Command Palette (Overlay)

Triggered by `Cmd+K` or clicking the search bar. Same design as before, with enterprise additions.

**Results now show division context:**
```
PEOPLE
> Maria Chen — VP Engineering [NA]
> Priya Sharma — Platform Lead [EMEA]

DECISIONS
> Switch to Adyen (Feb 3) [Cross-Division]
> Checkout redesign (Jan 20) [NA]

QUERIES
> "Compare health across all divisions"
> "What changed today?"
```

Each result row includes a small division tag. Cross-division items get a globe icon.

---

## Component Library (Reusable)

### Status Tag Chip

```
[on track]    -> text: #22C55E, bg: #052E16
[at risk]     -> text: #EAB308, bg: #422006
[OVERDUE]     -> text: #EF4444, bg: #450A0A
[blocked]     -> text: #F97316, bg: #431407
[active]      -> text: #3B82F6, bg: #172554
[superseded]  -> text: #6B7280, bg: #1F2937
[resolved]    -> text: #22C55E, bg: #052E16
```
Height: 22px. H-padding: 8px. Radius: 4px. 11px, semibold, uppercase, letter-spacing 0.5px.

### Knowledge Unit Type Badge

```
DECISION     -> bg: #1E3A5F, text: #3B82F6
FACT         -> bg: #052E16, text: #22C55E
COMMITMENT   -> bg: #2E1065, text: #A855F7
QUESTION     -> bg: #422006, text: #EAB308
SENTIMENT    -> bg: #500724, text: #EC4899
OWNERSHIP    -> bg: #1E1B4B, text: #6366F1
```
Height: 20px. H-padding: 6px. Radius: 3px. 10px, uppercase, semibold.

### Division Scope Badge

```
[NA]          -> bg: #172554, text: #60A5FA
[EMEA]        -> bg: #1E3A2F, text: #4ADE80
[APAC]        -> bg: #3B1764, text: #C084FC
[ENTERPRISE]  -> bg: #422006, text: #FBBF24
[CROSS-DIV]   -> bg: #431407, text: #FB923C, with globe icon
```
Height: 18px. H-padding: 6px. Radius: 3px. 10px, uppercase, medium.

### Cognitive Load Bar

Horizontal bar, 100% width of its container, 8px height, 4px radius.
- Track: `#1F2937`
- Fill color by value: `#22C55E` (0-50), `#EAB308` (50-70), `#F97316` (70-90), `#EF4444` (90-100)
- Value label: right-aligned above bar, 14px JetBrains Mono semibold, colored to match fill. "72 / 100"

### Freshness Indicator

8px dot + score. `● 0.28` green, `● 0.71` amber, `● 1.41` red. 12px JetBrains Mono.

### Primary Button

`#3B82F6` bg, `#FFFFFF` text, 13px Inter semibold, 36px height, 12px h-padding, 6px radius. Hover: `#2563EB`. Active: `#1D4ED8`.

### Ghost Button

Transparent bg, `#3B82F6` text + 1px border, same dimensions. Hover: 10% fill. Active: 20% fill.

### Breadcrumb

Inline path: "Acme Corp > Engineering > Payments." Each segment is a link in 13px Inter medium, `#6B7280`. Current segment (last) is `#F9FAFB`, non-clickable. Separator `>` in `#374151`. Clicking a parent segment zooms back out to that level.

### Feedback Widget (Universal)

Appears on every knowledge delivery surface: alert cards, briefing items, query response items, decision thread nodes.

**Collapsed state:**
```
[Useful ✓]  [Not useful ✗]
```
Two ghost buttons, 24px height, 8px h-padding, 4px radius. Text: 11px Inter medium. Default: `#374151` text, transparent bg. Hover: `#22C55E` text for Useful, `#EF4444` text for Not useful.

**Expanded state (after "Not useful"):**
```
[Outdated info]  [Wrong audience]  [Already knew]  [Not actionable]  [Incorrect]
[Add a note...                                                               ]
```
Reason chips: pill-shaped, 22px height, `#1F2937` bg, `#9CA3AF` text, 11px. Hover: `#374151` bg. Active (selected): colored by type — `#EAB308` for Outdated, `#3B82F6` for Wrong audience, `#6B7280` for Already knew, `#F97316` for Not actionable, `#EF4444` for Incorrect.
Note input: 100% width, 32px height, `#1F2937` bg, `#374151` border, 13px text, `#9CA3AF` placeholder.

**Confirmed state:**
```
✓ Noted — improving your experience.
```
12px `#22C55E`, fades to `#374151` after 3 seconds.

### Correction Widget

Appears on Fact and Decision nodes on hover (pencil icon trigger).

**Trigger:** Pencil icon, 12px, `#374151`, right-aligned. Hover: `#9CA3AF`.

**Expanded form:** Inline card, `#111827` bg, `#374151` border (1px), 8px radius, 12px padding.
- Current value: 13px `#9CA3AF` with strikethrough style
- Reason chips: `[Outdated]` `[Incorrect]` `[Partially correct]` — same chip style as Feedback Widget
- Updated value input: 100% width, 36px height, `#1F2937` bg, 14px `#F9FAFB`
- Buttons: [Submit Correction] primary, [Cancel] ghost

### Endorsement Widget

Appears on Fact nodes on hover (checkmark icon trigger).

**Trigger:** Checkmark icon, 12px, `#374151`, left of pencil icon. Hover: `#22C55E`.

**After click:** Checkmark turns solid `#22C55E`. Tooltip: "Validated by you — freshness score reset." The fact's `last_validated` timestamp updates to now. Staleness score recalculates.

### Learning Indicator

Small inline element showing NEXUS has adapted based on feedback. Appears contextually when a delivery was adjusted by past feedback.

```
🧠 Adjusted based on your feedback
```
10px, `#A855F7` (purple), italic. Appears below items that were re-ranked, re-routed, or suppressed because of prior feedback signals. Example: an alert that would have been "Important" tier was promoted to "Critical" because the user previously marked similar alerts as "Useful." The learning indicator explains why.

At enterprise scale, a variant exists for admin-level adjustments:
```
🧠 Adjusted by org-wide calibration
```
10px, `#6366F1` (indigo), italic. Appears when routing was adjusted by an admin applying a calibration recommendation (e.g., "Reduce Finance alerts to APAC Operations").

---

## Demo Flow Mapped to Screens (3 Minutes)

This is the exact sequence for the pitch. Each transition is one click. **The demo now includes a "scale moment" that shows enterprise applicability.**

### 0:00 — 0:25 | The Pulse at Enterprise Scale (Scale Moment)

Open on View 1 at **L1 — Enterprise zoom level.** The audience sees 4-5 large division nodes: NA, EMEA, APAC, etc. Particles flow between them. One cross-division edge glows red.

**What to say:** "This is NEXUS. You're looking at a 2,300-person company across 4 divisions. Each node is an entire division. The flowing particles are knowledge moving between them. Green means healthy. That red line between NA and EMEA? That's a cross-division contradiction NEXUS caught automatically — the most expensive kind of organizational failure."

**What to show:** The 4-5 division nodes, pulsing with aggregate health colors. The red cross-division alert. The stats strip showing "4 divisions | 47 teams | 2,340 people."

### 0:25 — 0:50 | Zoom Into a Division (Depth Moment)

Double-click the NA division node. Watch it expand to show departments within NA. Then double-click Engineering. Watch it expand to show teams. Then double-click the Payments team. Now we're at the individual person level.

**What to say:** "Now watch. I double-click North America — it opens to show departments. Click Engineering — I see teams. Click Payments — I see individual people. Same interface from 2,000-person division to 5-person team. Three clicks from boardroom to the engineer writing code."

**What to show:** The zoom animation — division expanding into departments into teams into people. The breadcrumb building: "Acme Corp > NA > Engineering > Payments." The stats strip updating at each level.

### 0:50 — 1:20 | The Alert (Intelligence Moment)

Click the red lightning bolt (visible at any zoom level). Navigate to View 2 (Alerts). The cross-division Contradiction card is expanded.

**What to say:** "Here's that contradiction. NA Product set the launch date for March 15. EMEA Engineering is working toward April 1. Neither team knew. NEXUS shows the blast radius: 12 teams across 2 divisions, 2 customers told the wrong date, a marketing campaign in 3 regions pointing to the wrong date. One click to resolve — NEXUS notifies all 12 teams simultaneously."

**What to show:** The cross-division label, the blast radius number (12 teams, 2 divisions), the resolution button. Emphasize that at scale, this kind of contradiction costs millions.

### 1:20 — 1:55 | Decision Archaeology (Trace Moment)

Click [Trace Decision Chain ->]. Now on View 4. The causal chain is visible with division tags at each node.

**What to say:** "NEXUS traces the decision backward. The launch date was set in NA — informed by a cost analysis from EMEA Finance, prompted by a question from the global CFO, triggered by an EMEA quarterly review. Five steps. Three weeks. Two divisions. One chain. A new joiner can understand in 30 seconds what took the organization a month to figure out."

**What to show:** Scroll through the chain. Point at the division tags changing from [NA] to [EMEA] as you go down — showing cross-division information flow. Point at downstream impact grouped by division.

### 1:55 — 2:35 | Ask NEXUS (Interaction Moment)

Navigate to View 3. Type or speak: "Is anything about to go wrong?"

**What to say:** "And you can just ask."

**What to show:** The response — three enterprise-wide items with division tags. A cross-division contradiction, a strategic drift in NA, an overloaded leader in EMEA. "NEXUS sees across every division, every team, every conversation. It answers in 3 seconds what would take a chief of staff 3 days to research."

### 2:35 — 2:50 | The Learning Loop (Trust Moment)

Stay on View 3 (Ask NEXUS response visible). Click "Not useful" on the drift alert item. The reason picker expands. Click "Already knew."

**What to say:** "And here's what makes this work at a 10,000-person company. Every piece of information NEXUS delivers has a feedback loop. I just told NEXUS I already knew about the drift. It learns. Next time, it won't push that type of insight to me — it'll put it in my on-demand feed instead. Multiply that by 10,000 employees giving feedback every day, and within 90 days NEXUS has processed over 2 million learning signals. It gets smarter for every person, every team, every division — automatically."

**What to show:** The "Not useful" click, the reason picker, the confirmation "Noted — improving your experience." Point at the NEXUS Memory icon (brain icon, subtle purple badge). "Every user has a learning profile. Every correction feeds back into the knowledge graph. The system doesn't just deliver information — it metabolizes your feedback to get more precise every single day."

### 2:50 — 3:00 | Close (Vision Moment)

Navigate back to View 1. Zoom all the way back out to L1 — the full enterprise, pulsing.

**What to say:** "This is NEXUS. A living nervous system that learns. 50 people or 50,000 — the same interface, the same intelligence, the same three clicks from boardroom to individual contributor. It catches contradictions across divisions, traces decisions across continents, and gets smarter from every human interaction. Not more meetings. Not more Slack channels. Organizational intelligence that scales and learns. The AI Chief of Staff."

---

## Technical Notes for Lovable Build

**Framework:** React + TypeScript + Tailwind CSS. Dark theme only.

**Graph rendering:** Use `react-force-graph-2d` (based on d3-force) for the Pulse View. For semantic zoom, implement nested force layouts — each zoom level initializes a new force simulation with the children of the clicked node. Particle animation on edges can be done with a Canvas overlay.

**Semantic zoom implementation:** Maintain a hierarchical data structure (`divisions -> departments -> teams -> people`). At each zoom level, only the current level's nodes are rendered in the force graph. Clicking a node triggers: (1) animate current nodes fading out, (2) initialize force simulation with child nodes, (3) animate child nodes fading in. Store the zoom stack for breadcrumb navigation.

**Layout:** CSS Grid for the global layout (sidebar + content). Flexbox for inner layouts. The sidebar is fixed, content scrolls.

**State:** Each view is a route (`/pulse`, `/alerts`, `/ask`, `/decisions`). Zoom state is a URL param (`/pulse?scope=na&level=department`). Clicking a node or alert passes an ID param.

**Fonts:** Inter (sans-serif) + JetBrains Mono (monospace). Google Fonts.

**Animations:** Framer Motion for panel transitions and zoom animations. CSS transitions for hover states. Canvas for graph particle animations.

**Mock data:** Pre-generate a hierarchical JSON dataset:
- 4 divisions (NA, EMEA, APAC, HQ)
- ~12 departments across divisions
- ~47 teams across departments
- ~50 named people (key individuals for the demo path)
- 25 decisions (5 cross-division), 40 facts, 30 commitments, 15 questions
- 7 active alerts (2 cross-division)
- 1 user learning profile (Maria Chen — 27 learned items, 3 corrections this month)
- Feedback state: pre-populate some items with "🧠 Adjusted based on your feedback" indicators to show the learning loop in action
- Load from a static JSON file. No backend needed for the demo.

**Performance:** At L1-L3, the graph renders < 50 nodes (divisions, departments, or teams). At L4, < 20 nodes (individuals on a team). The force graph never renders hundreds of nodes simultaneously — semantic zoom handles this naturally. 60fps guaranteed.

**Responsive:** Desktop only for the demo. Minimum width: 1280px.

---

*The interface is the argument. When the judges see a 2,300-person organization pulsing on screen, watch it zoom from boardroom to engineer in three clicks, and see the system learn from a single piece of human feedback — they'll understand this isn't a hackathon toy. It's enterprise infrastructure that gets smarter every day it runs.*
