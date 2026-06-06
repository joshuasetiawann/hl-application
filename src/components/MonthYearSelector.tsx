"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MONTH_NAMES_ID } from "@/lib/format";

export default function MonthYearSelector({
  year,
  month,
  years,
  includeAllMonths = false,
}: {
  year: number;
  month: number; // 0 = all
  years: number[];
  includeAllMonths?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input w-auto"
        value={month}
        onChange={(e) => setParam("month", e.target.value)}
      >
        {includeAllMonths && <option value={0}>Semua Bulan</option>}
        {MONTH_NAMES_ID.map((m, i) => (
          <option key={i} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        className="input w-auto"
        value={year}
        onChange={(e) => setParam("year", e.target.value)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
