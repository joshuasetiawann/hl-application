"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Beranda", icon: "home" },
  { href: "/customers", label: "Pelanggan", icon: "users" },
  { href: "/products", label: "Produk", icon: "package" },
  { href: "/transactions", label: "Bon", icon: "receipt" },
  { href: "/piutang", label: "Piutang", icon: "wallet" },
  { href: "/bonus", label: "Bonus", icon: "gift" },
  { href: "/reports", label: "Rekap", icon: "chart" },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold tracking-tight text-white shadow-card">
        HL
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[0.95rem] font-bold text-slate-900">HL Sales</span>
          <span className="block text-[0.72rem] font-medium uppercase tracking-wide text-slate-400">
            &amp; Receivables
          </span>
        </span>
      )}
    </div>
  );
}

export default function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] font-medium transition-colors ${
              active
                ? "bg-brand-700 text-white shadow-card"
                : "text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900"
            }`}
          >
            <Icon
              name={item.icon}
              size={19}
              className={active ? "text-white" : "text-slate-400 group-hover:text-brand-600"}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-slate-200/80 p-3">
      <div className="mb-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon name="user" size={17} />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="text-[0.7rem] uppercase tracking-wide text-slate-400">Masuk sebagai</div>
          <div className="truncate text-[0.9rem] font-semibold text-slate-800">{username}</div>
        </div>
      </div>
      <button onClick={logout} className="btn-secondary btn-block btn-sm">
        <Icon name="logout" size={16} /> Keluar
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile / tablet top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          className="btn-secondary btn-sm"
          onClick={() => setOpen(true)}
          aria-label="Buka menu navigasi"
        >
          <Icon name="menu" size={18} /> Menu
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer / fixed sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 ease-out lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0 shadow-elevated" : "-translate-x-full lg:shadow-none"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4">
          <Brand />
          <button
            className="btn-ghost btn-sm -mr-2 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
