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
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "slate" | "green" | "blue" | "red" | "amber";
}) {
  const accents: Record<string, string> = {
    slate: "text-slate-900",
    green: "text-emerald-600",
    blue: "text-brand-600",
    red: "text-red-600",
    amber: "text-amber-600",
  };
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${accents[accent]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
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
    return (
      <span className="badge bg-purple-100 text-purple-700">Bonus</span>
    );
  }
  if (status === "LUNAS") {
    return (
      <span className="badge bg-emerald-100 text-emerald-700">Lunas</span>
    );
  }
  return <span className="badge bg-amber-100 text-amber-700">Piutang</span>;
}

export function TypeBadge({ tipe }: { tipe: string }) {
  return (
    <span
      className={`badge ${
        tipe === "LM"
          ? "bg-blue-100 text-blue-700"
          : "bg-teal-100 text-teal-700"
      }`}
    >
      {tipe}
    </span>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-red-600">{children}</p>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-8 text-center text-sm text-slate-400">{message}</div>
  );
}
