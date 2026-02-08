/**
 * SSE (Server-Sent Events) streaming helper for NEXUS LLM endpoints.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface SSECallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
}

/**
 * Stream a POST endpoint that returns SSE events.
 * Events have format: data: {"type": "token"|"done"|"error", "content": "..."}
 */
export async function streamPost(
  path: string,
  body: Record<string, unknown>,
  callbacks: SSECallbacks,
): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    callbacks.onError?.(`HTTP ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const payload = JSON.parse(line.slice(6));
        if (payload.type === 'token') {
          callbacks.onToken(payload.content);
        } else if (payload.type === 'done') {
          callbacks.onDone();
          return;
        } else if (payload.type === 'error') {
          callbacks.onError?.(payload.content);
          return;
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  callbacks.onDone();
}
