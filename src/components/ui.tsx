"use client";

import { ReactNode } from "react";
import { TransactionStatus } from "@/lib/calc";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  accent = "slate",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "slate" | "green" | "blue" | "red" | "amber" | "purple";
  icon?: ReactNode;
}) {
  const accents: Record<string, { value: string; chip: string }> = {
    slate: { value: "text-slate-900", chip: "bg-slate-100 text-slate-700" },
    green: { value: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700" },
    blue: { value: "text-brand-700", chip: "bg-brand-100 text-brand-700" },
    red: { value: "text-red-700", chip: "bg-red-100 text-red-700" },
    amber: { value: "text-amber-700", chip: "bg-amber-100 text-amber-700" },
    purple: { value: "text-purple-700", chip: "bg-purple-100 text-purple-700" },
  };
  const a = accents[accent];
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-xl ${a.chip}`}>
            {icon}
          </span>
        )}
        <div className="text-base font-semibold text-slate-600">{label}</div>
      </div>
      <div className={`mt-2 text-3xl font-extrabold tracking-tight ${a.value}`}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-base text-slate-500">{hint}</div>}
    </div>
  );
}

export function StatusBadge({
  status,
  isBonus,
}: {
  status: TransactionStatus | string;
  isBonus?: boolean;
}) {
  if (isBonus) {
    return <span className="badge-bonus">🎁 Bonus</span>;
  }
  if (status === "LUNAS") {
    return <span className="badge-lunas">✓ Lunas</span>;
  }
  return <span className="badge-piutang">● Piutang</span>;
}

export function TypeBadge({ tipe }: { tipe: string }) {
  return (
    <span
      className={`badge ${
        tipe === "LM"
          ? "bg-blue-100 text-blue-800 ring-1 ring-blue-300"
          : "bg-teal-100 text-teal-800 ring-1 ring-teal-300"
      }`}
    >
      {tipe}
    </span>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 rounded-lg bg-red-50 px-3 py-2 text-base font-medium text-red-700">
      {children}
    </p>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="text-5xl">📭</div>
      {title && <div className="text-xl font-bold text-slate-700">{title}</div>}
      <div className="max-w-md text-lg text-slate-500">{message}</div>
      {action}
    </div>
  );
}
