# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenAvail is a self-hostable group availability planner (vote yes/maybe/no on days, find common
free days). One deployment = one shared board owned by an admin; friends join via time-limited
invite links and sign in with Google. It is rebuilt from an earlier single-file prototype (kept in
`legacy/`, gitignored) into a TypeScript monorepo.

## Commands

```bash
npm install            # installs web + server workspaces
npm run dev            # API on :8787 + Vite web on :5173 (proxies /api → API)
npm run build          # svelte-check + vite build (web) then tsc (server)
npm test               # server vitest suite
npm run test --workspace server -- path/to/file.test.ts   # single test file
```
Requires a repo-root `.env` (copy from `.env.example`). Node 24+ is required for the built-in
`node:sqlite` module.

## Architecture

Monorepo with npm workspaces:
- `web/` — Svelte 5 + Vite + TS SPA, builds to `web/dist/` (served statically by Caddy in prod).
- `server/` — Fastify + TS API. SQLite via the built-in `node:sqlite` (`DatabaseSync`) — **no
  native build step**; do not reintroduce `better-sqlite3` (it fails to compile on Node 26).
- `deploy/` — single-container Dockerfile + Compose. In production the Node server also serves
  the built SPA from `STATIC_DIR` (with history-API fallback); `deploy/Caddyfile` is an optional
  TLS front. HTTPS is required in prod because the session cookie is `Secure`.

A `DEV_LOGIN=true` env var (non-production only) enables a name-only `/api/auth/dev` login and a
dev form on the landing page, for local testing without Google OAuth.

### Security model (the reason for the rebuild — do not regress)
The original prototype decoded the Google JWT client-side and trusted a client-supplied `user`
object, so anyone could impersonate anyone. In the rebuild:
- Google ID tokens are **verified server-side** with `google-auth-library` (audience =
  `GOOGLE_CLIENT_ID`).
- A successful login creates a DB-backed session and sets an httpOnly cookie.
- **The acting user is always derived from the session cookie, never from the request body.**
- Access is gated: `ADMIN_EMAIL` → admin; existing member → ok; valid unexpired invite → register;
  otherwise 403. Logged-out visitors only see a branded landing page.

### Config
All config is a single repo-root `.env` (see `.env.example`): `GOOGLE_CLIENT_ID`, `ADMIN_EMAIL`,
`OWNER_NAME` (landing branding), `PUBLIC_URL` (invite link base), `DB_PATH`, `PORT`, `NODE_ENV`.
The browser fetches public config (owner name, client id) from `GET /api/config` so no rebuild is
needed to change it. Loaded by `server/src/config.ts`.

### Data model (SQLite)
`users`, `votes(user_id,date)` toggled yes/maybe/no, `changes` (capped log), `invites`
(reusable, 24h TTL, revocable), `sessions`. Votes are `votes[isoDate][userId] = vote`.

Polls ("Votings" tab): `polls`, `poll_options`, `poll_votes`. A poll has a `mode`
(`'single'`=radio / `'multi'`=checkboxes; single-choice is enforced server-side in `setUserVotes`
and trims existing selections when switched) and a nullable `closed_at`. Results (counts **and**
per-option voter names) are **blind until the requesting user has voted _or_ the poll is closed** —
`buildPollView` (server/src/polls.ts) returns null counts/voters/totals until then; do not leak
them to a user who hasn't voted while the poll is open. Ending a poll (`closed_at` set, creator/
admin only) reveals results to everyone and blocks further votes; options/title/mode stay editable
via the poll routes. New poll columns are added by the idempotent `migrate()` in `db.ts`.

Day events ("Events" tab): `day_events` (**one per date** — `date` is the primary key),
`day_event_links`, `day_event_attendees`. **Admin-only** create/edit/delete (`requireAdmin`);
every member can read. Attendee rows carry `user_id` **and** a denormalized `name` snapshot with
**no foreign key**, so attendance survives a member being deleted (`repo.renameUser` keeps the
snapshot in sync, like it does for `changes`/`day_comments`); `user_id` is null for a free-text
guest. Colours are palette *tokens* (`sage`, `coral`, …), never hex — the browser maps them to
`--ev-*` CSS variables per theme, and `normalizeColor` falls back rather than erroring. Links are
run through `sanitizeUrl` (**http(s) only** — these render as `<a href>`, so `javascript:` must
never reach the DB). `PUT /api/day-events/:date` replaces the whole event, links and attendees
included, in one transaction.

**Naming trap:** `server/src/events.ts` is the SSE pub/sub bus and `server/src/routes/events.ts`
is the `GET /api/events` stream. Day events are `dayEvents` / `day_events` / `/api/day-events`
everywhere, and their SSE channel is `"dayEvents"`.

