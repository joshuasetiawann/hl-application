"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function FilterSelect({
  paramKey,
  value,
  options,
  allLabel,
}: {
  paramKey: string;
  value: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(v: string) {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(paramKey, v);
    else next.delete(paramKey);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <select className="input w-auto" value={value} onChange={(e) => onChange(e.target.value)}>
      {allLabel && <option value="">{allLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
