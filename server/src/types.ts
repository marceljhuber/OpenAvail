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

/** votes[isoDate][userId] = Vote */
export type VotesByDate = Record<string, Record<string, Vote>>;

export interface BoardState {
  members: User[];
  votes: VotesByDate;
  changes: Change[];
}
