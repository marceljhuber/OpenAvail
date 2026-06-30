// Vote aggregation helpers — ported from the prototype's app.js and generalized
// to take state as arguments (no globals).

import type { DaySummary, User, Vote, VotesByDate } from "./types";
import { toISO } from "./date";

export const VOTE_LABEL: Record<Vote, string> = { yes: "Y", maybe: "M", no: "N" };

export function summarizeDay(votes: VotesByDate, iso: string): DaySummary {
  const dayVotes = votes[iso] ?? {};
  const summary: DaySummary = { yes: 0, maybe: 0, no: 0, total: 0 };
  for (const vote of Object.values(dayVotes)) {
    if (vote in summary) summary[vote] += 1;
    summary.total += 1;
  }
  return summary;
}

export function getDayVoters(
  votes: VotesByDate,
  members: User[],
  iso: string,
): Record<Vote, string[]> {
  const dayVotes = votes[iso] ?? {};
  const voters: Record<Vote, string[]> = { yes: [], maybe: [], no: [] };
  for (const [userId, vote] of Object.entries(dayVotes)) {
    const user = members.find((m) => m.id === userId);
    if (user && voters[vote]) voters[vote].push(user.name);
  }
  return voters;
}

export interface RankedDay {
  date: Date;
  iso: string;
  summary: DaySummary;
}

/** Days that have at least one vote, ranked: most yes, then most responses. */
export function getBestDays(days: Date[], votes: VotesByDate): RankedDay[] {
  return days
    .map((date) => ({ date, iso: toISO(date), summary: summarizeDay(votes, toISO(date)) }))
    .filter((d) => d.summary.total > 0)
    .sort(
      (a, b) =>
        b.summary.yes - a.summary.yes ||
        b.summary.total - a.summary.total ||
        a.date.getTime() - b.date.getTime(),
    );
}
