import { describe, expect, it } from "vitest";
import { openDb } from "../src/db.js";
import { deleteUser, renameUser, upsertUser } from "../src/repo.js";
import {
  buildDayEventView,
  deleteDayEvent,
  getDayEvent,
  listAttendees,
  listDayEvents,
  listLinks,
  normalizeColor,
  sanitizeUrl,
  upsertDayEvent,
} from "../src/dayEvents.js";
import type { DayEventInput, User } from "../src/types.js";

const now = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();

function user(db: ReturnType<typeof openDb>, id: string, name: string, role: User["role"]): User {
  return upsertUser(db, {
    id,
    email: `${id}@x.com`,
    name,
    picture: "",
    role,
    createdAt: now(),
  });
}

function input(patch: Partial<DayEventInput> = {}): DayEventInput {
  return {
    title: "One Piece Ketchup Day",
    color: "coral",
    description: "We watched the whole arc.",
    links: [],
    attendees: [],
    ...patch,
  };
}

describe("day events", () => {
  it("creates an event with links and attendees, and reads it back", () => {
    const db = openDb(":memory:");
    const admin = user(db, "u1", "Ann", "admin");
    user(db, "u2", "Bo", "member");

    upsertDayEvent(
      db,
      "2026-07-18",
      input({
        links: [
          { url: "https://youtube.com/watch?v=x", label: "recap" },
          { url: "instagram.com/p/abc", label: "" },
        ],
        attendees: [{ userId: "u2" }, { name: "Lukas" }],
      }),
      admin,
      now(),
    );

    const ev = getDayEvent(db, "2026-07-18")!;
    expect(ev.title).toBe("One Piece Ketchup Day");
    expect(ev.color).toBe("coral");
    expect(ev.createdBy).toBe("u1");

    const links = listLinks(db, "2026-07-18");
    expect(links.map((l) => l.label)).toEqual(["recap", ""]);
    // a bare host gets an https scheme rather than being dropped
    expect(links[1].url).toBe("https://instagram.com/p/abc");

    const view = buildDayEventView(db, ev, admin);
    expect(view.attendees.map((a) => a.name)).toEqual(["Bo", "Lukas"]);
    expect(view.attendees[0].userId).toBe("u2");
    expect(view.attendees[1].userId).toBeNull();
    expect(view.createdByName).toBe("Ann");
    expect(view.canManage).toBe(true);
  });

  it("replaces links and attendees on update instead of appending", () => {
    const db = openDb(":memory:");
    const admin = user(db, "u1", "Ann", "admin");

    upsertDayEvent(
      db,
      "2026-07-18",
      input({ links: [{ url: "https://a.com" }], attendees: [{ name: "Lukas" }] }),
      admin,
      now(),
    );
    upsertDayEvent(
      db,
      "2026-07-18",
      input({ title: "Renamed", links: [{ url: "https://b.com" }], attendees: [{ name: "Sara" }] }),
      admin,
      now(1000),
    );

    expect(listDayEvents(db)).toHaveLength(1);
    expect(getDayEvent(db, "2026-07-18")!.title).toBe("Renamed");
    expect(listLinks(db, "2026-07-18").map((l) => l.url)).toEqual(["https://b.com/"]);
    expect(listAttendees(db, "2026-07-18").map((a) => a.name)).toEqual(["Sara"]);
  });

  it("preserves created_by across edits by a different admin", () => {
    const db = openDb(":memory:");
    const first = user(db, "u1", "Ann", "admin");
    const second = user(db, "u2", "Bo", "admin");

    upsertDayEvent(db, "2026-07-18", input(), first, now());
    upsertDayEvent(db, "2026-07-18", input({ title: "Edited" }), second, now(1000));

    expect(getDayEvent(db, "2026-07-18")!.createdBy).toBe("u1");
  });

  it("dedupes attendees and drops nameless guests and unknown members", () => {
    const db = openDb(":memory:");
    const admin = user(db, "u1", "Ann", "admin");
    user(db, "u2", "Bo", "member");

    upsertDayEvent(
      db,
      "2026-07-18",
      input({
        attendees: [
          { userId: "u2" },
          { userId: "u2" }, // same member twice
          { name: "Lukas" },
          { name: "lukas" }, // same guest, different case
          { name: "   " }, // blank
          { userId: "ghost" }, // no such member
        ],
      }),
      admin,
      now(),
    );

    expect(listAttendees(db, "2026-07-18").map((a) => a.name)).toEqual(["Bo", "Lukas"]);
  });

  it("keeps attendance history after the member is deleted or renamed", () => {
    const db = openDb(":memory:");
    const admin = user(db, "u1", "Ann", "admin");
    user(db, "u2", "Bo", "member");

    upsertDayEvent(db, "2026-07-18", input({ attendees: [{ userId: "u2" }] }), admin, now());

    renameUser(db, "u2", "Bojan");
    expect(listAttendees(db, "2026-07-18")[0].name).toBe("Bojan");

    deleteUser(db, "u2");
    const view = buildDayEventView(db, getDayEvent(db, "2026-07-18")!, admin);
    expect(view.attendees.map((a) => a.name)).toEqual(["Bojan"]);
  });

  it("deletes the event and cascades its links and attendees", () => {
    const db = openDb(":memory:");
    const admin = user(db, "u1", "Ann", "admin");

    upsertDayEvent(
      db,
      "2026-07-18",
      input({ links: [{ url: "https://a.com" }], attendees: [{ name: "Lukas" }] }),
      admin,
      now(),
    );
    deleteDayEvent(db, "2026-07-18");

    expect(getDayEvent(db, "2026-07-18")).toBeNull();
    expect(listLinks(db, "2026-07-18")).toHaveLength(0);
    expect(listAttendees(db, "2026-07-18")).toHaveLength(0);
  });

  it("lists events newest first", () => {
    const db = openDb(":memory:");
    const admin = user(db, "u1", "Ann", "admin");
    for (const date of ["2024-01-05", "2026-07-18", "2025-03-02"]) {
      upsertDayEvent(db, date, input(), admin, now());
    }
    expect(listDayEvents(db).map((e) => e.date)).toEqual(["2026-07-18", "2025-03-02", "2024-01-05"]);
  });

  it("does not let a member manage an event", () => {
    const db = openDb(":memory:");
    const admin = user(db, "u1", "Ann", "admin");
    const member = user(db, "u2", "Bo", "member");

    upsertDayEvent(db, "2026-07-18", input(), admin, now());
    const ev = getDayEvent(db, "2026-07-18")!;

    expect(buildDayEventView(db, ev, admin).canManage).toBe(true);
    expect(buildDayEventView(db, ev, member).canManage).toBe(false);
  });
});

