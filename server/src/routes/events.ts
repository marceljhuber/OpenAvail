import type { FastifyInstance } from "fastify";
import { requireUser } from "../app.js";
import { bus } from "../events.js";

export function registerEventRoutes(app: FastifyInstance): void {
  // Server-Sent Events stream. Clients (EventSource) reconnect automatically.
  app.get("/api/events", { preHandler: requireUser }, (req, reply) => {
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no", // disable proxy buffering (nginx/caddy)
    });
    reply.raw.write("retry: 3000\n\n");

    const send = (channel: string) => reply.raw.write(`data: ${JSON.stringify({ channel })}\n\n`);
    const unsubscribe = bus.subscribe(send);
    const ping = setInterval(() => reply.raw.write(": ping\n\n"), 25000);

    req.raw.on("close", () => {
      clearInterval(ping);
      unsubscribe();
    });

    reply.hijack(); // we own the raw socket now
  });
}
