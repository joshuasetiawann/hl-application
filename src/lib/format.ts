/** Formatting helpers — IDR / Rupiah only. No tax/PPN. */

/** Format a number as IDR currency, e.g. 1500000 -> "Rp 1.500.000". */
export function formatIDR(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Plain number formatting with Indonesian thousands separators. */
export function formatNumber(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
}

/** Format a date as dd MMM yyyy (Indonesian). */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Format a Date as yyyy-MM-dd for <input type="date">. */
export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function monthLabel(month: number): string {
  return MONTH_NAMES_ID[month - 1] ?? String(month);
}

/** Render a discount set as "20% → 20% → 10%". */
export function formatDiscountSteps(steps: number[]): string {
  if (!steps || steps.length === 0) return "—";
  return steps.map((s) => `${s}%`).join(" → ");
}
