# Local Run — Quick Start

Run the **HL Sales & Receivables** app on your own computer. Opens in a browser at
**http://localhost:3000**.

## The one-step way (recommended)

**Windows** — double-click (or run from a terminal):
```bat
run-windows.bat      :: start
stop-windows.bat     :: stop
```

**Linux / macOS** — first time, make scripts executable, then run:
```bash
chmod +x ops/linux/*.sh ops/doctor.sh run-linux.sh stop-linux.sh   # once
./run-linux.sh       # start
./stop-linux.sh      # stop
```

`run` does everything for you: checks Node/npm, creates `.env`, installs dependencies,
applies safe DB migrations, builds, starts the server, waits until it is ready, and writes
logs to `ops/logs/server.log`.

## Common tasks

| Task | Linux/macOS | Windows |
| --- | --- | --- |
| Start | `./run-linux.sh` | `run-windows.bat` |
| Stop | `./stop-linux.sh` | `stop-windows.bat` |
| Restart | `ops/linux/restart-server.sh` | `ops\windows\restart-server.bat` |
| Health check | `ops/linux/check-health.sh` | `ops\windows\check-health.bat` |
| Status | `ops/linux/show-status.sh` | `ops\windows\show-status.bat` |
| Change admin password | `ops/linux/edit-password.sh` | `ops\windows\edit-password.bat` |
| Diagnose problems | `ops/doctor.sh` | `ops\doctor.bat` |

## Login

Open http://localhost:3000 and sign in with the admin account from your `.env`
(`ADMIN_USERNAME`, default `admin`; password = `ADMIN_PASSWORD`). Change the password any
time with **edit-password** (above).

## Manual way (developers)

```bash
npm install
cp .env.example .env      # edit AUTH_SECRET and ADMIN_PASSWORD
npm run setup             # migrate + generate + seed
npm run dev               # or: npm run build && npm run start
```

Full operator guide: [`ops/README_RUN.md`](ops/README_RUN.md). Project overview:
[`README.md`](README.md). Troubleshooting (incl. **SIGBUS**): run `ops/doctor.sh`.
