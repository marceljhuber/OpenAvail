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

export interface Poll {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
}

export interface PollOption {
  id: string;
  pollId: string;
  label: string;
  position: number;
}

/**
 * A poll as seen by a specific user. Results are blind until the user has
 * voted: when `revealed` is false, `votes` and `totalVoters` are null.
 */
export interface PollView {
  id: string;
  title: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  options: { id: string; label: string; votes: number | null }[];
  myVotes: string[];
  hasVoted: boolean;
  revealed: boolean;
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

/** votes[isoDate][userId] = Vote */
export type VotesByDate = Record<string, Record<string, Vote>>;

export interface BoardState {
  members: User[];
  votes: VotesByDate;
  changes: Change[];
}