describe("sanitizeUrl", () => {
  it("accepts http and https", () => {
    expect(sanitizeUrl("https://youtube.com/watch?v=x")).toBe("https://youtube.com/watch?v=x");
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("assumes https for a bare host", () => {
    expect(sanitizeUrl("instagram.com/p/abc")).toBe("https://instagram.com/p/abc");
  });

  it("rejects dangerous and unusable schemes", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrl("JavaScript:alert(1)")).toBeNull();
    expect(sanitizeUrl("data:text/html,<script>")).toBeNull();
    expect(sanitizeUrl("file:///etc/passwd")).toBeNull();
    expect(sanitizeUrl("")).toBeNull();
    expect(sanitizeUrl("   ")).toBeNull();
    expect(sanitizeUrl(null)).toBeNull();
  });

  it("strips unsafe links when saving rather than storing them", () => {
    const db = openDb(":memory:");
    const admin = user(db, "u1", "Ann", "admin");
    upsertDayEvent(
      db,
      "2026-07-18",
      input({ links: [{ url: "javascript:alert(1)" }, { url: "https://ok.com" }] }),
      admin,
      now(),
    );
    expect(listLinks(db, "2026-07-18").map((l) => l.url)).toEqual(["https://ok.com/"]);
  });
});

describe("normalizeColor", () => {
  it("keeps known tokens and falls back for anything else", () => {
    expect(normalizeColor("plum")).toBe("plum");
    expect(normalizeColor("chartreuse")).toBe("sage");
    expect(normalizeColor(undefined)).toBe("sage");
    expect(normalizeColor("#ff0000")).toBe("sage");
  });
});
