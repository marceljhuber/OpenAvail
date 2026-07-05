# Changelog

A running diary of notable changes. Newest first. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are Europe/Vienna.

## 2026-07-05

### Votings — editable, endable, and transparent
- **End / re-open a voting** (creator or admin). Ending sets `polls.closed_at`,
  reveals results to everyone (even people who never voted), and blocks further
  votes (`409`). Re-opening hides them again from non-voters.
- **See who voted for what.** Once results are revealed (you've voted, or the
  poll is closed) each option lists the names that picked it. Still fully blind
  before that — no counts, names or totals leak to someone who hasn't voted.
- **Single- vs multiple-choice**, chosen at creation and switchable later.
  Single-choice is a radio (one pick per person), enforced server-side; flipping
  a multi poll to single trims everyone down to their earliest pick.
- **Post-hoc editing**: rename / add / delete options (can't remove the last
  one) and edit the title, from an inline "Edit" panel on each poll card.
- Schema: idempotent `ALTER TABLE` migrations add `polls.closed_at` and
  `polls.mode` (default `'multi'`), so existing polls are unchanged.

### Calendar
- **Heatmap toggle** — shade each day with responses from dark-green (most yes)
  through yellow to dark-red (fewest), relative to the busiest day.
- The three yes / maybe / no counts now sit on **one row** on desktop.
- A few **past months** render above the current one (scroll up to reach them);
  the view opens on the current month and greys out past days/months.

### Timeline
- **Steerable horizontal scrolling**: drag the grid to pan, vertical mouse wheel
  scrolls sideways, ⏮◀▶⏭ jump/nudge buttons, arrow-key panning when focused, and
  an always-visible in-panel scrollbar — so you can reach the right-hand columns
  even when the OS hides its overlay scrollbar.
- Fixed a few-pixel **row misalignment**: row separators are painted with
  `box-shadow` instead of a `border` (which added to box height and let
  sub-pixel rounding drift down a column), and every cell is pinned to a fixed
  height.

### Filters
- The focus **"clear" button no longer reflows the row** — its slot is always
  reserved, so neighbouring controls keep their position.

## Earlier

Baseline before this diary began: self-hostable group availability planner —
Google sign-in with server-side token verification, session-cookie auth, invite
links, calendar + timeline vote views, per-day comments, blind multi-select
polls, dark mode, and a single-container Docker deployment. See the git history
for details.
