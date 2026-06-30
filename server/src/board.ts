import { randomUUID } from "node:crypto";
import type { DB } from "./db.js";
import * as repo from "./repo.js";
import type { BoardState, User, Vote, VotesByDate } from "./types.js";

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function shapeVotes(rows: { date: string; userId: string; vote: Vote }[]): VotesByDate {
  const votes: VotesByDate = {};
  for (const row of rows) {
    (votes[row.date] ??= {})[row.userId] = row.vote;
  }
  return votes;
}

/** Full board state, optionally limited to an inclusive [from, to] date range. */
export function buildState(db: DB, from?: string, to?: string): BoardState {
  const rows =
    from && to ? repo.getVotesInRange(db, from, to) : repo.getAllVotes(db);
  return {
    members: repo.listMembers(db),
    votes: shapeVotes(rows),
    changes: repo.listChanges(db, 30),
  };
}

/**
 * Apply a vote click for `user` on `date`. Toggling: clicking the current vote
 * (or passing null) clears it; otherwise it is set. Records a change entry when
 * the value actually changes. Returns the before/after votes.
 */
export function applyVote(
  db: DB,
  user: User,
  date: string,
  vote: Vote | null,
  nowISO: string,
): { previousVote: Vote | null; nextVote: Vote | null } {
  const previousVote = repo.getVote(db, user.id, date);
  let nextVote: Vote | null;

  if (vote === null || vote === previousVote) {
    repo.deleteVote(db, user.id, date);
    nextVote = null;
  } else {
    repo.upsertVote(db, user.id, date, vote, nowISO);
    nextVote = vote;
  }

  if (previousVote !== nextVote) {
    repo.addChange(db, {
      id: randomUUID(),
      userId: user.id,
      userName: user.name,
      date,
      previousVote,
      nextVote,
      at: nowISO,
    });
  }

  return { previousVote, nextVote };
}
