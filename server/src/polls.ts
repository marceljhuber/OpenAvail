import { randomUUID } from "node:crypto";
import type { DB } from "./db.js";
import { getUserById } from "./repo.js";
import type { Poll, PollOption, PollView, User } from "./types.js";

type Row = Record<string, any>;

const toPoll = (r: Row): Poll => ({
  id: r.id,
  title: r.title,
  createdBy: r.created_by,
  createdAt: r.created_at,
});

const toOption = (r: Row): PollOption => ({
  id: r.id,
  pollId: r.poll_id,
  label: r.label,
  position: r.position,
});

export function createPoll(
  db: DB,
  input: { title: string; options: string[]; createdBy: string },
  nowISO: string,
): string {
  const pollId = randomUUID();
  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO polls (id, title, created_by, created_at) VALUES (?, ?, ?, ?)`,
    ).run(pollId, input.title, input.createdBy, nowISO);
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

export function listOptions(db: DB, pollId: string): PollOption[] {
  return db
    .prepare(`SELECT * FROM poll_options WHERE poll_id = ? ORDER BY position ASC`)
    .all(pollId)
    .map(toOption);
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
  const chosen = [...new Set(optionIds)].filter((id) => valid.has(id));
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
  const revealed = hasVoted;
  const counts = revealed ? optionCounts(db, poll.id) : null;
  const creator = getUserById(db, poll.createdBy);

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
    })),
    myVotes,
    hasVoted,
    revealed,
    totalVoters: revealed ? voterCount(db, poll.id) : null,
    canManage: user.role === "admin" || poll.createdBy === user.id,
  };
}

export function buildAllPollViews(db: DB, user: User): PollView[] {
  return listPolls(db).map((poll) => buildPollView(db, poll, user));
}
