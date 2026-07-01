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
  votes: number | null; // null until results are revealed (user has voted)
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
  totalVoters: number | null;
  canManage: boolean;
}
