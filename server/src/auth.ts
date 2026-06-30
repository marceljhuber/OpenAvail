import { randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { config } from "./config.js";
import type { DB } from "./db.js";
import * as repo from "./repo.js";
import type { Role, Session, User } from "./types.js";

export const SESSION_COOKIE = "oa_session";

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

const googleClient = new OAuth2Client(config.googleClientId);

/**
 * Verify a Google Identity Services ID token server-side. Checks the
 * signature, that the audience matches our client id, and that the email is
 * verified. Throws AuthError(401) otherwise.
 */
export async function verifyGoogleToken(credential: string): Promise<GoogleProfile> {
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new AuthError(401, "Invalid Google sign-in.");
  }
  if (!payload?.sub || !payload.email || payload.email_verified === false) {
    throw new AuthError(401, "Invalid Google sign-in.");
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name?.trim() || payload.email,
    picture: payload.picture ?? "",
  };
}

/**
 * Decide whether a verified Google profile may use this instance, and persist
 * the user. Pure (no network) so it is unit-testable.
 *
 *  - the ADMIN_EMAIL account is always admin
 *  - an already-registered user may return (role preserved)
 *  - a new user is admitted only with a valid, unexpired, non-revoked invite
 *  - everyone else is rejected with 403
 */
export function authorizeAndRegister(
  db: DB,
  profile: GoogleProfile,
  inviteToken: string | undefined,
  nowISO: string,
): User {
  const id = `google-${profile.sub}`;
  const existing = repo.getUserById(db, id);
  const isAdmin = profile.email === config.adminEmail;

  let role: Role;
  if (isAdmin) {
    role = "admin";
  } else if (existing) {
    role = existing.role;
  } else if (inviteToken && repo.isInviteValid(db, inviteToken, nowISO)) {
    role = "member";
  } else {
    throw new AuthError(403, "You need a valid invite link to join.");
  }

  return repo.upsertUser(db, {
    id,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    role,
    createdAt: existing?.createdAt ?? nowISO,
  });
}

// ─── sessions ────────────────────────────────────────────────────────────────
export function startSession(db: DB, userId: string, nowISO: string): Session {
  const id = randomToken(32);
  const expiresAt = new Date(Date.now() + config.sessionTtlMs).toISOString();
  return repo.createSession(db, id, userId, nowISO, expiresAt);
}

export function resolveSessionUser(db: DB, sessionId: string | undefined): User | null {
  if (!sessionId) return null;
  return repo.getSessionUser(db, sessionId, new Date().toISOString());
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(config.sessionTtlMs / 1000),
  };
}

// ─── invites ─────────────────────────────────────────────────────────────────
export function makeInviteToken(): string {
  return randomToken(18);
}

function randomToken(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}
