import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { requireAdmin } from "../app.js";
import { makeInviteToken } from "../auth.js";
import { bus } from "../events.js";
import {
  createInvite,
  deleteUser,
  getUserById,
  listInvites,
  listMembers,
  revokeInvite,
} from "../repo.js";
import type { Invite } from "../types.js";

function inviteUrl(token: string): string {
  return `${config.publicUrl}/?invite=${token}`;
}

function decorateInvite(invite: Invite, nowISO: string) {
  const expired = invite.expiresAt <= nowISO;
  return {
    token: invite.token,
    url: inviteUrl(invite.token),
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    revoked: invite.revoked,
    active: !invite.revoked && !expired,
  };
}

export function registerAdminRoutes(app: FastifyInstance): void {
  // Create a reusable invite link valid for config.inviteTtlMs (~24h).
  app.post("/api/invites", { preHandler: requireAdmin }, async (req) => {
    const now = new Date();
    const nowISO = now.toISOString();
    const expiresAt = new Date(now.getTime() + config.inviteTtlMs).toISOString();
    const token = makeInviteToken();
    const invite = createInvite(app.db, token, req.user!.id, nowISO, expiresAt);
    return decorateInvite(invite, nowISO);
  });

  app.get("/api/invites", { preHandler: requireAdmin }, async () => {
    const nowISO = new Date().toISOString();
    return { invites: listInvites(app.db).map((i) => decorateInvite(i, nowISO)) };
  });

  app.delete("/api/invites/:token", { preHandler: requireAdmin }, async (req) => {
    const { token } = req.params as { token: string };
    revokeInvite(app.db, token);
    return { ok: true };
  });

  app.get("/api/members", { preHandler: requireAdmin }, async () => ({
    members: listMembers(app.db),
  }));

  // Remove a member (and their votes via ON DELETE CASCADE). Admins are protected.
  app.delete("/api/members/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const target = getUserById(app.db, id);
    if (!target) return reply.code(404).send({ error: "No such member." });
    if (target.role === "admin") {
      return reply.code(400).send({ error: "Cannot remove an admin." });
    }
    deleteUser(app.db, id);
    bus.publish("board");
    return { ok: true };
  });
}
