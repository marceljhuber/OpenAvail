export type Vote = "yes" | "maybe" | "no";

export type Role = "admin" | "member";

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: Role;
}

export interface AppConfig {
  ownerName: string;
  googleClientId: string;
  devLogin: boolean;
}

/** votes[isoDate][userId] = Vote */
export type VotesByDate = Record<string, Record<string, Vote>>;

export interface Change {
  id: string;
  userId: string;
  userName: string;
  date: string;
  previousVote: Vote | null;
  nextVote: Vote | null;
  at: string;
}

export interface BoardState {
  members: User[];
  votes: VotesByDate;
  changes: Change[];
}

export interface Invite {
  token: string;
  url: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
}

export interface DaySummary {
  yes: number;
  maybe: number;
  no: number;
  total: number;
}

export interface Comment {
  id: string;
  date: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
}

export interface PollOptionView {
  id: string;
  label: string;
  votes: number | null; // null until results are revealed (user has voted / poll closed)
  voters: string[] | null; // names of who picked this option; null while blind
}

export interface PollView {
  id: string;
  title: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  options: PollOptionView[];
  myVotes: string[];
  hasVoted: boolean;
  revealed: boolean;
  closed: boolean;
  mode: PollMode;
  totalVoters: number | null;
  canManage: boolean;
}

export type PollMode = "single" | "multi";

// ─── day events ──────────────────────────────────────────────────────────────
// Mirrors server/src/types.ts (types are duplicated across workspaces by design).

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
  /** optional human label; falls back to the hostname when empty */
  label: string;
}

export interface DayEventAttendee {
  id: string;
  /** board member id, or null for a free-text guest */
  userId: string | null;
  name: string;
}

/** One event per date, as seen by the current user. */
export interface DayEventView {
  date: string;
  title: string;
  color: EventColor;
  description: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  links: DayEventLink[];
  attendees: DayEventAttendee[];
  canManage: boolean;
}

/** The payload the editor PUTs; links and attendees replace what is stored. */
export interface DayEventInput {
  title: string;
  color: EventColor;
  description: string;
  links: { url: string; label: string }[];
  attendees: { userId: string | null; name: string }[];
}
