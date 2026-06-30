import { describe, expect, it } from "vitest";
import { openDb } from "../src/db.js";
import { applyVote, buildState, isIsoDate } from "../src/board.js";
import { upsertUser } from "../src/repo.js";
import type { User } from "../src/types.js";

const now = () => new Date().toISOString();

function seedUser(db: ReturnType<typeof openDb>, id: string, name: string): User {
  return upsertUser(db, {
    id,
    email: `${id}@x.com`,
    name,
    picture: "",
    role: "member",
    createdAt: now(),
  });
}

describe("isIsoDate", () => {
  it("accepts YYYY-MM-DD and rejects others", () => {
    expect(isIsoDate("2026-07-01")).toBe(true);
    expect(isIsoDate("2026-7-1")).toBe(false);
    expect(isIsoDate("nope")).toBe(false);
    expect(isIsoDate(42)).toBe(false);
  });
});

describe("applyVote", () => {
  it("sets, toggles off, and switches votes; records changes", () => {
    const db = openDb(":memory:");
    const u = seedUser(db, "u1", "Ann");

    const r1 = applyVote(db, u, "2026-07-01", "yes", now());
    expect(r1).toEqual({ previousVote: null, nextVote: "yes" });

    // clicking the same vote clears it
    const r2 = applyVote(db, u, "2026-07-01", "yes", now());
    expect(r2.nextVote).toBeNull();

    // switching value
    applyVote(db, u, "2026-07-01", "maybe", now());
    const r3 = applyVote(db, u, "2026-07-01", "no", now());
    expect(r3).toEqual({ previousVote: "maybe", nextVote: "no" });

    const state = buildState(db);
    expect(state.votes["2026-07-01"]["u1"]).toBe("no");
    // 4 transitions actually changed the value → 4 change rows
    expect(state.changes.length).toBe(4);
  });

  it("buildState shapes votes by date and honours range", () => {
    const db = openDb(":memory:");
    const a = seedUser(db, "a", "A");
    const b = seedUser(db, "b", "B");
    applyVote(db, a, "2026-07-01", "yes", now());
    applyVote(db, b, "2026-07-01", "maybe", now());
    applyVote(db, a, "2026-09-15", "yes", now());

    const all = buildState(db);
    expect(Object.keys(all.votes).sort()).toEqual(["2026-07-01", "2026-09-15"]);
    expect(all.votes["2026-07-01"]).toEqual({ a: "yes", b: "maybe" });

    const ranged = buildState(db, "2026-07-01", "2026-08-01");
    expect(Object.keys(ranged.votes)).toEqual(["2026-07-01"]);
    expect(ranged.members.length).toBe(2);
  });
});
