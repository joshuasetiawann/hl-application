import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Icon } from "@/components/icons";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

const HIGHLIGHTS = [
  { icon: "receipt" as const, text: "Bon, Piutang, dan Pelunasan dalam satu tempat" },
  { icon: "chart" as const, text: "Rekap Omzet & Laba HL berbasis kas" },
  { icon: "shield" as const, text: "Akses pribadi, aman, dan terkunci" },
];

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / value panel (desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(600px 300px at 80% 0%, rgba(189,139,45,0.25), transparent 60%), radial-gradient(700px 400px at 0% 100%, rgba(255,255,255,0.10), transparent 55%)",
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-base font-bold ring-1 ring-white/20">
            HL
          </span>
          <span className="text-[0.78rem] font-medium uppercase tracking-[0.2em] text-white/70">
            Sales &amp; Receivables
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Kelola penjualan &amp; piutang HL dengan tenang dan rapi.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-white/85">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon name={h.icon} size={18} />
                </span>
                <span className="text-[0.95rem]">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[0.8rem] text-white/50">
          Aplikasi internal • Rupiah (IDR) • Tanpa PPN
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-[var(--app-bg)] p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-lg font-bold text-white shadow-card">
              HL
            </div>
          </div>
          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Masuk ke akun Anda</h1>
            <p className="mt-1.5 text-[0.95rem] text-slate-500">
              HL Sales &amp; Receivables — sistem manajemen penjualan &amp; piutang.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
