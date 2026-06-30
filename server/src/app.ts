import { join } from "node:path";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import { config } from "./config.js";
import type { DB } from "./db.js";
import { resolveSessionUser, SESSION_COOKIE } from "./auth.js";
import type { User } from "./types.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerBoardRoutes } from "./routes/board.js";
import { registerAdminRoutes } from "./routes/admin.js";

declare module "fastify" {
  interface FastifyInstance {
    db: DB;
  }
  interface FastifyRequest {
    user: User | null;
  }
}

export function buildApp(db: DB): FastifyInstance {
  const app = Fastify({
    logger: config.isProd ? true : { level: "info" },
  });

  app.decorate("db", db);
  app.decorateRequest("user", null);

  app.register(cookie);

  // Public config the browser needs before login (owner branding + client id).
  app.get("/api/config", async () => ({
    ownerName: config.ownerName,
    googleClientId: config.googleClientId,
    devLogin: config.devLogin && !config.isProd,
  }));

  app.get("/api/health", async () => ({ ok: true }));

  registerAuthRoutes(app);
  registerBoardRoutes(app);
  registerAdminRoutes(app);

  // Optionally serve the built SPA (single-container deploy). API routes are
  // registered first; everything else falls back to index.html for client-side
  // routing, while unknown /api paths still return JSON 404.
  if (config.staticDir) {
    app.register(fastifyStatic, { root: config.staticDir, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}

/** preHandler: require a valid session; sets request.user or replies 401. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = resolveSessionUser(req.server.db, req.cookies[SESSION_COOKIE]);
  if (!user) {
    await reply.code(401).send({ error: "Not signed in." });
    return;
  }
  req.user = user;
}

/** preHandler: require an admin session; replies 401/403 as appropriate. */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = resolveSessionUser(req.server.db, req.cookies[SESSION_COOKIE]);
  if (!user) {
    await reply.code(401).send({ error: "Not signed in." });
    return;
  }
  if (user.role !== "admin") {
    await reply.code(403).send({ error: "Admin only." });
    return;
  }
  req.user = user;
}
