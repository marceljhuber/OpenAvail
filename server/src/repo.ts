import type { DB } from "./db.js";
import type { Change, Invite, Session, User, Vote, VoteRow } from "./types.js";

const CHANGE_LOG_CAP = 100;

// ─── row mappers (node:sqlite returns snake_case column objects) ─────────────
type Row = Record<string, any>;
function toUser(r: Row): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    picture: r.picture,
    role: r.role,
    createdAt: r.created_at,
  };
}
function toVoteRow(r: Row): VoteRow {
  return { userId: r.user_id, date: r.date, vote: r.vote, updatedAt: r.updated_at };
}
function toChange(r: Row): Change {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    date: r.date,
    previousVote: r.previous_vote ?? null,
    nextVote: r.next_vote ?? null,
    at: r.at,
  };
}
function toInvite(r: Row): Invite {
  return {
    token: r.token,
    createdBy: r.created_by,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    revoked: !!r.revoked,
  };
}

// ─── users ──────────────────────────────────────────────────────────────────
export function upsertUser(db: DB, user: User): User {
  db.prepare(
    `INSERT INTO users (id, email, name, picture, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       picture = excluded.picture,
       role = excluded.role`,
  ).run(user.id, user.email, user.name, user.picture, user.role, user.createdAt);
  return getUserById(db, user.id)!;
}

export function getUserById(db: DB, id: string): User | null {
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  return row ? toUser(row) : null;
}

export function getUserByEmail(db: DB, email: string): User | null {
  const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase());
  return row ? toUser(row) : null;
}

export function listMembers(db: DB): User[] {
  return db
    .prepare(`SELECT * FROM users ORDER BY name COLLATE NOCASE ASC`)
    .all()
    .map(toUser);
}

export function deleteUser(db: DB, id: string): void {
  db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
}

/** Rename a user, keeping the denormalized copies in comments/changes in sync. */
export function renameUser(db: DB, id: string, name: string): void {
  db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(name, id);
  db.prepare(`UPDATE day_comments SET user_name = ? WHERE user_id = ?`).run(name, id);
  db.prepare(`UPDATE changes SET user_name = ? WHERE user_id = ?`).run(name, id);
}

// ─── votes ───────────────────────────────────────────────────────────────────
export function getVote(db: DB, userId: string, date: string): Vote | null {
  const row = db
    .prepare(`SELECT vote FROM votes WHERE user_id = ? AND date = ?`)
    .get(userId, date) as { vote: Vote } | undefined;
  return row ? row.vote : null;
}

export function upsertVote(db: DB, userId: string, date: string, vote: Vote, at: string): void {
  db.prepare(
    `INSERT INTO votes (user_id, date, vote, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET vote = excluded.vote, updated_at = excluded.updated_at`,
  ).run(userId, date, vote, at);
}

export function deleteVote(db: DB, userId: string, date: string): void {
  db.prepare(`DELETE FROM votes WHERE user_id = ? AND date = ?`).run(userId, date);
}

export function getVotesInRange(db: DB, from: string, to: string): VoteRow[] {
  return db
    .prepare(`SELECT * FROM votes WHERE date >= ? AND date <= ? ORDER BY date ASC`)
    .all(from, to)
    .map(toVoteRow);
}

export function getAllVotes(db: DB): VoteRow[] {
  return db.prepare(`SELECT * FROM votes ORDER BY date ASC`).all().map(toVoteRow);
}

// ─── changes ─────────────────────────────────────────────────────────────────
export function addChange(db: DB, change: Change): void {
  db.prepare(
    `INSERT INTO changes (id, user_id, user_name, date, previous_vote, next_vote, at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    change.id,
    change.userId,
    change.userName,
    change.date,
    change.previousVote,
    change.nextVote,
    change.at,
  );
  // keep only the newest CHANGE_LOG_CAP rows
  db.prepare(
    `DELETE FROM changes WHERE id NOT IN (
       SELECT id FROM changes ORDER BY at DESC LIMIT ?
     )`,
  ).run(CHANGE_LOG_CAP);
}

export function listChanges(db: DB, limit = 30): Change[] {
  return db
    .prepare(`SELECT * FROM changes ORDER BY at DESC LIMIT ?`)
    .all(limit)
    .map(toChange);
}

// ─── invites ─────────────────────────────────────────────────────────────────
export function createInvite(
  db: DB,
  token: string,
  createdBy: string,
  createdAt: string,
  expiresAt: string,
): Invite {
  db.prepare(
    `INSERT INTO invites (token, created_by, created_at, expires_at, revoked)
     VALUES (?, ?, ?, ?, 0)`,
  ).run(token, createdBy, createdAt, expiresAt);
  return getInvite(db, token)!;
}

export function getInvite(db: DB, token: string): Invite | null {
  const row = db.prepare(`SELECT * FROM invites WHERE token = ?`).get(token);
  return row ? toInvite(row) : null;
}

/** A token that exists, is not revoked, and has not expired at `nowISO`. */
export function isInviteValid(db: DB, token: string, nowISO: string): boolean {
  const invite = getInvite(db, token);
  return !!invite && !invite.revoked && invite.expiresAt > nowISO;
}

export function listInvites(db: DB): Invite[] {
  return db
    .prepare(`SELECT * FROM invites ORDER BY created_at DESC`)
    .all()
    .map(toInvite);
}

export function revokeInvite(db: DB, token: string): void {
  db.prepare(`UPDATE invites SET revoked = 1 WHERE token = ?`).run(token);
}

// ─── sessions ────────────────────────────────────────────────────────────────
export function createSession(
  db: DB,
  id: string,
  userId: string,
  createdAt: string,
  expiresAt: string,
): Session {
  db.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
  ).run(id, userId, createdAt, expiresAt);
  return { id, userId, createdAt, expiresAt };
}

/** Resolve a session id to its user, only if the session has not expired. */
export function getSessionUser(db: DB, sessionId: string, nowISO: string): User | null {
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .get(sessionId, nowISO);
  return row ? toUser(row) : null;
}

export function deleteSession(db: DB, id: string): void {
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
}

export function deleteExpiredSessions(db: DB, nowISO: string): void {
  db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`).run(nowISO);
}
