# Deploying OpenAvail on a VPS or homelab server

This is a step-by-step guide to run OpenAvail on your own server and share it with friends over
the public internet. It targets a small Linux box (a cheap VPS, or a homelab machine / LXC
container) with Docker.

OpenAvail runs as **one container**: Node serves both the API and the built web app, storing data
in a single SQLite file on a Docker volume. You put a TLS reverse proxy (Caddy) in front so it's
reachable over HTTPS — which Google sign-in and the session cookie require.

```
Internet ──▶ Caddy (HTTPS, :443) ──▶ openavail container (:8787) ──▶ SQLite volume
```

---

## 0. What you need

- A server with Docker + Docker Compose (a VPS, or a homelab VM / Proxmox LXC).
- A **domain name** pointing at the server. Google OAuth will **not** accept a bare IP address,
  so a domain is required. A free option is [DuckDNS](https://www.duckdns.org)
  (e.g. `openavail.duckdns.org`).
- Ports **80** and **443** reachable from the internet (VPS: open the firewall; home: forward
  these ports on your router to the server).
- A Google account (becomes the admin).

---

## 1. Install Docker (if needed)

On Debian/Ubuntu:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in afterwards
```

Verify: `docker version` and `docker compose version`.

---

## 2. Point your domain at the server

**VPS:** create an `A` record for your domain → the server's public IP.

**Home/DuckDNS:**
1. Sign in at duckdns.org, create a subdomain (e.g. `openavail`), note your token.
2. Keep it updated with your home IP (cron every 5 min):
   ```bash
   */5 * * * * curl -fsS "https://www.duckdns.org/update?domains=openavail&token=YOUR_TOKEN&ip="
   ```
3. On your router, **port-forward** external `80` and `443` to the server's local IP.

Confirm `ping openavail.duckdns.org` resolves to your public IP.

---

## 3. Configure Google sign-in

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Configure the OAuth consent screen (External) if prompted.
3. Create **OAuth client ID → Web application**.
4. Under **Authorized JavaScript origins**, add your exact HTTPS origin:
   ```
   https://openavail.duckdns.org
   ```
   (Add `http://localhost:5173` too if you also develop locally.)
5. Copy the **Client ID** (public — no secret is used).

> The origin must match exactly (scheme + host, no path, no trailing slash). Changes can take a
> few minutes to propagate.

---

## 4. Get the code and configure `.env`

```bash
git clone https://github.com/<you>/OpenAvail.git
cd OpenAvail
cp .env.example .env
```

Edit `.env`:

```ini
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
ADMIN_EMAIL=you@gmail.com              # this Google account becomes admin
OWNER_NAME=Marcel                       # branding: "Marcel's OpenAvail"
PUBLIC_URL=https://openavail.duckdns.org  # used to build invite links
DB_PATH=/data/openavail.db              # inside the container volume
PORT=8787
NODE_ENV=production
```

`NODE_ENV=production` makes the session cookie `Secure`, so the app **must** be served over HTTPS
(step 6).

---

## 5. Start the app

```bash
cd deploy
docker compose up -d --build
```

This builds the image, runs the container, and stores the database in the `openavail-data` Docker
volume. It listens on host port **8088** (`docker compose ps` to check).

Quick local check on the box:

```bash
curl -s localhost:8088/api/health   # {"ok":true}
```

---

## 6. Put HTTPS in front with Caddy

Caddy fetches and renews Let's Encrypt certificates automatically. Create `deploy/Caddyfile`
(an example ships in the repo):

```caddy
openavail.duckdns.org {
    encode zstd gzip
    reverse_proxy openavail:8787
}
```

Run Caddy alongside the app. Add this service to `deploy/docker-compose.yml`:

```yaml
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      - openavail
```

and add the named volumes at the bottom:

```yaml
volumes:
  openavail-data:
  caddy-data:
  caddy-config:
```

Then, since Caddy reaches the app by service name, you can drop the app's host `ports:` mapping
(traffic flows Caddy → `openavail:8787` on the internal Docker network). Re-deploy:

```bash
docker compose up -d --build
```

Visit **https://openavail.duckdns.org** — you should see the locked landing page, and Google
sign-in should work (you become admin).

---

## 7. Invite your friends

Sign in as the admin → **Manage** → **Create invite link** (valid ~24h) → share it. Anyone who
opens it can sign in with Google and join. Revoke links or remove members from the same panel.

---

## 8. Updating

```bash
cd OpenAvail
git pull
cd deploy
docker compose up -d --build
```

The SQLite schema is additive (`CREATE TABLE IF NOT EXISTS`), so updates **preserve your data**.
The database lives in the `openavail-data` volume and survives rebuilds.

---

## 9. Backups

The whole dataset is one SQLite file inside the volume. Back it up on a schedule:

```bash
# copy the DB out of the volume to a dated file
docker run --rm -v openavail-data:/data -v "$PWD":/backup alpine \
  sh -c 'cp /data/openavail.db /backup/openavail-$(date +%F).db'
```

Restore by copying a backup file back into the volume and restarting the container.

---

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Error 400: origin_mismatch` on sign-in | The browser origin isn't in Google's **Authorized JavaScript origins**. Add the exact `https://…` origin; wait a few minutes; try incognito. |
| Sign-in seems to work but you're logged out immediately | You're on `http://` (not HTTPS). The `Secure` cookie needs TLS — finish step 6, and set `PUBLIC_URL` to the `https://` URL. |
| Can't reach the site from outside | Ports 80/443 not forwarded/opened, or DNS not pointing at your IP. |
| Invite links show the wrong host | `PUBLIC_URL` in `.env` is wrong; fix and `docker compose up -d`. |
| Container won't start | `docker compose logs openavail` — usually a missing `GOOGLE_CLIENT_ID`/`ADMIN_EMAIL`. |

---

## Notes for a single-container run without Docker

You can also run it directly with Node 24+:

```bash
npm install
npm run build
NODE_ENV=production STATIC_DIR=web/dist DB_PATH=./data/openavail.db \
  GOOGLE_CLIENT_ID=… ADMIN_EMAIL=… OWNER_NAME=… PUBLIC_URL=https://… \
  npm start
```

Then reverse-proxy HTTPS to `:8787` with Caddy/nginx as above.
