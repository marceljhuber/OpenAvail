import { describe, expect, it } from "vitest";
import { openDb } from "../src/db.js";
import { upsertUser } from "../src/repo.js";
import {
  addOption,
  buildPollView,
  closePoll,
  createPoll,
  deleteOption,
  getPoll,
  listOptions,
  reopenPoll,
  setUserVotes,
  updatePoll,
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

  it("ending a poll reveals standings and voter names to everyone", () => {
    const db = openDb(":memory:");
    const admin = user(db, "admin", "admin");
    const rainer = user(db, "rainer", "member");
    const lena = user(db, "lena", "member");
    const { poll, optIds } = seedPoll(db, admin.id);

    setUserVotes(db, poll.id, rainer.id, [optIds[0]], now());

    // lena hasn't voted → blind while open
    expect(buildPollView(db, poll, lena).revealed).toBe(false);

    closePoll(db, poll.id, now());
    const closed = getPoll(db, poll.id)!;
    const view = buildPollView(db, closed, lena);
    expect(view.closed).toBe(true);
    expect(view.revealed).toBe(true);
    expect(view.options[0].votes).toBe(1);
    expect(view.options[0].voters).toEqual(["rainer"]);
    expect(view.options[1].voters).toEqual([]);

    // re-opening hides it again from non-voters
    reopenPoll(db, poll.id);
    expect(buildPollView(db, getPoll(db, poll.id)!, lena).revealed).toBe(false);
  });

  it("supports post-hoc editing: add/delete options and mode changes", () => {
    const db = openDb(":memory:");
    const admin = user(db, "admin", "admin");
    const { poll, optIds } = seedPoll(db, admin.id);
    expect(getPoll(db, poll.id)!.mode).toBe("multi"); // default

    // add + delete options
    addOption(db, poll.id, "Sun Day");
    expect(listOptions(db, poll.id).map((o) => o.label)).toContain("Sun Day");
    expect(deleteOption(db, poll.id, optIds[2])).toBe(true);
    expect(listOptions(db, poll.id).some((o) => o.id === optIds[2])).toBe(false);

    // can't delete the last remaining option
    const solo = createPoll(db, { title: "solo", options: ["only"], createdBy: admin.id }, now());
    const onlyId = listOptions(db, solo)[0].id;
    expect(deleteOption(db, solo, onlyId)).toBe(false);
  });

  it("switching to single-choice trims each voter to one pick and caps new votes", () => {
    const db = openDb(":memory:");
    const admin = user(db, "admin", "admin");
    const rainer = user(db, "rainer", "member");
    const { poll, optIds } = seedPoll(db, admin.id);

    setUserVotes(db, poll.id, rainer.id, [optIds[0], optIds[1]], now());
    updatePoll(db, poll.id, { mode: "single" });
    expect(getPoll(db, poll.id)!.mode).toBe("single");
    // existing multi-selection trimmed to the earliest pick
    expect(buildPollView(db, getPoll(db, poll.id)!, rainer).myVotes).toEqual([optIds[0]]);

    // new votes are capped at one even if the client sends several
    setUserVotes(db, poll.id, rainer.id, [optIds[1], optIds[2]], now());
    expect(buildPollView(db, getPoll(db, poll.id)!, rainer).myVotes).toEqual([optIds[1]]);
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
