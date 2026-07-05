import { randomUUID } from "node:crypto";
import type { DB } from "./db.js";
import { getUserById } from "./repo.js";
import type { Poll, PollMode, PollOption, PollView, User } from "./types.js";

type Row = Record<string, any>;

const toPoll = (r: Row): Poll => ({
  id: r.id,
  title: r.title,
  createdBy: r.created_by,
  createdAt: r.created_at,
  closedAt: r.closed_at ?? null,
  mode: r.mode === "single" ? "single" : "multi",
});

const toOption = (r: Row): PollOption => ({
  id: r.id,
  pollId: r.poll_id,
  label: r.label,
  position: r.position,
});

export function createPoll(
  db: DB,
  input: { title: string; options: string[]; createdBy: string; mode?: PollMode },
  nowISO: string,
): string {
  const pollId = randomUUID();
  const mode: PollMode = input.mode === "single" ? "single" : "multi";
  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO polls (id, title, created_by, created_at, mode) VALUES (?, ?, ?, ?, ?)`,
    ).run(pollId, input.title, input.createdBy, nowISO, mode);
    const insOpt = db.prepare(
      `INSERT INTO poll_options (id, poll_id, label, position) VALUES (?, ?, ?, ?)`,
    );
    input.options.forEach((label, i) => insOpt.run(randomUUID(), pollId, label, i));
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return pollId;
}

export function listPolls(db: DB): Poll[] {
  return db.prepare(`SELECT * FROM polls ORDER BY created_at DESC`).all().map(toPoll);
}

export function getPoll(db: DB, id: string): Poll | null {
  const row = db.prepare(`SELECT * FROM polls WHERE id = ?`).get(id);
  return row ? toPoll(row) : null;
}

export function deletePoll(db: DB, id: string): void {
  db.prepare(`DELETE FROM polls WHERE id = ?`).run(id);
}

/** End a voting: no further votes accepted, results revealed to everyone. */
export function closePoll(db: DB, id: string, nowISO: string): void {
  db.prepare(`UPDATE polls SET closed_at = ? WHERE id = ?`).run(nowISO, id);
}

/** Re-open a previously ended voting. */
export function reopenPoll(db: DB, id: string): void {
  db.prepare(`UPDATE polls SET closed_at = NULL WHERE id = ?`).run(id);
}

export function listOptions(db: DB, pollId: string): PollOption[] {
  return db
    .prepare(`SELECT * FROM poll_options WHERE poll_id = ? ORDER BY position ASC`)
    .all(pollId)
    .map(toOption);
}

/** Update a poll's editable metadata (title / single-vs-multi mode). Switching
 * to single-choice trims everyone's selections down to their first pick. */
export function updatePoll(
  db: DB,
  id: string,
  patch: { title?: string; mode?: PollMode },
): void {
  db.exec("BEGIN");
  try {
    if (patch.title !== undefined) {
      db.prepare(`UPDATE polls SET title = ? WHERE id = ?`).run(patch.title, id);
    }
    if (patch.mode !== undefined) {
      const mode: PollMode = patch.mode === "single" ? "single" : "multi";
      db.prepare(`UPDATE polls SET mode = ? WHERE id = ?`).run(mode, id);
      if (mode === "single") trimToSingleChoice(db, id);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** For each voter, keep only their earliest pick (used when a poll becomes single-choice). */
function trimToSingleChoice(db: DB, pollId: string): void {
  const rows = db
    .prepare(`SELECT user_id, option_id FROM poll_votes WHERE poll_id = ? ORDER BY created_at ASC, rowid ASC`)
    .all(pollId) as Row[];
  const keep = new Map<string, string>();
  for (const r of rows) {
    if (!keep.has(r.user_id as string)) keep.set(r.user_id as string, r.option_id as string);
  }
  const del = db.prepare(`DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ? AND option_id != ?`);
  for (const [userId, optionId] of keep) del.run(pollId, userId, optionId);
}

export function addOption(db: DB, pollId: string, label: string): string {
  const row = db
    .prepare(`SELECT COALESCE(MAX(position), -1) AS m FROM poll_options WHERE poll_id = ?`)
    .get(pollId) as Row;
  const id = randomUUID();
  db.prepare(
    `INSERT INTO poll_options (id, poll_id, label, position) VALUES (?, ?, ?, ?)`,
  ).run(id, pollId, label, Number(row.m) + 1);
  return id;
}

export function renameOption(db: DB, optionId: string, label: string): void {
  db.prepare(`UPDATE poll_options SET label = ? WHERE id = ?`).run(label, optionId);
}

/** Delete an option (its votes cascade away). Refuses to remove the last one. */
export function deleteOption(db: DB, pollId: string, optionId: string): boolean {
  const count = db
    .prepare(`SELECT COUNT(*) AS n FROM poll_options WHERE poll_id = ?`)
    .get(pollId) as Row;
  if (Number(count.n) <= 1) return false;
  db.prepare(`DELETE FROM poll_options WHERE id = ? AND poll_id = ?`).run(optionId, pollId);
  return true;
}

export function getUserVotes(db: DB, pollId: string, userId: string): string[] {
  return db
    .prepare(`SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?`)
    .all(pollId, userId)
    .map((r) => (r as Row).option_id as string);
}

/** Replace a user's selections for a poll (multi-select). Invalid option ids
 * are ignored; an empty set means the user has retracted their vote. */
export function setUserVotes(
  db: DB,
  pollId: string,
  userId: string,
  optionIds: string[],
  nowISO: string,
): void {
  const valid = new Set(listOptions(db, pollId).map((o) => o.id));
  let chosen = [...new Set(optionIds)].filter((id) => valid.has(id));
  // enforce single-choice server-side regardless of what the client sent
  const poll = getPoll(db, pollId);
  if (poll?.mode === "single") chosen = chosen.slice(0, 1);
  db.exec("BEGIN");
  try {
    db.prepare(`DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?`).run(pollId, userId);
    const ins = db.prepare(
      `INSERT INTO poll_votes (poll_id, option_id, user_id, created_at) VALUES (?, ?, ?, ?)`,
    );
    for (const optionId of chosen) ins.run(pollId, optionId, userId, nowISO);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function optionCounts(db: DB, pollId: string): Map<string, number> {
  const rows = db
    .prepare(`SELECT option_id, COUNT(*) AS n FROM poll_votes WHERE poll_id = ? GROUP BY option_id`)
    .all(pollId) as Row[];
  return new Map(rows.map((r) => [r.option_id as string, Number(r.n)]));
}

/** option_id → list of user ids who picked it. */
function optionVoters(db: DB, pollId: string): Map<string, string[]> {
  const rows = db
    .prepare(`SELECT option_id, user_id FROM poll_votes WHERE poll_id = ?`)
    .all(pollId) as Row[];
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.option_id as string) ?? [];
    list.push(r.user_id as string);
    map.set(r.option_id as string, list);
  }
  return map;
}

function voterCount(db: DB, pollId: string): number {
  const row = db
    .prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM poll_votes WHERE poll_id = ?`)
    .get(pollId) as Row;
  return Number(row.n);
}

