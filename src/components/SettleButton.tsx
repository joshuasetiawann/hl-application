"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client";
import { toDateInputValue } from "@/lib/format";

/**
 * Settlement button + payment-date modal. Works for both:
 *  - single bon: pass url=/api/transactions/{id}/settle
 *  - whole month: pass url=/api/settlements/month with extra body
 */
export default function SettleButton({
  url,
  label = "Lunas",
  extraBody,
  successMessage,
  variant = "success",
}: {
  url: string;
  label?: string;
  extraBody?: Record<string, unknown>;
  successMessage?: string;
  variant?: "success" | "primary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    if (!date) {
      setError("Tanggal pelunasan wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const res = await apiSend<{ count?: number }>(url, "POST", {
        paymentDate: date,
        ...extraBody,
      });
      setOpen(false);
      if (successMessage) {
        const cnt = typeof res.count === "number" ? ` (${res.count} bon)` : "";
        alert(successMessage + cnt);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal melakukan pelunasan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className={variant === "primary" ? "btn-primary" : "btn-success"}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6">
            <h3 className="mb-4 text-lg font-semibold">Konfirmasi Pelunasan</h3>
            <label className="label">Tanggal Pelunasan</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setOpen(false)} disabled={loading}>
                Batal
              </button>
              <button className="btn-success" onClick={confirm} disabled={loading}>
                {loading ? "Memproses..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
