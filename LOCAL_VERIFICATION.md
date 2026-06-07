# Local Verification

Verification of the premium UI/UX upgrade, runtime hardening, and the `ops/` tooling.

- **Local URL:** http://localhost:3000
- **Health endpoint:** http://localhost:3000/api/health → `{"status":"ok","db":"ok",...}`
- **Environment used for verification:** Linux, Node v22.22.2, npm 10.9.7, filesystem ext4.

---

## 1. What was changed

### UI/UX (premium redesign)
- New design system: refined navy **`brand`** palette + restrained **`gold`** accent
  (`tailwind.config.ts`), premium tokens for buttons/inputs/cards/tables/badges and a warm
  neutral canvas, tabular figures (`src/app/globals.css`).
- Removed **all emoji** across the app; added a dependency-free line-icon set
  (`src/components/icons.tsx`).
- Executive `StatCard`, calm dot-style status badges, refined empty/error states, new
  `PageHeader` (`src/components/ui.tsx`).
- Premium **responsive sidebar** with off-canvas drawer + backdrop on mobile/tablet, fixed
  on desktop (`src/components/Sidebar.tsx`).
- **Login** redesigned (split brand panel, refined form) and **all demo credential hints
  removed** (`src/app/login/page.tsx`, `src/app/login/LoginForm.tsx`).
- Executive **dashboard**, plus polished list/detail/forms (Bon wizard, Pelanggan, Produk,
  Piutang, Bonus, Rekap), and refined Modal/Toast/PDF/Settle/Delete/Search components.
- Responsive throughout: KPI grids 4→2→1, tables horizontally safe with min-widths, forms
  stack on mobile, larger tap targets.

### Runtime stability (SIGBUS / reliability)
- **Diagnosed SIGBUS** as a non-native-filesystem issue (project on NTFS/exFAT/network
  drive). `ops/doctor.sh` now detects the filesystem type and warns.
- `.puppeteerrc.cjs` → skips the ~150 MB Chromium download on `npm install` (Puppeteer is
  only used by the optional screenshots script) → fast, reliable installs.
- `engines` (Node `>=18.18 <23`) in `package.json` + `.nvmrc` (`20`).
- **Health endpoint** `GET /api/health` (DB-aware), public in middleware.
- Clear env error messages enforced in `src/lib/auth.ts` (AUTH_SECRET length).

### One-folder operations tooling (`ops/`)
- Windows `.bat` + Linux/macOS `.sh` scripts for run/stop/restart/check-health/show-status/
  edit-password, plus `doctor`, logs, runtime/PID, and an `.env` template. Root launchers
  `run-linux.sh` / `stop-linux.sh` / `run-windows.bat` / `stop-windows.bat`.
- Secure password change: `scripts/set-admin-password.mjs` (hidden input → bcrypt hash →
  DB; never logs plaintext).

> No user data, DB files, `.env`, or migrations were deleted. No secrets committed.

---

## 2. Commands run & results

| Command | Result |
| --- | --- |
| `npm run lint` | ✅ PASS — “No ESLint warnings or errors” |
| `npm run build` | ✅ PASS — production build, 32 routes incl. `/api/health` |
| `npm test` (vitest) | ✅ PASS — **38/38 tests** (2 files) |
| `./run-linux.sh` | ✅ PASS — server up, PID stored, health reached |
| `ops/linux/check-health.sh` | ✅ PASS — “Status keseluruhan: OK” |
| `ops/linux/show-status.sh` | ✅ PASS — running; env/build/node OK |
| `curl /api/health` | ✅ PASS — `{"status":"ok","db":"ok"}` |
| `POST /api/auth/login` (admin) | ✅ PASS — HTTP 200, `hl_session` cookie set |
| `ops/linux/stop-server.sh` | ✅ PASS — stopped, port freed |
| `ops/linux/restart-server.sh` | ✅ PASS — stop + start, health OK (new PID) |
| `ops/doctor.sh` | ✅ PASS — ext4 detected (no SIGBUS risk); flags example AUTH_SECRET |
| `npm run set-password` (piped) | ✅ PASS — updated, then restored to seed default |
| `npm run screenshots` | ⚠️ Not run here — browser download blocked by sandbox network policy (see Known issues). Script is ready; run locally. |

Typecheck is covered by `npm run build` (Next.js runs TypeScript + ESLint during build).

---

## 3. Login credentials

- The single admin account is seeded from **`.env`**: `ADMIN_USERNAME` (default `admin`)
  and `ADMIN_PASSWORD`.
- `.env.example` ships a **placeholder** password (`change-me-strong-password`) — not a real
  secret. Set a real one before first run, or change it any time with **edit-password**.
- The **login page shows no credential hints** (requirement met).

---

## 4. Scripts created (in `ops/`)

```
ops/README_RUN.md
ops/doctor.sh            ops/doctor.bat
ops/logs/.gitkeep        ops/runtime/.gitkeep
ops/templates/.env.example.copy
ops/linux/_lib.sh
ops/linux/run-server.sh      ops/windows/run-server.bat
ops/linux/stop-server.sh     ops/windows/stop-server.bat
ops/linux/restart-server.sh  ops/windows/restart-server.bat
ops/linux/check-health.sh    ops/windows/check-health.bat
ops/linux/show-status.sh     ops/windows/show-status.bat
ops/linux/edit-password.sh   ops/windows/edit-password.bat
```
Root launchers: `run-linux.sh`, `stop-linux.sh`, `run-windows.bat`, `stop-windows.bat`.
Helper scripts: `scripts/set-admin-password.mjs`, `scripts/health-check.mjs`,
`scripts/_env.mjs`, `scripts/screenshot.cjs`.

---

## 5. Screenshots

- Output folder: **`screenshots/premium-ui/`** (see its `README.md` for the full list).
- Generate locally:
  ```bash
  ./run-linux.sh
  PUPPETEER_EXECUTABLE_PATH="$(command -v google-chrome || command -v chromium)" npm run screenshots
  # or: npx puppeteer browsers install chrome && npm run screenshots
  ```
- Intended captures: login (desktop + mobile), dashboard (desktop + mobile), Bon list,
  Buat Bon Baru, customer detail, Rekap/Laporan, Pelanggan, Piutang, Bon detail, Bonus.

---

## 6. Known issues / notes

- **Screenshots not auto-generated in the cloud environment**: the browser download host is
  blocked by the sandbox network policy (`host_not_allowed`) and no system Chrome is present.
  The capture script is wired and verified; run it locally (above).
- **`AUTH_SECRET`**: `.env.example` ships an example value; `doctor` warns until you replace
  it with a long random string (e.g. `openssl rand -hex 32`). The app refuses to sign
  sessions with a too-short secret.
- **Windows scripts** are syntactically valid and authored to mirror the verified Linux
  behavior, but were not executed on this Linux verification host.
- **Production vs dev**: `run-server` defaults to a production build/start for stability. Use
  `DEV=1 ./run-linux.sh` for the dev server, or `REBUILD=1` to force a fresh build.

---

## 7. How to run / stop / change password again

```bash
# Run
./run-linux.sh                 # Windows: run-windows.bat
# Stop
./stop-linux.sh                # Windows: stop-windows.bat
# Restart
ops/linux/restart-server.sh    # Windows: ops\windows\restart-server.bat
# Health
ops/linux/check-health.sh      # or: npm run health
# Change admin password (hidden input, bcrypt, no restart needed)
ops/linux/edit-password.sh     # Windows: ops\windows\edit-password.bat
```
