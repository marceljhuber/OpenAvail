import { get, writable } from "svelte/store";
import { api } from "./api";
import { addMonths, daysInMonth, startOfMonth, toISO } from "./date";
import type { AppConfig, BoardState, PollMode, PollView, User, Vote } from "./types";

export type ViewKind = "calendar" | "timeline";
export type Theme = "light" | "dark";
export type SortKey = "date" | "yes" | "total" | "maybe" | "no" | "focus";

export interface Filters {
  rangeFrom: string;
  rangeTo: string;
  /** user ids whose availability we focus on (e.g. "only days Rainer can come") */
  focusMembers: string[];
  /** the vote those focus members must have for a day to pass the filter */
  focusVote: Vote;
  sortBy: SortKey;
  view: ViewKind;
  /** calendar heatmap mode: shade each day green→red by how many said yes */
  heatmap: boolean;
}

function defaultRange(): { rangeFrom: string; rangeTo: string } {
  const start = startOfMonth(new Date());
  const end = addMonths(start, 2);
  const last = new Date(end.getFullYear(), end.getMonth(), daysInMonth(end.getFullYear(), end.getMonth()));
  return { rangeFrom: toISO(start), rangeTo: toISO(last) };
}

const emptyBoard: BoardState = { members: [], votes: {}, changes: [] };

export const appConfig = writable<AppConfig | null>(null);
export const session = writable<User | null>(null);
export const board = writable<BoardState>(emptyBoard);
export const polls = writable<PollView[]>([]);
export const commentCounts = writable<Record<string, number>>({});
export const selectedDay = writable<string | null>(null);
export const loading = writable<boolean>(true);
export const theme = writable<Theme>("light");

const THEME_KEY = "openavail-theme";

/** Apply the saved theme, or the OS preference on first visit. Call before mount. */
export function initTheme(): void {
  let t: Theme = "light"; // default is day/light unless the user chose dark
  try {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved === "dark" || saved === "light") t = saved;
  } catch {
    /* storage unavailable */
  }
  setTheme(t);
}

export function setTheme(t: Theme): void {
  theme.set(t);
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
}

export function toggleTheme(): void {
  setTheme(get(theme) === "dark" ? "light" : "dark");
}

export const filters = writable<Filters>({
  ...defaultRange(),
  focusMembers: [],
  focusVote: "yes",
  sortBy: "date",
  view: "calendar",
  heatmap: false,
});

let eventSource: EventSource | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;

/** Load public config + existing session on boot. */
export async function initApp(): Promise<void> {
  loading.set(true);
  try {
    const [cfg, user] = await Promise.all([api.config(), api.me()]);
    appConfig.set(cfg);
    session.set(user);
    if (user) {
      await Promise.all([refreshBoard(), refreshPolls(), refreshCommentCounts()]);
      startLive();
    }
  } finally {
    loading.set(false);
  }
}

export async function refreshBoard(): Promise<void> {
  // Fetch the whole board (votes are tiny for a friend group). The calendar is
  // then genuinely infinite, and the from/to range is applied client-side as an
  // analysis window for the timeline, stats, filtering and sorting.
  const state = await api.state();
  board.set(state);
}

export async function refreshPolls(): Promise<void> {
  polls.set(await api.listPolls());
}

export async function refreshCommentCounts(): Promise<void> {
  commentCounts.set(await api.commentCounts());
}

export async function createPoll(
  title: string,
  options: string[],
  mode: PollMode = "multi",
): Promise<void> {
  await api.createPoll(title, options, mode);
  await refreshPolls();
}

function applyPoll(updated: PollView): void {
  polls.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
}

export async function updatePoll(id: string, patch: { title?: string; mode?: PollMode }): Promise<void> {
  applyPoll(await api.updatePoll(id, patch));
}

export async function addPollOption(id: string, label: string): Promise<void> {
  applyPoll(await api.addPollOption(id, label));
}

export async function renamePollOption(id: string, optionId: string, label: string): Promise<void> {
  applyPoll(await api.renamePollOption(id, optionId, label));
}

export async function deletePollOption(id: string, optionId: string): Promise<void> {
  applyPoll(await api.deletePollOption(id, optionId));
}

export async function votePoll(id: string, optionIds: string[]): Promise<void> {
  const updated = await api.votePoll(id, optionIds);
  polls.update((list) => list.map((p) => (p.id === id ? updated : p)));
}

export async function deletePoll(id: string): Promise<void> {
  await api.deletePoll(id);
  polls.update((list) => list.filter((p) => p.id !== id));
}

export async function closePoll(id: string, reopen = false): Promise<void> {
  applyPoll(await api.closePoll(id, reopen));
}

function refreshAll(): void {
  refreshBoard().catch(() => {});
  refreshPolls().catch(() => {});
  refreshCommentCounts().catch(() => {});
}

/** Live updates via Server-Sent Events, with a slow safety poll as fallback
 * (in case a proxy buffers SSE or an event is missed). */
export function startLive(): void {
  stopLive();
  try {
    eventSource = new EventSource("/api/events");
    eventSource.onmessage = (e) => {
      try {
        const { channel } = JSON.parse(e.data) as { channel: string };
        if (channel === "board") refreshBoard().catch(() => {});
        else if (channel === "polls") refreshPolls().catch(() => {});
        else if (channel === "comments") refreshCommentCounts().catch(() => {});
      } catch {
        /* ignore malformed frames */
      }
    };
    // EventSource reconnects automatically on error; nothing to do here.
  } catch {
    /* SSE unsupported — the fallback timer still keeps things fresh */
  }
  fallbackTimer = setInterval(refreshAll, 45000);
}

export function stopLive(): void {
  eventSource?.close();
  eventSource = null;
  if (fallbackTimer) clearInterval(fallbackTimer);
  fallbackTimer = null;
}

export async function login(credential: string, invite?: string): Promise<User> {
  const user = await api.loginWithGoogle(credential, invite);
  return afterLogin(user);
}

export async function loginDev(name: string, email?: string): Promise<User> {
  const user = await api.loginDev(name, email);
  return afterLogin(user);
}

async function afterLogin(user: User): Promise<User> {
  session.set(user);
  await Promise.all([refreshBoard(), refreshPolls()]);
  startLive();
  return user;
}

export async function logout(): Promise<void> {
  stopLive();
  await api.logout();
  session.set(null);
  board.set(emptyBoard);
  polls.set([]);
  commentCounts.set({});
  selectedDay.set(null);
}

/**
 * Optimistically toggle the current user's vote, then persist. The day's votes
 * are updated locally first so the UI feels instant; a failed request reverts.
 */
export async function castVote(date: string, vote: Vote): Promise<void> {
  const user = get(session);
  if (!user) return;

  const prev = get(board);
  const dayVotes = { ...(prev.votes[date] ?? {}) };
  const current = dayVotes[user.id];
  if (current === vote) delete dayVotes[user.id];
  else dayVotes[user.id] = vote;

  const nextVotes = { ...prev.votes };
  if (Object.keys(dayVotes).length === 0) delete nextVotes[date];
  else nextVotes[date] = dayVotes;
  board.set({ ...prev, votes: nextVotes });

  try {
    await api.vote(date, vote);
    await refreshBoard();
  } catch {
    board.set(prev); // revert on failure
  }
}
