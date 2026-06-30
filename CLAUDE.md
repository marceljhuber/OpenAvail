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

## Conventions
- Conventional Commits; commit per major feature. Never commit `.env`, `legacy/`, or `INDEX.md`
  (the latter holds internal homelab IPs/container names).
- The good date/vote-summary logic from the prototype lives in `web/src/lib/date.ts` and
  `web/src/lib/vote.ts` (ported from the old `app.js`).
