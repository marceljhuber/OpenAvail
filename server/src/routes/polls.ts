import type { FastifyInstance } from "fastify";
import { requireUser } from "../app.js";
import { bus } from "../events.js";
import {
  addOption,
  buildAllPollViews,
  buildPollView,
  closePoll,
  createPoll,
  deleteOption,
  deletePoll,
  getPoll,
  listOptions,
  renameOption,
  reopenPoll,
  setUserVotes,
  updatePoll,
} from "../polls.js";
import type { PollMode } from "../types.js";

const MAX_OPTIONS = 20;

interface CreateBody {
  title?: string;
  options?: unknown;
  mode?: unknown;
}
interface VoteBody {
  optionIds?: unknown;
}

const cleanMode = (m: unknown): PollMode | undefined =>
  m === "single" ? "single" : m === "multi" ? "multi" : undefined;
const cleanLabel = (l: unknown): string =>
  typeof l === "string" ? l.trim().slice(0, 120) : "";

/** Manager guard shared by the edit routes. Returns the poll or sends an error. */
function requireManagedPoll(app: FastifyInstance, req: any, reply: any) {
  const { id } = req.params as { id: string };
  const poll = getPoll(app.db, id);
  if (!poll) {
    reply.code(404).send({ error: "No such poll." });
    return null;
  }
  const canManage = req.user!.role === "admin" || poll.createdBy === req.user!.id;
  if (!canManage) {
    reply.code(403).send({ error: "Only the creator or an admin can edit this." });
    return null;
  }
  return poll;
}

export function registerPollRoutes(app: FastifyInstance): void {
  app.get("/api/polls", { preHandler: requireUser }, async (req) => ({
    polls: buildAllPollViews(app.db, req.user!),
  }));

  app.post("/api/polls", { preHandler: requireUser }, async (req, reply) => {
    const { title, options, mode } = (req.body ?? {}) as CreateBody;
    const cleanTitle = typeof title === "string" ? title.trim().slice(0, 200) : "";
    if (!cleanTitle) return reply.code(400).send({ error: "Title is required." });

    const cleanOptions = Array.isArray(options)
      ? options
          .filter((o): o is string => typeof o === "string")
          .map((o) => o.trim().slice(0, 120))
          .filter((o) => o.length > 0)
          .slice(0, MAX_OPTIONS)
      : [];
    if (cleanOptions.length < 1) {
      return reply.code(400).send({ error: "Add at least one option." });
    }

    const now = new Date().toISOString();
    const id = createPoll(
      app.db,
      { title: cleanTitle, options: cleanOptions, createdBy: req.user!.id, mode: cleanMode(mode) },
      now,
    );
    bus.publish("polls");
    return buildPollView(app.db, getPoll(app.db, id)!, req.user!);
  });

  // Edit a poll's title / single-vs-multi mode — creator or admin only.
  app.patch("/api/polls/:id", { preHandler: requireUser }, async (req, reply) => {
    const poll = requireManagedPoll(app, req, reply);
    if (!poll) return reply;
    const body = (req.body ?? {}) as { title?: unknown; mode?: unknown };
    const patch: { title?: string; mode?: PollMode } = {};
    if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim().slice(0, 200);
    const mode = cleanMode(body.mode);
    if (mode) patch.mode = mode;
    updatePoll(app.db, poll.id, patch);
    bus.publish("polls");
    return buildPollView(app.db, getPoll(app.db, poll.id)!, req.user!);
  });

  // Add an option — creator or admin only.
  app.post("/api/polls/:id/options", { preHandler: requireUser }, async (req, reply) => {
    const poll = requireManagedPoll(app, req, reply);
    if (!poll) return reply;
    const label = cleanLabel((req.body as { label?: unknown } | undefined)?.label);
    if (!label) return reply.code(400).send({ error: "Option text is required." });
    if (listOptions(app.db, poll.id).length >= MAX_OPTIONS) {
      return reply.code(400).send({ error: `A voting can have at most ${MAX_OPTIONS} options.` });
    }
    addOption(app.db, poll.id, label);
    bus.publish("polls");
    return buildPollView(app.db, getPoll(app.db, poll.id)!, req.user!);
  });

  // Rename an option — creator or admin only.
  app.patch("/api/polls/:id/options/:optionId", { preHandler: requireUser }, async (req, reply) => {
    const poll = requireManagedPoll(app, req, reply);
    if (!poll) return reply;
    const { optionId } = req.params as { optionId: string };
    const label = cleanLabel((req.body as { label?: unknown } | undefined)?.label);
    if (!label) return reply.code(400).send({ error: "Option text is required." });
    renameOption(app.db, optionId, label);
    bus.publish("polls");
    return buildPollView(app.db, getPoll(app.db, poll.id)!, req.user!);
  });

  // Delete an option — creator or admin only (last one can't be removed).
  app.delete("/api/polls/:id/options/:optionId", { preHandler: requireUser }, async (req, reply) => {
    const poll = requireManagedPoll(app, req, reply);
    if (!poll) return reply;
    const { optionId } = req.params as { optionId: string };
    if (!deleteOption(app.db, poll.id, optionId)) {
      return reply.code(400).send({ error: "A voting must keep at least one option." });
    }
    bus.publish("polls");
    return buildPollView(app.db, getPoll(app.db, poll.id)!, req.user!);
  });

  app.post("/api/polls/:id/vote", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const poll = getPoll(app.db, id);
    if (!poll) return reply.code(404).send({ error: "No such poll." });
    if (poll.closedAt) return reply.code(409).send({ error: "This voting has ended." });

    const { optionIds } = (req.body ?? {}) as VoteBody;
    const ids = Array.isArray(optionIds) ? optionIds.filter((x): x is string => typeof x === "string") : [];
    setUserVotes(app.db, id, req.user!.id, ids, new Date().toISOString());
    bus.publish("polls");
    return buildPollView(app.db, poll, req.user!);
  });

  // End (or re-open) a voting — creator or admin only.
  app.post("/api/polls/:id/close", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const poll = getPoll(app.db, id);
    if (!poll) return reply.code(404).send({ error: "No such poll." });
    const canManage = req.user!.role === "admin" || poll.createdBy === req.user!.id;
    if (!canManage) return reply.code(403).send({ error: "Only the creator or an admin can end this." });

    const { reopen } = (req.body ?? {}) as { reopen?: boolean };
    if (reopen) reopenPoll(app.db, id);
    else closePoll(app.db, id, new Date().toISOString());
    bus.publish("polls");
    return buildPollView(app.db, getPoll(app.db, id)!, req.user!);
  });

  app.delete("/api/polls/:id", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const poll = getPoll(app.db, id);
    if (!poll) return reply.code(404).send({ error: "No such poll." });
    const canManage = req.user!.role === "admin" || poll.createdBy === req.user!.id;
    if (!canManage) return reply.code(403).send({ error: "Only the creator or an admin can delete this." });
    deletePoll(app.db, id);
    bus.publish("polls");
    return { ok: true };
  });
}
