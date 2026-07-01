import type { DB } from "./db.js";
import type { Comment } from "./types.js";

type Row = Record<string, any>;

const toComment = (r: Row): Comment => ({
  id: r.id,
  date: r.date,
  userId: r.user_id,
  userName: r.user_name,
  body: r.body,
  createdAt: r.created_at,
});

export function addComment(db: DB, c: Comment): void {
  db.prepare(
    `INSERT INTO day_comments (id, date, user_id, user_name, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(c.id, c.date, c.userId, c.userName, c.body, c.createdAt);
}

export function listComments(db: DB, date: string): Comment[] {
  return db
    .prepare(`SELECT * FROM day_comments WHERE date = ? ORDER BY created_at ASC`)
    .all(date)
    .map(toComment);
}

/** date → number of comments, for showing badges across the calendar. */
export function commentCounts(db: DB): Record<string, number> {
  const rows = db
    .prepare(`SELECT date, COUNT(*) AS n FROM day_comments GROUP BY date`)
    .all() as Row[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.date as string] = Number(r.n);
  return out;
}

export function getComment(db: DB, id: string): Comment | null {
  const row = db.prepare(`SELECT * FROM day_comments WHERE id = ?`).get(id);
  return row ? toComment(row) : null;
}

export function deleteComment(db: DB, id: string): void {
  db.prepare(`DELETE FROM day_comments WHERE id = ?`).run(id);
}
