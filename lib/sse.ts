// Server-Sent Events helper (spec v2 §5). Returns a streaming Response that runs `handler`,
// emitting JSON events as `data: {...}\n\n`. Vercel-friendly: plain Next streaming, no Redis/worker.
export type SSEvent =
  | { type: "step"; label: string; progress: number; detail?: string }
  | { type: "done"; payload?: unknown }
  | { type: "error"; message: string };

export function sseResponse(handler: (emit: (e: SSEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: SSEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          /* stream already closed */
        }
      };
      try {
        await handler(emit);
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
