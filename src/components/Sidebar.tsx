"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Beranda", icon: "🏠" },
  { href: "/customers", label: "Pelanggan", icon: "👥" },
  { href: "/products", label: "Produk", icon: "📦" },
  { href: "/transactions", label: "Bon", icon: "🧾" },
  { href: "/piutang", label: "Piutang", icon: "💳" },
  { href: "/bonus", label: "Bonus", icon: "🎁" },
  { href: "/reports", label: "Rekap", icon: "📊" },
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
      <div className="flex items-center justify-between border-b-2 border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-xl font-extrabold text-brand-700">HL S&amp;R</span>
        <button
          className="btn-secondary"
          onClick={() => setOpen((o) => !o)}
          aria-label="Buka menu"
        >
          ☰ Menu
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } fixed inset-y-0 left-0 z-40 w-72 border-r-2 border-slate-200 bg-white lg:block`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b-2 border-slate-200 px-5 py-5">
            <div className="text-2xl font-extrabold text-brand-700">HL S&amp;R</div>
            <div className="text-base text-slate-500">Sales &amp; Receivables</div>
          </div>
          <nav className="flex-1 space-y-1.5 p-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-lg font-semibold transition-colors ${
                  isActive(item.href)
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-brand-50"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="border-t-2 border-slate-200 p-4">
            <div className="mb-3 px-1 text-base text-slate-600">
              Masuk sebagai{" "}
              <span className="font-bold text-slate-800">{username}</span>
            </div>
            <button onClick={logout} className="btn-secondary btn-block">
              🚪 Keluar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
