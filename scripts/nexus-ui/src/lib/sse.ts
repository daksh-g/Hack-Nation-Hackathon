/**
 * SSE (Server-Sent Events) streaming helper for NEXUS LLM endpoints.
 * Includes fallback for demo mode when backend is unavailable.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const STREAM_TIMEOUT_MS = 5000;

export interface SSECallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
}

/**
 * Stream a POST endpoint that returns SSE events.
 * Falls back to simulated streaming from static text if backend unavailable.
 */
export async function streamPost(
  path: string,
  body: Record<string, unknown>,
  callbacks: SSECallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  try {
    const controller = new AbortController();
    const signal = abortSignal
      ? abortSignal
      : controller.signal;

    const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    clearTimeout(timeout);

    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      if (abortSignal?.aborted) {
        reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

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
  } catch {
    // Backend unavailable — simulate streaming from fallback text
    callbacks.onError?.('Backend unavailable, using offline mode');
  }
}

/**
 * Simulate streaming by emitting characters from a static string at intervals.
 */
export function simulateStream(
  text: string,
  callbacks: SSECallbacks,
  charIntervalMs: number = 15,
  abortSignal?: AbortSignal,
): void {
  let i = 0;
  const interval = setInterval(() => {
    if (abortSignal?.aborted) {
      clearInterval(interval);
      return;
    }
    if (i < text.length) {
      // Emit a chunk of chars for natural pacing
      const chunk = text.slice(i, i + 3);
      callbacks.onToken(chunk);
      i += 3;
    } else {
      clearInterval(interval);
      callbacks.onDone();
    }
  }, charIntervalMs);
}
