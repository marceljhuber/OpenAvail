import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { requireUser } from "../app.js";
import { isIsoDate } from "../board.js";
import { bus } from "../events.js";
import { addComment, commentCounts, deleteComment, getComment, listComments } from "../comments.js";

interface AddBody {
  date?: string;
  body?: string;
}

export function registerCommentRoutes(app: FastifyInstance): void {
  // Comment counts per day (for calendar badges).
  app.get("/api/comments/counts", { preHandler: requireUser }, async () => ({
    counts: commentCounts(app.db),
  }));

  // Thread for a single day.
  app.get("/api/comments", { preHandler: requireUser }, async (req, reply) => {
    const { date } = req.query as { date?: string };
    if (!isIsoDate(date)) return reply.code(400).send({ error: "Invalid date." });
    return { comments: listComments(app.db, date) };
  });

  app.post("/api/comments", { preHandler: requireUser }, async (req, reply) => {
    const { date, body } = (req.body ?? {}) as AddBody;
    if (!isIsoDate(date)) return reply.code(400).send({ error: "Invalid date." });
    const clean = typeof body === "string" ? body.trim().slice(0, 1000) : "";
    if (!clean) return reply.code(400).send({ error: "Comment is empty." });

    const comment = {
      id: randomUUID(),
      date,
      userId: req.user!.id,
      userName: req.user!.name,
      body: clean,
      createdAt: new Date().toISOString(),
    };
    addComment(app.db, comment);
    bus.publish("comments");
    return comment;
  });

  app.delete("/api/comments/:id", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const comment = getComment(app.db, id);
    if (!comment) return reply.code(404).send({ error: "No such comment." });
    if (comment.userId !== req.user!.id && req.user!.role !== "admin") {
      return reply.code(403).send({ error: "You can only delete your own comments." });
    }
    deleteComment(app.db, id);
    bus.publish("comments");
    return { ok: true };
  });
}
