// Client-side helpers for day events: link classification, attendee prefill and
// the shared month-hue used to tint the calendar and timeline.

import type { DayEventAttendee, EventColor, User, VotesByDate } from "./types";
import { getDayVoters } from "./vote";

/** Inline style that binds an element's `--ev` to the event's palette token, so
 * its CSS can derive fills and text with color-mix. */
export function colorStyle(color: EventColor): string {
  return `--ev: var(--ev-${color})`;
}

export type LinkKind = "youtube" | "instagram" | "tiktok" | "spotify" | "maps" | "photos" | "link";

const HOST_KINDS: [RegExp, LinkKind][] = [
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(spotify\.com|open\.spotify\.com)$/, "spotify"],
  [/(^|\.)(google\.[a-z.]+|maps\.app\.goo\.gl)$/, "maps"],
  [/(^|\.)(flickr\.com|imgur\.com|photos\.app\.goo\.gl)$/, "photos"],
];

const KIND_ICONS: Record<LinkKind, string> = {
  youtube: "▶",
  instagram: "◎",
  tiktok: "♪",
  spotify: "♫",
  maps: "◈",
  photos: "❐",
  link: "↗",
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Classify a link by hostname so each chip can carry a recognisable glyph. */
export function linkKind(url: string): LinkKind {
  const host = hostOf(url);
  if (!host) return "link";
  // maps.app.goo.gl is a maps short link; a plain google.com/maps path also counts
  for (const [pattern, kind] of HOST_KINDS) {
    if (pattern.test(host)) return kind;
  }
  return "link";
}

export function linkIcon(url: string): string {
  return KIND_ICONS[linkKind(url)];
}

/** Label to show for a link: the user's own label, else a tidied hostname. */
export function linkLabel(url: string, label: string): string {
  if (label.trim()) return label.trim();
  const host = hostOf(url);
  return host.replace(/^www\./, "") || url;
}

/**
 * Seed an attendee list from everyone who voted yes on that day. Used by the
 * editor's "from yes-votes" button; the result is then freely editable.
 */
export function prefillAttendees(
  votes: VotesByDate,
  members: User[],
  iso: string,
): DayEventAttendee[] {
  const yesNames = new Set(getDayVoters(votes, members, iso).yes);
  return members
    .filter((m) => yesNames.has(m.name))
    .map((m) => ({ id: `member:${m.id}`, userId: m.id, name: m.name }));
}

/**
 * A stable, gentle hue per calendar month (0–11 → 0–330°). Shared by the
 * calendar's month cards and the timeline's month bands so the two agree.
 */
export function monthHue(monthIndex: number): number {
  return ((monthIndex % 12) + 12) % 12 * 30;
}
