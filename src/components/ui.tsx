import { ReactNode } from "react";
import { TransactionStatus } from "@/lib/calc";
import { Icon, type IconName } from "@/components/icons";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

/** Page title block with optional subtitle and right-aligned actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.7rem]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[0.95rem] text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Accent = "slate" | "green" | "blue" | "red" | "amber" | "gold";

const ACCENTS: Record<Accent, { value: string; chip: string; bar: string }> = {
  slate: { value: "text-slate-900", chip: "bg-slate-100 text-slate-500", bar: "bg-slate-300" },
  green: { value: "text-emerald-700", chip: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-400" },
  blue: { value: "text-brand-700", chip: "bg-brand-50 text-brand-600", bar: "bg-brand-400" },
  red: { value: "text-rose-700", chip: "bg-rose-50 text-rose-600", bar: "bg-rose-400" },
  amber: { value: "text-amber-700", chip: "bg-amber-50 text-amber-600", bar: "bg-amber-400" },
  gold: { value: "text-gold-700", chip: "bg-gold-50 text-gold-600", bar: "bg-gold-400" },
};

/** Executive KPI card: muted label, large tabular figure, optional refined icon. */
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
  accent?: Accent;
  icon?: IconName;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="card relative overflow-hidden p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${a.bar}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="text-[0.78rem] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </div>
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.chip}`}>
            <Icon name={icon} size={17} />
          </span>
        )}
      </div>
      <div className={`mt-2 text-[1.65rem] font-bold tracking-tight tnum ${a.value}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[0.82rem] text-slate-400">{hint}</div>}
    </div>
  );
}

export function StatusBadge({
  status,
  isBonus,
}: {
  status?: TransactionStatus | string;
  isBonus?: boolean;
}) {
  if (isBonus) {
    return (
      <span className="badge-bonus">
        <Icon name="gift" size={13} strokeWidth={2} /> Bonus
      </span>
    );
  }
  if (status === "LUNAS") {
    return (
      <span className="badge-lunas">
        <span className="badge-dot bg-emerald-500" /> Lunas
      </span>
    );
  }
  return (
    <span className="badge-piutang">
      <span className="badge-dot bg-amber-500" /> Piutang
    </span>
  );
}

export function TypeBadge({ tipe }: { tipe: string }) {
  return <span className={tipe === "LM" ? "badge-lm" : "badge-br"}>{tipe}</span>;
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[0.9rem] font-medium text-rose-700 ring-1 ring-inset ring-rose-100">
      <Icon name="alert" size={16} className="mt-0.5 shrink-0" /> <span>{children}</span>
    </p>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon = "inbox",
}: {
  title?: string;
  message: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name={icon} size={26} />
      </span>
      {title && <div className="text-lg font-semibold text-slate-700">{title}</div>}
      <div className="max-w-sm text-[0.95rem] text-slate-500">{message}</div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
