import type { FastifyInstance } from "fastify";
import { requireUser } from "../app.js";
import { bus } from "../events.js";
import {
  buildAllPollViews,
  buildPollView,
  createPoll,
  deletePoll,
  getPoll,
  setUserVotes,
} from "../polls.js";

const MAX_OPTIONS = 20;

interface CreateBody {
  title?: string;
  options?: unknown;
}
interface VoteBody {
  optionIds?: unknown;
}

export function registerPollRoutes(app: FastifyInstance): void {
  app.get("/api/polls", { preHandler: requireUser }, async (req) => ({
    polls: buildAllPollViews(app.db, req.user!),
  }));

  app.post("/api/polls", { preHandler: requireUser }, async (req, reply) => {
    const { title, options } = (req.body ?? {}) as CreateBody;
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
    const id = createPoll(app.db, { title: cleanTitle, options: cleanOptions, createdBy: req.user!.id }, now);
    bus.publish("polls");
    return buildPollView(app.db, getPoll(app.db, id)!, req.user!);
  });

  app.post("/api/polls/:id/vote", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const poll = getPoll(app.db, id);
    if (!poll) return reply.code(404).send({ error: "No such poll." });

    const { optionIds } = (req.body ?? {}) as VoteBody;
    const ids = Array.isArray(optionIds) ? optionIds.filter((x): x is string => typeof x === "string") : [];
    setUserVotes(app.db, id, req.user!.id, ids, new Date().toISOString());
    bus.publish("polls");
    return buildPollView(app.db, poll, req.user!);
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
