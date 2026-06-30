<div align="center">

# OpenAvail

**Self-hostable group availability planner.**
Vote `yes` / `maybe` / `no` on any day, then find when everyone can actually meet.

</div>

---

OpenAvail is a small, privacy-friendly alternative to Doodle/WhenAvailable that you run
yourself. One deployment is one shared availability board owned by you (the admin). Friends
join through a time-limited invite link, sign in with Google, and vote on an infinite calendar.
Two analysis views — an infinite month calendar and a horizontal people×days timeline — plus
member filters and sorting help you spot the best days.

## Highlights

- 🔒 **Private by default** — logged-out visitors only see a branded landing page.
- 🎟️ **Invite links** — the admin shares a link that works for ~24h; anyone with it can join.
- ✅ **Server-verified Google login** — ID tokens are verified server-side and the acting user
  is always derived from a session cookie (no client-supplied identities).
- 🗓️ **Infinite calendar** + **horizontal timeline** views, both virtualized.
- 🔎 **Filter & sort** by member, e.g. *"days where Rainer is available, ranked by most yes"*.
- 🪶 **Cheap to host** — Node + SQLite (single file), static frontend behind Caddy.

## Tech stack

| Part      | Stack                                            |
| --------- | ------------------------------------------------ |
| Frontend  | Svelte 5 + Vite + TypeScript (static `dist/`)    |
| Backend   | Node + Fastify + TypeScript                      |
| Storage   | SQLite (built-in `node:sqlite`, no native build) |
| Auth      | Google Identity Services + server-side verify    |
| Deploy    | Caddy + Docker Compose                           |

## Quick start (local)

```bash
cp .env.example .env       # fill in GOOGLE_CLIENT_ID, ADMIN_EMAIL, OWNER_NAME
npm install                # installs web + server workspaces
npm run dev                # API on :8787, web on :5173 (proxies /api)
```

Open http://localhost:5173. Sign in with the Google account set as `ADMIN_EMAIL` to become the
admin, create an invite link, and share it.

See [`.env.example`](./.env.example) for all configuration and the Google OAuth setup notes.
Deployment instructions (Caddy + Docker Compose) live in [`deploy/`](./deploy).

## Repository layout

```
web/      Svelte + Vite frontend  → builds to web/dist/
server/   Fastify API + SQLite
deploy/   Caddyfile, docker-compose, Dockerfiles
```

## License

[MIT](./LICENSE)
