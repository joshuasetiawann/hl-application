const puppeteer = require("puppeteer");
const fs = require("fs");

const BASE = "http://localhost:3000";
const OUT = "screenshots/hl-app";
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const shot = async (name) => {
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    console.log("shot:", name);
  };
  const goto = async (path) => {
    await page.goto(BASE + path, { waitUntil: "networkidle0", timeout: 30000 });
  };

  // 1) Login page
  await goto("/login");
  await shot("01-login");

  // Fill + submit login
  await page.type('#username', "admin");
  await page.type('#password', "admin123");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 1200));

  // 2) Dashboard
  await goto("/");
  await shot("02-beranda-dashboard");

  // 3) Pelanggan list
  await goto("/customers");
  await shot("03-pelanggan-list");

  // grab a customer id + a transaction id from API (reuse page cookies via fetch)
  const ids = await page.evaluate(async () => {
    const cs = await (await fetch("/api/customers")).json();
    const ts = await (await fetch("/api/transactions")).json();
    return { cid: cs[0] && cs[0].id, tid: ts[0] && ts[0].id };
  });

  // 4) Customer detail
  if (ids.cid) { await goto(`/customers/${ids.cid}`); await shot("04-pelanggan-detail"); }

  // 5) Tambah pelanggan (form with discount editor)
  await goto("/customers/new");
  await shot("05-pelanggan-baru");

  // 6) Produk list
  await goto("/products");
  await shot("06-produk-list");

  // 7) Tambah produk
  await goto("/products/new");
  await shot("07-produk-baru");

  // 8) Bon list
  await goto("/transactions");
  await shot("08-bon-list");

  // 9) Bon wizard (step 1)
  await goto("/transactions/new");
  await shot("09-bon-wizard-step1");

  // 10) Bon detail
  if (ids.tid) { await goto(`/transactions/${ids.tid}`); await shot("10-bon-detail"); }

  // 11) Piutang
  await goto("/piutang");
  await shot("11-piutang");

  // 12) Bonus
  await goto("/bonus");
  await shot("12-bonus");

  // 13) Rekap
  await goto("/reports");
  await shot("13-rekap-laporan");

  await browser.close();
  console.log("DONE");
}
main().catch((e) => { console.error(e); process.exit(1); });
