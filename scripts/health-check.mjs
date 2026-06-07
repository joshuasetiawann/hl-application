#!/usr/bin/env node
/**
 * Pings the running server's /api/health endpoint and prints a clear verdict.
 * Exit code: 0 = OK, 1 = ERROR (not reachable), 2 = WARNING (reachable but degraded).
 */
import { loadDotEnv } from "./_env.mjs";

loadDotEnv();

const port = process.env.PORT || "3000";
const base = process.env.APP_URL || `http://localhost:${port}`;
const url = `${base}/api/health`;

async function main() {
  let res;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
  } catch (e) {
    console.log(`[ERROR] Server tidak merespons di ${base}`);
    console.log(`        ${e instanceof Error ? e.message : e}`);
    console.log(`        Jalankan server dulu (run-server), lalu coba lagi.`);
    process.exit(1);
  }

  let body = {};
  try {
    body = await res.json();
  } catch {
    /* ignore non-JSON */
  }

  if (res.ok && body.status === "ok") {
    console.log(`[OK] Server sehat di ${base}`);
    console.log(`     Database: ${body.db} · respons: ${body.responseMs}ms · uptime: ${body.uptimeSeconds}s`);
    process.exit(0);
  }

  console.log(`[WARNING] Server hidup tapi tidak sepenuhnya sehat (HTTP ${res.status}).`);
  if (body.db) console.log(`          Database: ${body.db}`);
  if (body.dbError) console.log(`          Detail: ${body.dbError}`);
  process.exit(2);
}

main();
