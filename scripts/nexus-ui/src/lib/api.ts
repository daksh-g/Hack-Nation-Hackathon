import type { GraphData, Hierarchy, Alert, AskResponse, DecisionChain, InfoDropResponse, GraphNode, GraphEdge } from '../types/graph';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TIMEOUT_MS = 3000;
const LLM_TIMEOUT_MS = 30000;

async function fetchWithFallback<T>(path: string, fallbackPath: string, options?: RequestInit & { timeout?: number }): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeout ?? TIMEOUT_MS);
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    // Demo mode fallback: load from static JSON
    const res = await fetch(fallbackPath);
    return res.json();
  }
}

export async function getGraph(): Promise<GraphData> {
  return fetchWithFallback('/api/graph', '/mock_data/graph.json');
}

export async function getHierarchy(): Promise<Hierarchy> {
  return fetchWithFallback('/api/graph/hierarchy', '/mock_data/hierarchy.json');
}

export async function getNodeDetail(id: string): Promise<{ node: GraphNode; edges: GraphEdge[]; connected_nodes: GraphNode[] }> {
  return fetchWithFallback(`/api/graph/node/${id}`, '/mock_data/graph.json');
}

export async function getAlerts(): Promise<{ alerts: Alert[] }> {
  const data = await fetchWithFallback<{ alerts?: Alert[] } | Alert[]>('/api/alerts', '/mock_data/alerts.json');
  // Mock file is a raw array; API returns { alerts: [...] }
  if (Array.isArray(data)) return { alerts: data };
  return { alerts: data.alerts ?? [] };
}

export async function resolveAlert(id: string): Promise<{ alert: Alert; affected_nodes: string[] }> {
  return fetchWithFallback(`/api/alerts/${id}/resolve`, '/mock_data/alerts.json', { method: 'POST' });
}

export async function getDecisions(): Promise<{ cross_division: GraphNode[]; by_division: Record<string, GraphNode[]> }> {
  const data = await fetchWithFallback<{ cross_division?: GraphNode[]; by_division?: Record<string, GraphNode[]>; nodes?: GraphNode[] }>('/api/decisions', '/mock_data/graph.json');
  // If falling back to graph.json, extract decision/commitment nodes and group by division
  if (data.nodes && !data.cross_division) {
    const decisionTypes = new Set(['decision', 'commitment', 'question']);
    const decisions = data.nodes.filter(n => decisionTypes.has(n.type));
    const crossDiv: GraphNode[] = [];
    const byDiv: Record<string, GraphNode[]> = {};
    for (const d of decisions) {
      const div = d.division ?? 'Unknown';
      // Cross-division if blast_radius > 3 or multiple divisions affected
      if ((d.blast_radius ?? 0) > 3) {
        crossDiv.push(d);
      } else {
        if (!byDiv[div]) byDiv[div] = [];
        byDiv[div].push(d);
      }
    }
    return { cross_division: crossDiv, by_division: byDiv };
  }
  return { cross_division: data.cross_division ?? [], by_division: data.by_division ?? {} };
}

export async function getDecisionChain(id: string): Promise<DecisionChain> {
  return fetchWithFallback(`/api/decisions/${id}/chain`, '/mock_data/graph.json');
}

export async function askNexus(query: string): Promise<AskResponse> {
  return fetchWithFallback('/api/ask', '/mock_data/ask_cache.json', {
    method: 'POST',
    body: JSON.stringify({ query }),
    timeout: LLM_TIMEOUT_MS,
  });
}

export async function infoDrop(text: string): Promise<InfoDropResponse> {
  return fetchWithFallback('/api/info', '/mock_data/graph.json', {
    method: 'POST',
    body: JSON.stringify({ text }),
    timeout: LLM_TIMEOUT_MS,
  });
}

export async function submitFeedback(nodeId: string, useful: boolean, reason?: string): Promise<{ acknowledged: boolean }> {
  return fetchWithFallback('/api/feedback', '/mock_data/graph.json', {
    method: 'POST',
    body: JSON.stringify({ node_id: nodeId, useful, reason }),
  });
}

// ── New LLM-powered endpoints ──────────────────────────────────────────────

export async function runImmuneScan(): Promise<unknown> {
  return fetchWithFallback('/api/immune/scan', '/mock_data/alerts.json', {
    method: 'POST',
    timeout: LLM_TIMEOUT_MS,
  });
}

export async function runSingleImmuneScan(agent: string): Promise<unknown> {
  return fetchWithFallback(`/api/immune/scan/${agent}`, '/mock_data/alerts.json', {
    method: 'POST',
    timeout: LLM_TIMEOUT_MS,
  });
}

export async function generateBriefing(personId: string): Promise<unknown> {
  return fetchWithFallback('/api/briefing/generate', '/mock_data/graph.json', {
    method: 'POST',
    body: JSON.stringify({ person_id: personId }),
    timeout: LLM_TIMEOUT_MS,
  });
}

export async function generateOnboarding(teamName: string, division: string): Promise<unknown> {
  return fetchWithFallback('/api/briefing/onboarding', '/mock_data/graph.json', {
    method: 'POST',
    body: JSON.stringify({ team_name: teamName, division }),
    timeout: LLM_TIMEOUT_MS,
  });
}

export async function ingestText(text: string, sourceType: string = 'human'): Promise<unknown> {
  return fetchWithFallback('/api/ingest', '/mock_data/graph.json', {
    method: 'POST',
    body: JSON.stringify({ text, source_type: sourceType }),
    timeout: LLM_TIMEOUT_MS,
  });
}

export async function getLLMUsage(): Promise<unknown> {
  return fetchWithFallback('/api/llm/usage', '/mock_data/graph.json');
}

export async function getWorkerStatus(): Promise<unknown> {
  return fetchWithFallback('/api/workers/status', '/mock_data/graph.json');
}

export async function analyzeWorkers(): Promise<unknown> {
  return fetchWithFallback('/api/workers/analyze', '/mock_data/graph.json', {
    method: 'POST',
    timeout: LLM_TIMEOUT_MS,
  });
}
