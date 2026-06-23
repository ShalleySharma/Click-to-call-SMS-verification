import { NextResponse } from "next/server";

// In-memory broker keyed by trackingRef.
// This is only for browser-side reporting and does NOT persist across server restarts.
// Works with your requirement: Cloudshope -> /api/call-callback -> UI (SSE), without changing click-to-call URL/credentials.
// Must be shared with app/api/call-callback/route.js via globalThis.
const broker =
  globalThis.__ctc_broker ||
  (globalThis.__ctc_broker = {
    // trackingRef -> { status: 'pending'|'ready', payload: any, createdAt: number }
    items: new Map(),
    // trackingRef -> Set<response-writers>
    listeners: new Map(),
  });

function safeString(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const trackingRef = safeString(searchParams.get("trackingRef"));

  if (!trackingRef) {
    return NextResponse.json(
      { ok: false, error: "trackingRef is required" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let controllerClosed = false;

      const safeClose = () => {
        if (controllerClosed) return;
        controllerClosed = true;
        try {
          controller.close();
        } catch {
          // ignore: controller might already be closed
        }
      };

      const send = (event, data) => {
        if (controllerClosed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // If client disconnected, controller may already be closed.
          safeClose();
        }
      };

      // If already ready, push immediately.
      const item = broker.items.get(trackingRef);
      if (item?.status === "ready") {
        send("ready", item.payload);
        safeClose();
        return;
      }

      // Otherwise, keep connection open until callback arrives or timeout.
      const createdAt = Date.now();
      const timeoutMs = 120000; // 2 minutes

      let writers = broker.listeners.get(trackingRef);
      if (!writers) {
        writers = new Set();
        broker.listeners.set(trackingRef, writers);
      }

      writers.add({
        send,
        close: safeClose,
      });

      send("open", { ok: true });

      const interval = setInterval(() => {
        if (Date.now() - createdAt <= timeoutMs) return;

        try {
          send("timeout", {
            ok: false,
            error: "No callback received in time",
          });
        } finally {
          clearInterval(interval);

          // Cleanup listener
          const set = broker.listeners.get(trackingRef);
          if (set) {
            for (const w of Array.from(set)) {
              if (w?.send === send) set.delete(w);
            }
            if (!set.size) broker.listeners.delete(trackingRef);
          }

          safeClose();
        }
      }, 2000);

      // If client closes connection, cleanup.
      controller.cancel = () => {
        clearInterval(interval);

        const set = broker.listeners.get(trackingRef);
        if (set) {
          for (const w of Array.from(set)) {
            if (w?.send === send) set.delete(w);
          }
          if (!set.size) broker.listeners.delete(trackingRef);
        }

        safeClose();
      };
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// Broker is shared via globalThis; no exports required.

