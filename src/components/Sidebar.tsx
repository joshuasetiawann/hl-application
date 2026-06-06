"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Pelanggan" },
  { href: "/products", label: "Produk" },
  { href: "/transactions", label: "Bon / Transaksi" },
  { href: "/reports", label: "Rekap / Laporan" },
  { href: "/bonus", label: "Log Bonus" },
];

export default function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="font-bold text-brand-700">HL S&amp;R</span>
        <button
          className="btn-secondary"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          Menu
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } fixed inset-y-0 left-0 z-30 w-60 border-r border-slate-200 bg-white lg:block`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="text-lg font-bold text-brand-700">HL S&amp;R</div>
            <div className="text-xs text-slate-500">Sales &amp; Receivables</div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive(item.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-3">
            <div className="mb-2 px-1 text-xs text-slate-500">
              Masuk sebagai <span className="font-medium">{username}</span>
            </div>
            <button onClick={logout} className="btn-secondary w-full">
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
