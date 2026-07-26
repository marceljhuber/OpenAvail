// Day events — "what actually happened" on a given date. One event per day,
// created and edited by admins, visible to every member.
//
// NOTE: this is unrelated to ./events.ts, which is the SSE pub/sub bus.

import { randomUUID } from "node:crypto";
import type { DB } from "./db.js";
import { getUserById } from "./repo.js";
import {
  DEFAULT_EVENT_COLOR,
  EVENT_COLORS,
  type DayEvent,
  type DayEventAttendee,
  type DayEventInput,
  type DayEventLink,
  type DayEventView,
  type EventColor,
  type User,
} from "./types.js";

export const MAX_LINKS = 10;
export const MAX_ATTENDEES = 100;
export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 2000;
export const MAX_LABEL = 80;
export const MAX_URL = 500;
export const MAX_NAME = 60;

type Row = Record<string, any>;

const toDayEvent = (r: Row): DayEvent => ({
  date: r.date,
  title: r.title,
  color: normalizeColor(r.color),
  description: r.description ?? "",
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toLink = (r: Row): DayEventLink => ({ id: r.id, url: r.url, label: r.label ?? "" });

const toAttendee = (r: Row): DayEventAttendee => ({
  id: r.id,
  userId: r.user_id ?? null,
  name: r.name,
});

/** Unknown/legacy colour tokens fall back to the default rather than erroring. */
export function normalizeColor(value: unknown): EventColor {
  return EVENT_COLORS.includes(value as EventColor) ? (value as EventColor) : DEFAULT_EVENT_COLOR;
}

/**
 * Accept only http(s) URLs. These are rendered as `<a href>`, so `javascript:`,
 * `data:` and friends must never make it into the database.
 */
export function sanitizeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, MAX_URL);
  if (!trimmed) return null;
  // bare "instagram.com/p/x" is a very common paste — assume https
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().slice(0, MAX_URL);
  } catch {
    return null;
  }
}

// ─── reads ───────────────────────────────────────────────────────────────────

export function listDayEvents(db: DB): DayEvent[] {
  return db.prepare(`SELECT * FROM day_events ORDER BY date DESC`).all().map(toDayEvent);
}

export function getDayEvent(db: DB, date: string): DayEvent | null {
  const row = db.prepare(`SELECT * FROM day_events WHERE date = ?`).get(date);
  return row ? toDayEvent(row) : null;
}

export function listLinks(db: DB, date: string): DayEventLink[] {
  return db
    .prepare(`SELECT * FROM day_event_links WHERE date = ? ORDER BY position ASC`)
    .all(date)
    .map(toLink);
}

export function listAttendees(db: DB, date: string): DayEventAttendee[] {
  return db
    .prepare(`SELECT * FROM day_event_attendees WHERE date = ? ORDER BY position ASC`)
    .all(date)
    .map(toAttendee);
}

// ─── writes ──────────────────────────────────────────────────────────────────

export function deleteDayEvent(db: DB, date: string): void {
  // children go with it via ON DELETE CASCADE
  db.prepare(`DELETE FROM day_events WHERE date = ?`).run(date);
}

/**
 * Create or replace the event on `date`. Links and attendees are replace-sets:
 * whatever the client sends becomes the whole list (same shape as poll votes).
 * `createdBy`/`createdAt` are preserved across edits.
 */
export function upsertDayEvent(
  db: DB,
  date: string,
  input: DayEventInput,
  user: User,
  nowISO: string,
): void {
  const title = input.title.trim().slice(0, MAX_TITLE);
  const description = (input.description ?? "").trim().slice(0, MAX_DESCRIPTION);
  const color = normalizeColor(input.color);

  const links = (input.links ?? [])
    .map((l) => ({ url: sanitizeUrl(l.url), label: (l.label ?? "").trim().slice(0, MAX_LABEL) }))
    .filter((l): l is { url: string; label: string } => l.url !== null)
    .slice(0, MAX_LINKS);

  const attendees = dedupeAttendees(db, input.attendees ?? []).slice(0, MAX_ATTENDEES);

  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO day_events (date, title, color, description, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         title = excluded.title,
         color = excluded.color,
         description = excluded.description,
         updated_at = excluded.updated_at`,
    ).run(date, title, color, description, user.id, nowISO, nowISO);

    db.prepare(`DELETE FROM day_event_links WHERE date = ?`).run(date);
    const insLink = db.prepare(
      `INSERT INTO day_event_links (id, date, url, label, position) VALUES (?, ?, ?, ?, ?)`,
    );
    links.forEach((l, i) => insLink.run(randomUUID(), date, l.url, l.label, i));

    db.prepare(`DELETE FROM day_event_attendees WHERE date = ?`).run(date);
    const insAttendee = db.prepare(
      `INSERT INTO day_event_attendees (id, date, user_id, name, position) VALUES (?, ?, ?, ?, ?)`,
    );
    attendees.forEach((a, i) => insAttendee.run(randomUUID(), date, a.userId, a.name, i));

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/**
 * Resolve member ids to their current name, drop unknown members and nameless
 * guests, and collapse duplicates. SQLite allows NULLs in a primary key, so
 * uniqueness has to be enforced here rather than by a constraint.
 */
function dedupeAttendees(
  db: DB,
  raw: { userId?: string | null; name?: string }[],
): { userId: string | null; name: string }[] {
  const seen = new Set<string>();
  const out: { userId: string | null; name: string }[] = [];
  for (const a of raw) {
    const userId = typeof a.userId === "string" && a.userId ? a.userId : null;
    let name = (a.name ?? "").trim().slice(0, MAX_NAME);
    if (userId) {
      const member = getUserById(db, userId);
      if (!member) continue; // stale id from the client
      name = member.name;
    }
    if (!name) continue;
    const key = userId ? `u:${userId}` : `g:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ userId, name });
  }
  return out;
}

// ─── views ───────────────────────────────────────────────────────────────────

/**
 * A day event as seen by a specific user. Attendee names are refreshed from
 * `users` when the member still exists and fall back to the stored snapshot
 * when they have since been removed.
 */
export function buildDayEventView(db: DB, ev: DayEvent, user: User): DayEventView {
  const nameCache = new Map<string, string>();
  const nameOf = (uid: string, fallback: string): string => {
    let name = nameCache.get(uid);
    if (name === undefined) {
      name = getUserById(db, uid)?.name ?? fallback;
      nameCache.set(uid, name);
    }
    return name;
  };

  return {
    ...ev,
    createdByName: getUserById(db, ev.createdBy)?.name ?? "Someone",
    links: listLinks(db, ev.date),
    attendees: listAttendees(db, ev.date).map((a) => ({
      ...a,
      name: a.userId ? nameOf(a.userId, a.name) : a.name,
    })),
    canManage: user.role === "admin",
  };
}

export function buildAllDayEventViews(db: DB, user: User): DayEventView[] {
  return listDayEvents(db).map((ev) => buildDayEventView(db, ev, user));
}
