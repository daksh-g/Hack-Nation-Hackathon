// NEXUS Data Schema Contract — Source of Truth
// All interfaces from SPECIFICATION.md "Data Schema Contract" section

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    generated_at: string;
    node_count: number;
    edge_count: number;
    company_name: string;
  };
}

export interface GraphNode {
  id: string;
  type: "person" | "agent" | "team" | "decision" | "fact" | "commitment" | "question" | "topic";
  label: string;
  division?: string;
  department?: string;
  team?: string;

  // Person-specific
  role?: string;
  cognitive_load?: number;
  active_commitments?: number;
  pending_decisions?: number;

  // Agent-specific
  agent_type?: "coding" | "research" | "operations" | "customer";
  trust_level?: "autonomous" | "supervised" | "review_required";
  supervising_human?: string;
  active_tasks?: string[];
  delegated_authority_scope?: string;

  // Knowledge unit-specific (Decision, Fact, Commitment, Question)
  content?: string;
  source_type?: "human" | "ai_agent";
  source_id?: string;
  created_at?: string;
  freshness_score?: number;
  half_life_days?: number;
  blast_radius?: number;
  status?: "active" | "superseded" | "resolved";

  // Visual hints (pre-computed for demo reliability)
  health?: "green" | "yellow" | "orange" | "red";
  size?: number;
  x?: number;
  y?: number;
}

export type EdgeType =
  | "DECIDED_BY" | "AFFECTS" | "OWNS" | "BLOCKS" | "DEPENDS_ON"
  | "CONTRADICTS" | "SUPERSEDES" | "ABOUT" | "MEMBER_OF" | "CAN_ANSWER"
  | "EXPERT_IN" | "COMMUNICATES_WITH" | "ASSIGNED_TO" | "REPORTS_TO"
  | "DELEGATES_TO" | "SUPERVISED_BY" | "REVIEWS_OUTPUT_OF"
  | "CONTEXT_FEEDS" | "PRODUCED_BY" | "HANDOFF";

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight?: number;
  interaction_type?: "human-human" | "human-ai" | "ai-ai";
  label?: string;
}

// Semantic Zoom Hierarchy
export interface Hierarchy {
  enterprise: {
    id: string;
    name: string;
    health: "green" | "yellow" | "orange" | "red";
    divisions: Division[];
  };
}

export interface Division {
  id: string;
  name: string;
  health: "green" | "yellow" | "orange" | "red";
  node_count: number;
  alert_count: number;
  departments: Department[];
}

export interface Department {
  id: string;
  name: string;
  health: "green" | "yellow" | "orange" | "red";
  teams: Team[];
}

export interface Team {
  id: string;
  name: string;
  health: "green" | "yellow" | "orange" | "red";
  members: string[];
  edges: string[];
}

// Immune System Alerts
export interface Alert {
  id: string;
  agent: "contradiction" | "coordination" | "staleness" | "silo" | "overload" | "drift";
  severity: "critical" | "warning" | "info";
  scope: "cross-division" | "NA" | "EMEA" | "APAC" | "HQ";
  headline: string;
  detail: string;
  affected_node_ids: string[];
  resolution: {
    authority: string;
    action: string;
    endpoint?: string;
  };
  estimated_cost?: string;
  timestamp: string;
  resolved: boolean;
}

// Ask NEXUS
export interface AskCache {
  queries: {
    [normalized_query: string]: AskResponse;
  };
}

export interface AskResponse {
  items: AskResponseItem[];
  highlight_node_ids: string[];
}

export interface AskResponseItem {
  type: "contradiction" | "staleness" | "silo" | "overload" | "drift" | "answer";
  headline: string;
  detail: string;
  division: string;
  affected_node_ids: string[];
  actions: { label: string; route: string }[];
}

// Decision Archaeology
export interface ChainNode {
  node: GraphNode;
  relationship_to_next: string;
  division: string;
}

export interface DecisionChain {
  chain: ChainNode[];
  downstream_impact: GraphNode[];
}

// Info Drop
export interface InfoDropResponse {
  unit: GraphNode;
  new_edges: GraphEdge[];
  ripple_target: string;
}

// Feedback
export interface FeedbackPayload {
  node_id: string;
  useful: boolean;
  reason?: string;
}
