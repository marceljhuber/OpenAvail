// Shared filtering/sorting logic for the calendar and timeline views.

import type { Vote, VotesByDate } from "./types";
import type { Filters, SortKey } from "./stores";
import { summarizeDay } from "./vote";
import { toISO } from "./date";

/**
 * Does this day satisfy the focus filter? True when every focused member has
 * cast `focusVote` on that day. With no focused members the filter is inactive
 * (every day passes).
 */
export function dayMatchesFocus(
  votes: VotesByDate,
  iso: string,
  focusMembers: string[],
  focusVote: Vote,
): boolean {
  if (focusMembers.length === 0) return true;
  const day = votes[iso] ?? {};
  return focusMembers.every((id) => day[id] === focusVote);
}

/** Count, among the focused members, how many cast `focusVote` on this day. */
export function focusYesCount(
  votes: VotesByDate,
  iso: string,
  focusMembers: string[],
  focusVote: Vote,
): number {
  const day = votes[iso] ?? {};
  return focusMembers.filter((id) => day[id] === focusVote).length;
}

function sortValue(votes: VotesByDate, iso: string, sortBy: SortKey, f: Filters): number {
  const s = summarizeDay(votes, iso);
  switch (sortBy) {
    case "yes":
      return s.yes;
    case "total":
      return s.total;
    case "maybe":
      return s.maybe;
    case "no":
      return s.no;
    case "focus":
      return focusYesCount(votes, iso, f.focusMembers, f.focusVote);
    default:
      return 0;
  }
}

/** Sort a list of days according to the active filters (descending for metrics). */
export function sortDays(days: Date[], votes: VotesByDate, f: Filters): Date[] {
  if (f.sortBy === "date") {
    return [...days].sort((a, b) => a.getTime() - b.getTime());
  }
  return [...days].sort((a, b) => {
    const av = sortValue(votes, toISO(a), f.sortBy, f);
    const bv = sortValue(votes, toISO(b), f.sortBy, f);
    return bv - av || a.getTime() - b.getTime();
  });
}
