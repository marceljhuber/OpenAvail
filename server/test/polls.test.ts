import { describe, expect, it } from "vitest";
import { openDb } from "../src/db.js";
import { upsertUser } from "../src/repo.js";
import {
  buildPollView,
  createPoll,
  getPoll,
  listOptions,
  setUserVotes,
} from "../src/polls.js";
import type { User } from "../src/types.js";

const now = () => new Date().toISOString();

function user(db: ReturnType<typeof openDb>, id: string, role: "admin" | "member"): User {
  return upsertUser(db, { id, email: `${id}@x.com`, name: id, picture: "", role, createdAt: now() });
}

function seedPoll(db: ReturnType<typeof openDb>, by: string) {
  const id = createPoll(db, { title: "25.07. Day?", options: ["Pokemon Day", "One Piece Day", "Friends Day"], createdBy: by }, now());
  return { poll: getPoll(db, id)!, optIds: listOptions(db, id).map((o) => o.id) };
}

describe("polls reveal logic", () => {
  it("hides standings until the user has voted", () => {
    const db = openDb(":memory:");
    const admin = user(db, "admin", "admin");
    const rainer = user(db, "rainer", "member");
    const { poll } = seedPoll(db, admin.id);

    const blind = buildPollView(db, poll, rainer);
    expect(blind.revealed).toBe(false);
    expect(blind.totalVoters).toBeNull();
    expect(blind.options.every((o) => o.votes === null)).toBe(true);

    // even the creator is blind before voting
    expect(buildPollView(db, poll, admin).revealed).toBe(false);
  });

  it("reveals counts after voting (multi-select) and supports editing/retracting", () => {
    const db = openDb(":memory:");
    const admin = user(db, "admin", "admin");
    const rainer = user(db, "rainer", "member");
    const { poll, optIds } = seedPoll(db, admin.id);

    setUserVotes(db, poll.id, rainer.id, [optIds[0], optIds[1]], now());
    let view = buildPollView(db, poll, rainer);
    expect(view.revealed).toBe(true);
    expect(view.myVotes.sort()).toEqual([optIds[0], optIds[1]].sort());
    expect(view.options.map((o) => o.votes)).toEqual([1, 1, 0]);
    expect(view.totalVoters).toBe(1);

    // edit to a single option replaces the previous selection
    setUserVotes(db, poll.id, rainer.id, [optIds[2]], now());
    view = buildPollView(db, poll, rainer);
    expect(view.myVotes).toEqual([optIds[2]]);
    expect(view.options.map((o) => o.votes)).toEqual([0, 0, 1]);

    // retract (empty) → blind again
    setUserVotes(db, poll.id, rainer.id, [], now());
    view = buildPollView(db, poll, rainer);
    expect(view.hasVoted).toBe(false);
    expect(view.revealed).toBe(false);
    expect(view.totalVoters).toBeNull();
  });

  it("ignores option ids that don't belong to the poll", () => {
    const db = openDb(":memory:");
    const u = user(db, "u", "member");
    const { poll, optIds } = seedPoll(db, u.id);
    setUserVotes(db, poll.id, u.id, [optIds[0], "bogus"], now());
    const view = buildPollView(db, poll, u);
    expect(view.myVotes).toEqual([optIds[0]]);
  });

  it("canManage is true for the creator and for admins", () => {
    const db = openDb(":memory:");
    const creator = user(db, "creator", "member");
    const admin = user(db, "admin", "admin");
    const other = user(db, "other", "member");
    const { poll } = seedPoll(db, creator.id);
    expect(buildPollView(db, poll, creator).canManage).toBe(true);
    expect(buildPollView(db, poll, admin).canManage).toBe(true);
    expect(buildPollView(db, poll, other).canManage).toBe(false);
  });
});
