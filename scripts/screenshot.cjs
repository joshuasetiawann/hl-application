/**
 * Capture premium-UI screenshots (desktop + mobile) of the running app.
 *
 * Prereqs:
 *   1. The server must be running:  ./run-linux.sh   (or run-windows.bat)
 *   2. A browser must be available to Puppeteer. Because the bundled-browser
 *      download is skipped by default (.puppeteerrc.cjs), either:
 *        a) point at a system Chrome/Chromium:
 *             PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome npm run screenshots
 *        b) or install Puppeteer's browser once:
 *             npx puppeteer browsers install chrome
 *
 * Output: screenshots/premium-ui/*.png
 */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const BASE = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
const OUT = "screenshots/premium-ui";
fs.mkdirSync(OUT, { recursive: true });

// Read admin credentials from .env (fallback to the seed defaults).
function readEnv() {
  const env = { ADMIN_USERNAME: "admin", ADMIN_PASSWORD: "change-me-strong-password" };
  try {
    const text = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim().replace(/^["']|["']$/g, "");
      if (m[1] in env) env[m[1]] = v;
    }
  } catch {
    /* use defaults */
  }
  return env;
}

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

async function main() {
  const creds = readEnv();
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport(DESKTOP);

  const shot = async (name) => {
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    console.log("shot:", name);
  };
  const goto = async (p) => page.goto(BASE + p, { waitUntil: "networkidle0", timeout: 30000 });

  // 1) Login (desktop) + login (mobile)
  await goto("/login");
  await shot("01-login-desktop");
  await page.setViewport(MOBILE);
  await goto("/login");
  await shot("02-login-mobile");
  await page.setViewport(DESKTOP);

  // Authenticate
  await goto("/login");
  await page.type("#username", creds.ADMIN_USERNAME);
  await page.type("#password", creds.ADMIN_PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 1200));

  // 2) Dashboard desktop
  await goto("/");
  await shot("03-dashboard-desktop");

  // 3) Dashboard mobile (responsive)
  await page.setViewport(MOBILE);
  await goto("/");
  await shot("04-dashboard-mobile");
  await page.setViewport(DESKTOP);

  // Grab ids for detail pages
  const ids = await page.evaluate(async () => {
    const cs = await (await fetch("/api/customers")).json();
    const ts = await (await fetch("/api/transactions")).json();
    return { cid: cs[0] && cs[0].id, tid: ts[0] && ts[0].id };
  });

  // 4) Bon list
  await goto("/transactions");
  await shot("05-bon-list-desktop");

  // 5) Buat Bon Baru (wizard)
  await goto("/transactions/new");
  await shot("06-buat-bon-baru-desktop");

  // 6) Customer detail
  if (ids.cid) {
    await goto(`/customers/${ids.cid}`);
    await shot("07-customer-detail-desktop");
  }

  // 7) Rekap / Laporan
  await goto("/reports");
  await shot("08-rekap-laporan-desktop");

  // Bonus: a few more useful views
  await goto("/customers");
  await shot("09-pelanggan-list-desktop");
  await goto("/piutang");
  await shot("10-piutang-desktop");
  if (ids.tid) {
    await goto(`/transactions/${ids.tid}`);
    await shot("11-bon-detail-desktop");
  }
  await goto("/bonus");
  await shot("12-bonus-desktop");

  await browser.close();
  console.log(`DONE → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
