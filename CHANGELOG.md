# Changelog

A running diary of notable changes. Newest first. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are Europe/Vienna.

## 2026-07-27 (later)

### The timeline grid was out of alignment
Whole columns sat a few pixels off from each other, so the Y/M/N letters stepped
up and down across the grid. **A CSS class collision:** the "no days match"
paragraph is `.empty` with `padding: 24px 0`, and an *unvoted* grid cell is
`.cell.vote.empty` — same component, same scoped stylesheet. Padding is not
compressible, so with `box-sizing: border-box` the `max-height: 38px` on `.cell`
could not hold and every blank cell rendered **48px** tall against its voted
neighbours' 38px. Renamed the paragraph to `.no-match`, and `.cell` now sets
`padding: 0` explicitly so no stray rule can inflate a pinned row again.
Verified in the browser: all columns now report identical cell tops and heights,
matching the sticky names column exactly.

### Strongest days
- The list no longer suggests **days that have already passed**. The default
  range starts on the 1st of the current month, so early in the month it was
  recommending dates that were already gone. `getBestDays` takes a `notBefore`
  cut-off; the sidebar passes midnight today.

### Event days stand out in the calendar
A day holding an event now carries its colour three ways: a solid **bar along
the top edge**, a **tinted border**, and a **wash that fades out downward** so
the vote buttons keep a neutral base. The wash is a background *image* layered
over the cell's background colour, so the yes-tint still reads through it — and
so heatmap mode (which sets the `background` shorthand) cleanly replaces it,
while the top bar still marks the day.

### Events tab ordering
Verified against events seeded across three years in deliberately jumbled order:
the list **was** already correct — years newest-first, and newest-first within
each year. Rather than guess at what looked wrong, the order is now **explicit
and switchable**: a "Newest first / Oldest first" toggle next to the search box.

## 2026-07-27

### Fixes
- **Attendee prefill picked the wrong person.** "From yes-votes" matched members
  by *display name*, so two people called the same thing were both seeded from
  one person's vote. It matches on user id now.
- **The selected option in a voting was unreadable in the dark palettes.** Its
  result bar mixed towards a hard-coded `white`, so a near-white label sat on a
  near-white fill — **1.04:1**, the worst pair in the app. It mixes with
  `--surface` now. (See the audit note below for why this went unnoticed.)
- **Vote counts, the yes-score and the 💬 / + Event buttons** on a day cell were
  measured against `--surface`, but they sit on the cell's *yes-tint* and, in
  heatmap mode, on a strong colour fill — down to 2.65:1. The count pills now
  paint their tint over an opaque base (the `--*-soft` tokens are translucent in
  the dark palettes, so the cell colour was showing through), and the three
  labels use `--ink`.

### Accessibility
- **Dialogs now manage focus.** The day and admin dialogs both claimed
  `aria-modal="true"` while doing nothing to honour it: focus never entered the
  dialog, Tab walked into the page behind it, and closing dropped focus on
  `<body>`. A new `focusTrap` action moves focus in, wraps Tab/Shift-Tab, and
  hands focus back to whatever opened the dialog.
- Hover cards opened by keyboard or tap return focus to their trigger when
  dismissed — the card is portaled to `<body>`, so focus had nowhere to go.

### German, finished
- **The landing page and the admin dialog were still entirely English**
  (~35 strings, including both `confirm()` prompts). They are translated now.
- The **language picker is on the landing page** too, so a visitor can switch
  before signing in.
- The one-letter vote badges follow the language: **J / V / N** in German.

### Events
- **An event can be created for any date from the Events tab** — a date box and
  a ＋ button open the day directly. Reaching a date two years back previously
  meant scrolling the calendar through two years of months.
- **Events show in the timeline**, as a coloured dot in the day column that
  opens the day.
- A **"With event" filter** narrows both day views to days that hold an event;
  in the calendar the month list is driven off the events themselves, so it
  jumps straight to them however far back they are.

### Icons
- Added `apple-touch-icon.png` and 192/512 maskable PNGs, generated from a new
  opaque `app-icon.svg` by `tools/make-icons.mjs` (run
  `npm i --no-save sharp` first — it is not a repo dependency). iOS no longer
  falls back to a screenshot for the home-screen icon.

### The contrast audit is now in the repo
`tools/contrast-audit.mjs` boots the app against a throwaway database, seeds it
(including **one event per palette colour**), and walks 6 themes × 8 views.
**4404 pairs, all ≥ 4.5:1**, tightest 4.80 — up from 2178 pairs, because the
previous run had two blind spots that were hiding real failures:

- it de-duplicated on the CSS class list alone, so all eight event cards
  collapsed into one row and seven of the eight colours were never measured;
- it composited only *ancestor* backgrounds, so an absolutely positioned sibling
  painted behind text — the voting result bar — was invisible to it.

Both are fixed, and the four earlier parser fixes (`color(srgb …)` from
`color-mix`, faded elements, `::placeholder`, class-label collisions) are
carried over. It is deliberately outside `npm test`: it drives a real browser.

### Tests
- A parity test asserts `EVENT_COLORS` and `DEFAULT_EVENT_COLOR` match across
  the two workspaces. They are hand-duplicated and `normalizeColor` falls back
  to `sage` rather than erroring, so a mismatch would otherwise be silent.

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
