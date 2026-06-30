import { describe, expect, it } from "vitest";
import { openDb } from "../src/db.js";
import { config } from "../src/config.js";
import { AuthError, authorizeAndRegister, type GoogleProfile } from "../src/auth.js";
import { createInvite, getUserById } from "../src/repo.js";

function profile(over: Partial<GoogleProfile> = {}): GoogleProfile {
  return { sub: "123", email: "friend@example.com", name: "Friend", picture: "", ...over };
}

const now = () => new Date().toISOString();
const future = () => new Date(Date.now() + 3600_000).toISOString();
const past = () => new Date(Date.now() - 1000).toISOString();

describe("authorizeAndRegister", () => {
  it("admits the ADMIN_EMAIL account as admin without an invite", () => {
    const db = openDb(":memory:");
    const user = authorizeAndRegister(db, profile({ email: config.adminEmail }), undefined, now());
    expect(user.role).toBe("admin");
  });

  it("rejects an unknown user with no invite (403)", () => {
    const db = openDb(":memory:");
    expect(() => authorizeAndRegister(db, profile(), undefined, now())).toThrowError(AuthError);
    try {
      authorizeAndRegister(db, profile(), undefined, now());
    } catch (e) {
      expect((e as AuthError).status).toBe(403);
    }
  });

  it("admits a new user with a valid invite as member", () => {
    const db = openDb(":memory:");
    createInvite(db, "tok", "admin", now(), future());
    const user = authorizeAndRegister(db, profile(), "tok", now());
    expect(user.role).toBe("member");
    expect(getUserById(db, user.id)).not.toBeNull();
  });

  it("rejects an expired invite", () => {
    const db = openDb(":memory:");
    createInvite(db, "tok", "admin", past(), past());
    expect(() => authorizeAndRegister(db, profile(), "tok", now())).toThrowError(/invite/i);
  });

  it("lets an existing member return without an invite, preserving role", () => {
    const db = openDb(":memory:");
    createInvite(db, "tok", "admin", now(), future());
    const first = authorizeAndRegister(db, profile(), "tok", now());
    const again = authorizeAndRegister(db, profile({ name: "Renamed" }), undefined, now());
    expect(again.role).toBe("member");
    expect(again.name).toBe("Renamed");
    expect(again.id).toBe(first.id);
  });
});
