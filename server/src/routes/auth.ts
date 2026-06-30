import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import {
  AuthError,
  authorizeAndRegister,
  resolveSessionUser,
  sessionCookieOptions,
  startSession,
  verifyGoogleToken,
  SESSION_COOKIE,
} from "../auth.js";
import { deleteSession, upsertUser } from "../repo.js";
import type { Role, User } from "../types.js";

interface GoogleBody {
  credential?: string;
  invite?: string;
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture,
    role: user.role,
  };
}

export function registerAuthRoutes(app: FastifyInstance): void {
  // Exchange a verified Google ID token (+ optional invite) for a session.
  app.post("/api/auth/google", async (req, reply) => {
    const { credential, invite } = (req.body ?? {}) as GoogleBody;
    if (!credential) {
      return reply.code(400).send({ error: "Missing credential." });
    }
    try {
      const profile = await verifyGoogleToken(credential);
      const now = new Date().toISOString();
      const user = authorizeAndRegister(app.db, profile, invite, now);
      const session = startSession(app.db, user.id, now);
      reply.setCookie(SESSION_COOKIE, session.id, sessionCookieOptions());
      return { user: publicUser(user) };
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.status).send({ error: err.message });
      }
      req.log.error(err);
      return reply.code(500).send({ error: "Sign-in failed." });
    }
  });

  // Current signed-in user (or 401).
  app.get("/api/me", async (req, reply) => {
    const user = resolveSessionUser(app.db, req.cookies[SESSION_COOKIE]);
    if (!user) return reply.code(401).send({ error: "Not signed in." });
    return { user: publicUser(user) };
  });

  // Destroy the session and clear the cookie.
  app.post("/api/auth/logout", async (req, reply) => {
    const sid = req.cookies[SESSION_COOKIE];
    if (sid) deleteSession(app.db, sid);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  // Dev-only login (no Google). Strictly gated: requires DEV_LOGIN=true AND a
  // non-production NODE_ENV. Lets you exercise the app locally without OAuth.
  if (config.devLogin && !config.isProd) {
    app.post("/api/auth/dev", async (req, reply) => {
      const { name, email } = (req.body ?? {}) as { name?: string; email?: string };
      if (!name?.trim()) return reply.code(400).send({ error: "Name required." });
      const cleanEmail = (email?.trim() || `${name.trim().toLowerCase()}@dev.local`).toLowerCase();
      const now = new Date().toISOString();
      const role: Role = cleanEmail === config.adminEmail ? "admin" : "member";
      const user = upsertUser(app.db, {
        id: `dev-${cleanEmail}`,
        email: cleanEmail,
        name: name.trim(),
        picture: "",
        role,
        createdAt: now,
      });
      const session = startSession(app.db, user.id, now);
      reply.setCookie(SESSION_COOKIE, session.id, sessionCookieOptions());
      return { user: publicUser(user) };
    });
    app.log.warn("DEV_LOGIN enabled — /api/auth/dev is active (non-production only).");
  }
}
