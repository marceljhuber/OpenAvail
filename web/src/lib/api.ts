import type { AppConfig, BoardState, Comment, Invite, PollView, User, Vote } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  config: () => request<AppConfig>("/api/config"),

  me: async (): Promise<User | null> => {
    try {
      const { user } = await request<{ user: User }>("/api/me");
      return user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },

  loginWithGoogle: (credential: string, invite?: string) =>
    request<{ user: User }>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential, invite }),
    }).then((r) => r.user),

  loginDev: (name: string, email?: string) =>
    request<{ user: User }>("/api/auth/dev", {
      method: "POST",
      body: JSON.stringify({ name, email }),
    }).then((r) => r.user),

  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  state: (from?: string, to?: string) => {
    const qs = from && to ? `?from=${from}&to=${to}` : "";
    return request<BoardState>(`/api/state${qs}`);
  },

  vote: (date: string, vote: Vote | null) =>
    request<{ date: string; previousVote: Vote | null; nextVote: Vote | null }>("/api/vote", {
      method: "POST",
      body: JSON.stringify({ date, vote }),
    }),

  // admin
  createInvite: () => request<Invite & { active: boolean }>("/api/invites", { method: "POST" }),
  listInvites: () =>
    request<{ invites: (Invite & { active: boolean })[] }>("/api/invites").then((r) => r.invites),
  revokeInvite: (token: string) =>
    request<{ ok: true }>(`/api/invites/${encodeURIComponent(token)}`, { method: "DELETE" }),
  listMembers: () => request<{ members: User[] }>("/api/members").then((r) => r.members),
  removeMember: (id: string) =>
    request<{ ok: true }>(`/api/members/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // polls
  listPolls: () => request<{ polls: PollView[] }>("/api/polls").then((r) => r.polls),
  createPoll: (title: string, options: string[]) =>
    request<PollView>("/api/polls", { method: "POST", body: JSON.stringify({ title, options }) }),
  votePoll: (id: string, optionIds: string[]) =>
    request<PollView>(`/api/polls/${encodeURIComponent(id)}/vote`, {
      method: "POST",
      body: JSON.stringify({ optionIds }),
    }),
  deletePoll: (id: string) =>
    request<{ ok: true }>(`/api/polls/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // comments
  commentCounts: () =>
    request<{ counts: Record<string, number> }>("/api/comments/counts").then((r) => r.counts),
  listComments: (date: string) =>
    request<{ comments: Comment[] }>(`/api/comments?date=${encodeURIComponent(date)}`).then(
      (r) => r.comments,
    ),
  addComment: (date: string, body: string) =>
    request<Comment>("/api/comments", { method: "POST", body: JSON.stringify({ date, body }) }),
  deleteComment: (id: string) =>
    request<{ ok: true }>(`/api/comments/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
