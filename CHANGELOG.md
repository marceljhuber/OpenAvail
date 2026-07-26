# Changelog

A running diary of notable changes. Newest first. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are Europe/Vienna.

## 2026-07-26

### Day events — a memory of what actually happened
- **Any date can now hold an event** (past dates included): a title, a colour, a
  description, links, and who was there. One event per day; **admins** create and
  edit them, everyone can see them.
- **Attendees are seeded from the day's yes-votes** ("From yes-votes") and then
  freely editable — tick members on/off, and type in **guests** who aren't board
  members at all. Names are stored as snapshots, so attendance survives a member
  being renamed or removed.
- **Links** are validated server-side: only `http(s)` survives (a bare
  `instagram.com/p/…` is upgraded to https, `javascript:` is dropped), and each
  chip picks up an icon from the host (YouTube, Instagram, TikTok, Spotify, maps).
- **New "Events" tab**: every event newest-first, grouped under **sticky year
  dividers**, each card in its own colour, with a search box over titles,
  descriptions and attendee names.
- The **calendar** shows a coloured chip on days that have an event and tints the
  cell's border to match; the **date number is now a button** that opens the day.

### Themes
- The light/dark toggle became a **palette picker**: **Auto** (follows the OS,
  live) plus **Warm, Paper, Dark, Midnight, Ocean, Forest**. Every palette
  redefines the same token set, so components never hard-code a colour.
- Colours that were previously hard-coded — the body gradient, the "top day"
  ring, modal backdrops, the timeline's month tints and its amber vote text —
  are now tokens, so they follow the palette instead of breaking outside light
  mode.

### Contrast — every palette now passes WCAG AA
Audited with a browser-driven pass that reads the *computed* colour of every
text element and composites its real ancestor backgrounds (so `color-mix`,
translucent panels and stacked opacity are all accounted for), across 6 themes ×
8 views. **2178 pairs measured; all now ≥ 4.5:1**, tightest 4.80. Before the
pass, warm/paper/forest had 21/13/18 failures and the dark palettes 1 each.

- **White text on the vote colours failed in every single theme** (1.85–4.06:1) —
  worst in Midnight. Timeline cells, active vote buttons, focus chips and poll
  checkmarks now use new `--on-yes` / `--on-maybe` / `--on-no` tokens (deep tints
  of the fill). `.btn.danger` keeps white text by darkening its own background.
- **`--muted` was too light in all three light palettes** (3.9–4.4:1 on `--chip`
  / `--empty`, which is where it actually lands). Re-solved for ~5.6:1 in every
  palette, light and dark — this alone fixed a dozen labels, hints and the ✕
  buttons. Midnight/Dark/Ocean got the same headroom treatment.
- `.eyebrow` used `--yes` as a *text* colour (2.4:1 on the light panels) — now
  `--yes-ink`.
- **Stopped fading text with `opacity`**, which multiplies directly into the
  contrast ratio: past day cells are marked with a **dashed border** instead of
  `opacity: .62` (they hold events now, so they must stay readable), and the 💬
  button lost its 0.6 fade.
- Accent-tinted text (event chips, month labels, attendee ticks) was mostly
  accent with a little ink; flipped to mostly ink with a hint of accent.
- `::placeholder` is pinned to `--muted` — the browser default was very faint on
  the dark palettes.

### The hover cards that clashed and cut names off
- Voter-name popovers (calendar **and** votings) were `position: absolute` inside
  the calendar's scroll container, so they were **clipped** at its edges, pinned
  to a single day-cell's width with `white-space: nowrap` (hence truncated
  names), and opened downward **over the vote buttons**.
- Replaced with one shared `HoverCard`: the card is portaled to `<body>`,
  positioned `fixed` from the trigger, **flips above** when there's no room
  below, **clamps** into the viewport horizontally, and sizes itself to its
  content. Also **tappable on touch** (there is no hover on a phone) and
  dismissed by Escape / outside click / scrolling away.

### Branding
- A hand-drawn **SVG logo** (calendar page + tick) in the top bar and on the
  landing page, plus `favicon.svg` (light/dark aware), a Safari `mask-icon`, and
  a web manifest. *iOS home-screen icons still want a raster
  `apple-touch-icon.png`; SVG-only means iOS falls back to a screenshot.*
- The language button shows a **text badge (EN / DE)**. The flag emoji rendered
  as the bare letters "GB" on Windows, which has no regional-indicator glyphs.
  `<html lang>` now tracks the chosen locale.

### Calendar
- **Infinite scrolling backwards too.** History stopped at 3 months, so older
  days were unreachable — which made "add an event to a past day" impossible past
  the first quarter. Scroll position is preserved when older months are
  prepended, and a **Today** button jumps back.
- **Each month gets a faint hue of its own** so the blocks are distinguishable
  while scrolling; the timeline's month bands now use the same scale (and finally
  work in dark palettes).

### UI polish and mobile
- Standardised breakpoints (1200 / 900 / 640 / 480). Added the media queries that
  `VotingsPanel`, `PollCard`, `DayModal` and `Sidebar` never had.
- Modals become **bottom sheets** under 640px; the calendar goes 2 columns under
  900px and 1 under 480px with day cells that shrink to their content.
- Fixed text that clipped: the sidebar's stat labels ("VOTED …") now wrap, the
  day header no longer squeezes the yes-score, and long names truncate with a
  `title` instead of overflowing.
- Added a global `:focus-visible` ring (there was none), a
  `prefers-reduced-motion` block, ≥44px tap targets, 16px inputs on phones (iOS
  zoom), and `overflow-x: hidden` on the body.
- The **day dialog is now translated** (it was hard-coded English), and the
  range/sort controls are hidden on the Events tab where they mean nothing.

## 2026-07-06 (later)

- **Language menu lingers** ~1.6s after the pointer leaves (and toggles on
  click), so you can move down into the list to pick a language instead of it
  vanishing on the way.
- **Calendar day cells** now hide voter names by default and reveal them in the
  same floating white card (one name per line, coloured vote dot) on hover/focus
  — matching the votings cards.
- **Votings**: the "👤" hover affordance no longer repeats the vote count next to
  it — the number shows once.
- **Wider default layout**: slimmer votings rail and a larger max width, giving
  the timeline and the controls above it more room.

## 2026-07-06

### Languages (English / German)
- A **language picker** in the top-right (flag button, hover/focus dropdown).
  The whole main interface — top bar, tabs, filters, calendar, timeline,
  votings, sidebar, vote buttons — is now bilingual, with the choice saved to
  localStorage and month/weekday/date names formatted in the active locale.
  (Landing, admin and day-detail dialogs are not translated yet.)

### Votings
- Voter names are **hidden by default** now; each option shows a small "👤 n"
  badge and reveals the names in a floating white card (one per line) on
  hover/focus, instead of always listing them inline.

### Fixes
- **Calendar was squeezed into a tiny column.** The heatmap toolbar made the
  calendar component render two root elements, so the parent grid pushed the
  scroll area into the 280px sidebar column. Wrapped it in a single root.
- **Timeline wouldn't scroll/drag.** The panel had `min-width:auto` (grid-item
  default) and grew to the full grid width, overflowing the page instead of
  scrolling internally, so the drag/wheel/button handlers had nothing to move.
  Pinned `min-width:0` so it scrolls within its column.
- The calendar now reliably opens on the current month (it could drift onto a
  past month once vote data loaded and cells grew taller).
- Repositioned the timeline "Person" header (bottom-left, above the names).

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
