import { describe, expect, it } from "vitest";
import { openDb } from "../src/db.js";
import { upsertUser } from "../src/repo.js";
import { addComment, commentCounts, deleteComment, listComments } from "../src/comments.js";

const now = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();

function seed(db: ReturnType<typeof openDb>) {
  upsertUser(db, { id: "u1", email: "a@x.com", name: "Ann", picture: "", role: "member", createdAt: now() });
}

describe("day comments", () => {
  it("adds and lists comments per day in chronological order", () => {
    const db = openDb(":memory:");
    seed(db);
    addComment(db, { id: "c1", date: "2026-07-01", userId: "u1", userName: "Ann", body: "first", createdAt: now(0) });
    addComment(db, { id: "c2", date: "2026-07-01", userId: "u1", userName: "Ann", body: "second", createdAt: now(1000) });
    addComment(db, { id: "c3", date: "2026-07-02", userId: "u1", userName: "Ann", body: "other day", createdAt: now(0) });

    const day1 = listComments(db, "2026-07-01");
    expect(day1.map((c) => c.body)).toEqual(["first", "second"]);
    expect(listComments(db, "2026-07-02")).toHaveLength(1);
  });

  it("counts comments by date", () => {
    const db = openDb(":memory:");
    seed(db);
    addComment(db, { id: "c1", date: "2026-07-01", userId: "u1", userName: "Ann", body: "a", createdAt: now() });
    addComment(db, { id: "c2", date: "2026-07-01", userId: "u1", userName: "Ann", body: "b", createdAt: now() });
    addComment(db, { id: "c3", date: "2026-07-03", userId: "u1", userName: "Ann", body: "c", createdAt: now() });
    expect(commentCounts(db)).toEqual({ "2026-07-01": 2, "2026-07-03": 1 });
  });

  it("deletes a comment", () => {
    const db = openDb(":memory:");
    seed(db);
    addComment(db, { id: "c1", date: "2026-07-01", userId: "u1", userName: "Ann", body: "a", createdAt: now() });
    deleteComment(db, "c1");
    expect(listComments(db, "2026-07-01")).toHaveLength(0);
  });
});
