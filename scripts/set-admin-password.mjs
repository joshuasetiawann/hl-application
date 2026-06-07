#!/usr/bin/env node
/**
 * Securely set / change the single admin account's password.
 *
 * Matches the app's auth implementation: the password is stored in the database
 * as a bcrypt hash on the `User` table (see src/lib/auth.ts). This script hashes
 * the new password and updates that row — it NEVER writes a plaintext password to
 * any file and NEVER prints the password back.
 *
 * Usage:
 *   - Interactive:  node scripts/set-admin-password.mjs
 *                   (prompts twice with hidden input)
 *   - Piped:        printf '%s' "newpass" | node scripts/set-admin-password.mjs
 *                   (the ops scripts use this with a hidden shell prompt)
 *
 * The admin username comes from ADMIN_USERNAME in .env (default "admin").
 */
import { loadDotEnv } from "./_env.mjs";
import readline from "node:readline";

const MIN_LEN = 6;

function fail(msg) {
  console.error(`\n[ERROR] ${msg}`);
  process.exit(1);
}

/** Hidden interactive prompt (no echo). */
function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (str) => {
      // Echo only the prompt text itself, mask everything the user types.
      if (str.includes(question)) rl.output.write(str);
      else rl.output.write("");
    };
    rl.question(question, (value) => {
      rl.output.write("\n");
      rl.close();
      resolve(value);
    });
  });
}

async function readPiped() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").split(/\r?\n/)[0];
}

async function main() {
  loadDotEnv();

  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set. Make sure a .env file exists at the project root.");
  }

  let password;
  if (process.stdin.isTTY) {
    const p1 = await promptHidden("Masukkan password admin baru: ");
    const p2 = await promptHidden("Ulangi password admin baru:  ");
    if (p1 !== p2) fail("Password tidak cocok. Tidak ada perubahan.");
    password = p1;
  } else {
    password = await readPiped();
  }

  password = (password ?? "").trim();
  if (password.length < MIN_LEN) {
    fail(`Password terlalu pendek (minimal ${MIN_LEN} karakter). Tidak ada perubahan.`);
  }

  // Import heavy deps only after validation so a bad input fails fast.
  const bcrypt = (await import("bcryptjs")).default;
  const { PrismaClient } = await import("@prisma/client");

  const username = process.env.ADMIN_USERNAME || "admin";
  const passwordHash = await bcrypt.hash(password, 10);

  const prisma = new PrismaClient();
  try {
    await prisma.user.upsert({
      where: { username },
      update: { passwordHash },
      create: { username, passwordHash },
    });
    // Single-user app: ensure no other accounts linger.
    await prisma.user.deleteMany({ where: { username: { not: username } } });
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n[OK] Password untuk akun "${username}" berhasil diperbarui.`);
  console.log("     Tidak perlu restart server — perubahan langsung berlaku saat login berikutnya.");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
