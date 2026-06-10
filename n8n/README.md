# n8n — self-hosted stack (n8n + PostgreSQL)

A portable [n8n](https://n8n.io) workflow-automation setup. Runs locally with one
command and deploys to any Docker host (a VPS, Render, Railway, Fly.io, …).

> **Not for Vercel.** n8n is a long-running, stateful server (it holds webhook
> endpoints, a queue, schedules and a database). Vercel is serverless/ephemeral,
> so n8n cannot run there. Use a host with a persistent process + disk.

## Quick start (local)

```bash
cd n8n
cp .env.example .env          # then edit .env (see below)
# generate the required secrets:
#   N8N_ENCRYPTION_KEY  ->  openssl rand -hex 32
#   POSTGRES_PASSWORD   ->  openssl rand -hex 16
docker compose up -d          # starts n8n + postgres
docker compose logs -f n8n    # watch the logs
```

Open <http://localhost:5678> and create the owner account on first run.
Data persists in the `n8n_data` / `n8n_db` Docker volumes across restarts/upgrades.

## Configuration (`.env`)

| Variable | What it does |
| --- | --- |
| `N8N_ENCRYPTION_KEY` | Encrypts saved credentials. **Must stay constant forever** or you lose access to them. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres connection (n8n stores workflows/executions here). |
| `N8N_HOST` / `N8N_PROTOCOL` / `WEBHOOK_URL` | Public addressing. Local: defaults. Production: your domain + `https`. |
| `N8N_SECURE_COOKIE` | `false` for local `http`; **`true`** in production over `https`. |
| `GENERIC_TIMEZONE` | Timezone for cron/schedule triggers (default `Asia/Jakarta`). |

## Production deploy (any Docker host)

1. Provision a host with Docker + Docker Compose and a persistent disk.
2. Copy this `n8n/` folder, create `.env`, and set for production:
   - `N8N_HOST=your-domain.com`, `N8N_PROTOCOL=https`,
     `WEBHOOK_URL=https://your-domain.com/`, `N8N_SECURE_COOKIE=true`
   - strong `N8N_ENCRYPTION_KEY` and `POSTGRES_PASSWORD`
3. Put a reverse proxy (Caddy/Nginx/Traefik) with TLS in front of port `5678`.
4. `docker compose up -d`.

> Render/Railway: point a Docker service at the `n8nio/n8n` image, add a managed
> Postgres, and set the same env vars. Keep a persistent volume for `/home/node/.n8n`.

## Useful commands

```bash
docker compose ps                 # status
docker compose logs -f n8n        # follow logs
docker compose pull && docker compose up -d   # update to the latest n8n
docker compose down               # stop (keeps data volumes)
docker compose down -v            # stop AND delete all data (destructive)
```