/** Build the per-user view. Standings stay hidden until the user has voted. */
export function buildPollView(db: DB, poll: Poll, user: User): PollView {
  const options = listOptions(db, poll.id);
  const myVotes = getUserVotes(db, poll.id, user.id);
  const hasVoted = myVotes.length > 0;
  const closed = poll.closedAt !== null;
  // Standings (and voter identities) stay hidden until you've voted; ending the
  // poll reveals them to everyone.
  const revealed = hasVoted || closed;
  const counts = revealed ? optionCounts(db, poll.id) : null;
  const voters = revealed ? optionVoters(db, poll.id) : null;
  const creator = getUserById(db, poll.createdBy);

  const nameCache = new Map<string, string>();
  const nameOf = (uid: string): string => {
    let n = nameCache.get(uid);
    if (n === undefined) {
      n = getUserById(db, uid)?.name ?? "Someone";
      nameCache.set(uid, n);
    }
    return n;
  };

  return {
    id: poll.id,
    title: poll.title,
    createdBy: poll.createdBy,
    createdByName: creator?.name ?? "Someone",
    createdAt: poll.createdAt,
    options: options.map((o) => ({
      id: o.id,
      label: o.label,
      votes: counts ? (counts.get(o.id) ?? 0) : null,
      voters: voters ? (voters.get(o.id) ?? []).map(nameOf) : null,
    })),
    myVotes,
    hasVoted,
    revealed,
    closed,
    mode: poll.mode,
    totalVoters: revealed ? voterCount(db, poll.id) : null,
    canManage: user.role === "admin" || poll.createdBy === user.id,
  };
}

export function buildAllPollViews(db: DB, user: User): PollView[] {
  return listPolls(db).map((poll) => buildPollView(db, poll, user));
}
