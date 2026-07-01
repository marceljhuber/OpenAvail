<div align="center">

# OpenAvail

**Self-hostable group availability planner.**
Vote `yes` / `maybe` / `no` on any day, then find when everyone can actually meet.

</div>

---

OpenAvail is a small, privacy-friendly alternative to Doodle/WhenAvailable that you run
yourself. One deployment is **one shared availability board** owned by you (the admin). Friends
join through a time-limited invite link, sign in with Google, and vote on an infinite calendar.

- 🔒 **Private by default** — logged-out visitors only see a branded landing page.
- 🎟️ **Invite links** — the admin shares a link that works for ~24h; anyone with it can join.
- ✅ **Server-verified Google login** — ID tokens are verified server-side and the acting user is
  always derived from a session cookie, never from the request body.
- 🗓️ **Infinite month calendar** + **horizontal people × days timeline**, both windowed for speed.
- 🔎 **Filter & sort by member** — e.g. *"only days where Rainer voted yes, ranked by most yes"*.
- 🗳️ **Votings** — multiple-choice polls (e.g. "25.07. Day?" → Pokémon Day / One Piece Day / …)
  whose results stay **hidden until you vote**, then reveal and stay editable. Run several at once.
- 💬 **Per-day comments** — leave notes on any day ("can't do mornings").
- ⚡ **Live updates** — votes, polls and comments appear instantly via Server-Sent Events.
- 🌙 **Dark mode** — follows your OS preference, toggle to override.
- 🪶 **Cheap to host** — Node + SQLite (single file), one small container.

## Tech stack

| Part     | Stack                                            |
| -------- | ------------------------------------------------ |
| Frontend | Svelte 5 + Vite + TypeScript (static `dist/`)    |
| Backend  | Node + Fastify + TypeScript                      |
| Storage  | SQLite (built-in `node:sqlite`, no native build) |
| Auth     | Google Identity Services + server-side verify    |
| Deploy   | Single container; optional Caddy for TLS         |

Requires **Node 24+** (for the built-in `node:sqlite` module).

## 1. Configure Google sign-in

1. Open the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** → **Web application**.
3. Under **Authorized JavaScript origins**, add the origin(s) you'll use, e.g.
   `http://localhost:5173` for local dev and `https://avail.example.com` for production.
4. Copy the **Client ID** (it's public — no client secret is used).

## 2. Set up `.env`

```bash
cp .env.example .env
```

| Variable           | Purpose                                                            |
| ------------------ | ----------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID` | Your OAuth Web client ID                                          |
| `ADMIN_EMAIL`      | The Google account that becomes admin on first sign-in            |
| `OWNER_NAME`       | Landing-page branding → "`<OWNER_NAME>`'s OpenAvail"              |
| `PUBLIC_URL`       | Public base URL, used to build invite links                       |
| `DB_PATH`          | SQLite file path (directory auto-created)                         |
| `PORT`             | API/server port (default `8787`)                                  |
| `NODE_ENV`         | `development` or `production`                                      |

## 3. Run locally

```bash
npm install
npm run dev      # API on :8787, Vite web on :5173 (proxies /api)
```

Open <http://localhost:5173> and sign in with your `ADMIN_EMAIL` Google account.

> **Testing without Google:** set `DEV_LOGIN=true` (ignored when `NODE_ENV=production`) to get a
> name-only dev login on the landing page. Handy for trying it out before configuring OAuth.

## 4. Deploy (single container)

> 📖 **Full walkthrough:** [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) covers a complete
> VPS/homelab setup — domain/DuckDNS, Docker, Google OAuth origins, Caddy HTTPS, updates and
> backups. The summary below is the short version.

The Node server can serve both the API and the built SPA, so production is one container.

```bash
cd deploy
docker compose up -d --build
```

This builds the app, serves it on host port `8088`, and stores the SQLite DB in the
`openavail-data` volume. Configuration comes from the repo-root `.env`.

> **HTTPS is required in production.** The session cookie is marked `Secure` when
> `NODE_ENV=production`, so reach the app over TLS. Put a reverse proxy in front —
> [`deploy/Caddyfile`](./deploy/Caddyfile) is a ready example that terminates TLS and proxies to
> the container. Set `PUBLIC_URL` to your `https://…` address so invite links are correct.

To update a running deployment, rebuild and restart:

```bash
cd deploy && docker compose up -d --build
```

## 5. Invite your friends

Sign in as the admin → **Manage** → **Create invite link**. The link is copied to your clipboard
and is valid for ~24 hours; share it in your group chat. Anyone who opens it can sign in with
Google and join. Revoke links or remove members from the same panel.

## Using the app

- **Calendar** — infinite month-by-month scroll; click Yes/Maybe/No on any day. Stronger green =
  more "yes". A focus filter highlights matching days.
- **Timeline** — every member as a row, days as columns over your chosen range; the focus filter
  hides non-matching days so you can isolate, say, days a key person can attend.
- **Range** — set the analysis window (e.g. 1 Jul – 1 Sep) for the timeline, stats and sorting.
- **Focus + sort** — pick members and a required vote ("only days where Rainer voted yes"), then
  sort by most yes / responses / maybe, or "Most yes (focus)".
- **Votings** — the third tab. Create a multiple-choice poll (title + editable options) and start
  it; everyone votes blind, and results reveal only once each person has voted. Selections stay
  editable, and you can run several polls at once. Creators and admins can delete a poll.

## Development

```bash
npm run dev      # run web + server together
npm run build    # type-check + build both
npm test         # server (vitest) + web (vitest) unit tests
npm run check --workspace web   # svelte-check
```

```
web/      Svelte + Vite frontend  → builds to web/dist/
server/   Fastify API + SQLite     → builds to server/dist/
deploy/   Dockerfile, docker-compose, Caddyfile
```

## Notes

- **Dates & timezone:** a day is a whole-day calendar date (`YYYY-MM-DD`), with no time
  component, which suits a single-timezone group (built for **Europe/Vienna**). There are no
  timezone conversions — everyone sees the same day.

## Security notes

- Google ID tokens are verified server-side (`google-auth-library`, audience-checked).
- Sessions are random opaque tokens stored in SQLite, sent as an httpOnly cookie; the server
  resolves the acting user from the cookie only.
- Write access requires a session; an unknown Google account needs a valid invite or it is
  rejected with `403`.

## License

[MIT](./LICENSE)
