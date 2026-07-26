import type { FastifyInstance } from "fastify";
import { requireAdmin, requireUser } from "../app.js";
import { isIsoDate } from "../board.js";
import { bus } from "../events.js";
import {
  buildAllDayEventViews,
  buildDayEventView,
  deleteDayEvent,
  getDayEvent,
  MAX_ATTENDEES,
  MAX_LINKS,
  normalizeColor,
  upsertDayEvent,
} from "../dayEvents.js";
import type { DayEventInput } from "../types.js";

interface SaveBody {
  title?: string;
  color?: string;
  description?: string;
  links?: { url?: string; label?: string }[];
  attendees?: { userId?: string | null; name?: string }[];
}

export function registerDayEventRoutes(app: FastifyInstance): void {
  // Every event, newest first. Small enough to load in one go, and it powers
  // both the Events tab and the calendar's per-day chips.
  app.get("/api/day-events", { preHandler: requireUser }, async (req) => ({
    events: buildAllDayEventViews(app.db, req.user!),
  }));

  app.get("/api/day-events/:date", { preHandler: requireUser }, async (req, reply) => {
    const { date } = req.params as { date: string };
    if (!isIsoDate(date)) return reply.code(400).send({ error: "Invalid date." });
    const ev = getDayEvent(app.db, date);
    if (!ev) return reply.code(404).send({ error: "No event on that day." });
    return buildDayEventView(app.db, ev, req.user!);
  });

  // Create-or-replace. The editor saves the whole event at once, so links and
  // attendees are replaced wholesale rather than patched item by item.
  app.put("/api/day-events/:date", { preHandler: requireAdmin }, async (req, reply) => {
    const { date } = req.params as { date: string };
    if (!isIsoDate(date)) return reply.code(400).send({ error: "Invalid date." });

    const body = (req.body ?? {}) as SaveBody;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return reply.code(400).send({ error: "Give the event a title." });

    const links = Array.isArray(body.links) ? body.links : [];
    if (links.length > MAX_LINKS) {
      return reply.code(400).send({ error: `At most ${MAX_LINKS} links.` });
    }
    const attendees = Array.isArray(body.attendees) ? body.attendees : [];
    if (attendees.length > MAX_ATTENDEES) {
      return reply.code(400).send({ error: `At most ${MAX_ATTENDEES} attendees.` });
    }

    const input: DayEventInput = {
      title,
      color: normalizeColor(body.color),
      description: typeof body.description === "string" ? body.description : "",
      links: links.map((l) => ({ url: String(l?.url ?? ""), label: l?.label })),
      attendees: attendees.map((a) => ({ userId: a?.userId ?? null, name: a?.name })),
    };

    upsertDayEvent(app.db, date, input, req.user!, new Date().toISOString());
    bus.publish("dayEvents");
    return buildDayEventView(app.db, getDayEvent(app.db, date)!, req.user!);
  });

  app.delete("/api/day-events/:date", { preHandler: requireAdmin }, async (req, reply) => {
    const { date } = req.params as { date: string };
    if (!isIsoDate(date)) return reply.code(400).send({ error: "Invalid date." });
    if (!getDayEvent(app.db, date)) {
      return reply.code(404).send({ error: "No event on that day." });
    }
    deleteDayEvent(app.db, date);
    bus.publish("dayEvents");
    return { ok: true };
  });
}