### Theming
Every palette (`warm`, `paper`, `dark`, `midnight`, `ocean`, `forest`) is a
`:root[data-theme="…"]` block in `web/src/app.css` redefining the **same** token set. Components
must never hard-code a colour — reach for a token, or `color-mix()` from one. Add a palette by
copying a block and registering it in `PALETTES` (`web/src/lib/stores.ts`); the stored choice may
also be `"auto"`, which resolves against `prefers-color-scheme` at runtime and re-resolves when
the OS flips. `app.css` also owns the z-index scale (`--z-sticky/-pop/-modal`) — keep every
`z-index` on it.

### Contrast rules (every palette is at WCAG AA, keep it that way)
Run `tools/contrast-audit.mjs` after touching any colour — it boots the app against a scratch DB,
seeds one event per palette colour, and walks 6 themes × 8 views measuring computed colours
against real composited backgrounds: **4404 text/background pairs, all ≥ 4.5:1**, tightest 4.80.
It needs `npm i --no-save playwright-core` and is deliberately **not** in `npm test` (real
browser). Its exit code is the failure count. The rules that keep it true:

- **`--yes` / `--maybe` / `--no` are fills, never text.** White on them measures 1.9–4.1:1. Text
  drawn *on* a solid vote fill uses `--on-yes` / `--on-maybe` / `--on-no` (deep tints of the fill,
  one set per palette). Text drawn *next to* them uses `--yes-ink` / `--maybe-ink` / `--no-ink`.
  `.btn.danger` keeps white by darkening its own background instead.
- **`--muted` must clear 4.5:1 on the darkest surface it lands on** — `--empty` / `--chip`, not
  just `--surface`. Every palette targets ~5.6:1 there for headroom.
- **Accent-tinted text is mostly `--ink`**: `color-mix(in srgb, var(--ev) 45%, var(--ink))`, not
  the reverse. Above ~50% accent it fails against its own tinted chip.
- **Do not fade text with `opacity`.** It multiplies straight into the contrast ratio. Past day
  cells are marked with a dashed border, not `opacity: .62`; the same applied to the 💬 button.
  Deliberate de-emphasis states (`.dim`, disabled controls) are exempt.
- `::placeholder` is pinned to `--muted` — the UA default is far too faint in the dark palettes.
- **Never mix towards a literal `white`/`black`** — mix towards `--surface`. `.opt.on .bar` did,
  and produced a near-white fill under near-white text (1.04:1) in the dark palettes.
- **A translucent token needs an opaque base under text.** `--yes-soft` & co. are `rgba(…)` in the
  dark palettes, so a `.pill` on a tinted day cell let the tint through; they paint the tint as a
  layer over `--surface` instead.
- **Text on a *tinted container* must be solved against the tint, not `--surface`** — day-cell
  labels sit on the yes-shading and the heatmap fill, so they use `--ink`, not `--muted`.

### Floating cards
`HoverCard.svelte` + the `floating` action (`web/src/lib/popover.ts`) are the only way to show a
popover/menu. The card is portaled to `<body>` and positioned `fixed`, because anything
`position: absolute` inside `.calendar-scroll` gets clipped by its `overflow: auto` and pinned to
one day-cell's width. It flips, clamps to the viewport, opens on tap where there is no hover, and
its anchor wrapper is `display: contents` (so `floating` measures `firstElementChild`).

### Dialogs
Any element with `role="dialog"` must carry `use:focusTrap` (`web/src/lib/focusTrap.ts`) — it
moves focus in, wraps Tab/Shift-Tab, and restores focus to the trigger on destroy. Without it
`aria-modal="true"` is a lie: Tab escapes into the page behind.

## Conventions
- Conventional Commits; commit per major feature. Never commit `.env`, `legacy/`, or `INDEX.md`
  (the latter holds internal homelab IPs/container names).
- The good date/vote-summary logic from the prototype lives in `web/src/lib/date.ts` and
  `web/src/lib/vote.ts` (ported from the old `app.js`).
- Types are **duplicated by hand** across workspaces (`server/src/types.ts` ↔
  `web/src/lib/types.ts`) — there is no shared package. A new API shape needs both, plus a method
  in `web/src/lib/api.ts` and usually a store + SSE branch in `web/src/lib/stores.ts`.
- User-facing strings go in **both** dicts in `web/src/lib/i18n.ts` (en + de).
- `@fastify/static` is registered with `wildcard: false`, which globs `STATIC_DIR` **at startup** —
  after rebuilding the SPA, restart the server or the newly-hashed assets 404.
