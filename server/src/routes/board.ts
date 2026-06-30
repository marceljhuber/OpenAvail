import type { FastifyInstance } from "fastify";
import { requireUser } from "../app.js";
import { applyVote, buildState, isIsoDate } from "../board.js";
import type { Vote } from "../types.js";

const VOTES: Vote[] = ["yes", "maybe", "no"];

interface VoteBody {
  date?: string;
  vote?: Vote | null;
}

export function registerBoardRoutes(app: FastifyInstance): void {
  // Board state for the requested inclusive date range (members + votes + log).
  app.get("/api/state", { preHandler: requireUser }, async (req) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const validRange = isIsoDate(from) && isIsoDate(to);
    return buildState(app.db, validRange ? from : undefined, validRange ? to : undefined);
  });

  // Cast/toggle a vote for the *session* user — identity is never taken from
  // the request body, which is what makes this safe to expose publicly.
  app.post("/api/vote", { preHandler: requireUser }, async (req, reply) => {
    const { date, vote } = (req.body ?? {}) as VoteBody;
    if (!isIsoDate(date)) {
      return reply.code(400).send({ error: "Invalid date." });
    }
    if (vote !== null && vote !== undefined && !VOTES.includes(vote)) {
      return reply.code(400).send({ error: "Invalid vote." });
    }
    const now = new Date().toISOString();
    const result = applyVote(app.db, req.user!, date, vote ?? null, now);
    return { date, ...result };
  });
}
