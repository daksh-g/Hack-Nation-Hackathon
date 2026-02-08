import type { GraphData, Hierarchy, Alert, AskResponse, DecisionChain, InfoDropResponse, GraphNode, GraphEdge } from '../types/graph';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TIMEOUT_MS = 3000;

async function fetchWithFallback<T>(path: string, fallbackPath: string, options?: RequestInit): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
  return fetchWithFallback('/api/alerts', '/mock_data/alerts.json');
}

export async function resolveAlert(id: string): Promise<{ alert: Alert; affected_nodes: string[] }> {
  return fetchWithFallback(`/api/alerts/${id}/resolve`, '/mock_data/alerts.json', { method: 'POST' });
}

export async function getDecisions(): Promise<{ cross_division: GraphNode[]; by_division: Record<string, GraphNode[]> }> {
  return fetchWithFallback('/api/decisions', '/mock_data/graph.json');
}

export async function getDecisionChain(id: string): Promise<DecisionChain> {
  return fetchWithFallback(`/api/decisions/${id}/chain`, '/mock_data/graph.json');
}

export async function askNexus(query: string): Promise<AskResponse> {
  return fetchWithFallback('/api/ask', '/mock_data/ask_cache.json', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export async function infoDrop(text: string): Promise<InfoDropResponse> {
  return fetchWithFallback('/api/info', '/mock_data/graph.json', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function submitFeedback(nodeId: string, useful: boolean, reason?: string): Promise<{ acknowledged: boolean }> {
  return fetchWithFallback('/api/feedback', '/mock_data/graph.json', {
    method: 'POST',
    body: JSON.stringify({ node_id: nodeId, useful, reason }),
  });
}
