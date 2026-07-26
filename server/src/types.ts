export type Vote = "yes" | "maybe" | "no";
export type Role = "admin" | "member";

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: Role;
  createdAt: string;
}

export interface VoteRow {
  userId: string;
  date: string;
  vote: Vote;
  updatedAt: string;
}

export interface Change {
  id: string;
  userId: string;
  userName: string;
  date: string;
  previousVote: Vote | null;
  nextVote: Vote | null;
  at: string;
}

export interface Invite {
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export type PollMode = "single" | "multi";

export interface Poll {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
  /** ISO timestamp when an admin/creator ended the voting, else null. */
  closedAt: string | null;
  /** 'single' = radio (one pick per person), 'multi' = checkboxes. */
  mode: PollMode;
}

export interface PollOption {
  id: string;
  pollId: string;
  label: string;
  position: number;
}

/**
 * A poll as seen by a specific user. Results are blind until the user has
 * voted OR the poll has been closed: when `revealed` is false, `votes`,
 * `voters` and `totalVoters` are null.
 */
export interface PollView {
  id: string;
  title: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  options: { id: string; label: string; votes: number | null; voters: string[] | null }[];
  myVotes: string[];
  hasVoted: boolean;
  revealed: boolean;
  closed: boolean;
  mode: PollMode;
  totalVoters: number | null;
  canManage: boolean;
}

export interface Comment {
  id: string;
  date: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
}

// ─── day events ──────────────────────────────────────────────────────────────

/** Palette tokens; the browser maps these to --ev-* CSS variables per theme. */
export const EVENT_COLORS = [
  "sage",
  "amber",
  "coral",
  "plum",
  "ocean",
  "forest",
  "rose",
  "slate",
] as const;
export type EventColor = (typeof EVENT_COLORS)[number];
export const DEFAULT_EVENT_COLOR: EventColor = "sage";

export interface DayEventLink {
  id: string;
  url: string;
  /** optional human label; the client falls back to the hostname */
  label: string;
}

export interface DayEventAttendee {
  id: string;
  /** board member id, or null for a free-text guest */
  userId: string | null;
  name: string;
}

/** One event per date — "One Piece Ketchup Day", etc. */
export interface DayEvent {
  date: string;
  title: string;
  color: EventColor;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** A day event plus its children and the requesting user's permissions. */
export interface DayEventView extends DayEvent {
  createdByName: string;
  links: DayEventLink[];
  attendees: DayEventAttendee[];
  canManage: boolean;
}

/** What the client may set on a day event (children are replaced wholesale). */
export interface DayEventInput {
  title: string;
  color: EventColor;
  description: string;
  links: { url: string; label?: string }[];
  attendees: { userId?: string | null; name?: string }[];
}

/** votes[isoDate][userId] = Vote */
export type VotesByDate = Record<string, Record<string, Vote>>;

export interface BoardState {
  members: User[];
  votes: VotesByDate;
  changes: Change[];
}
