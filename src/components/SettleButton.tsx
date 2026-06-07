"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client";
import { toDateInputValue } from "@/lib/format";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/icons";

/**
 * Settlement button + payment-date modal. Works for both:
 *  - single bon: pass url=/api/transactions/{id}/settle
 *  - whole month: pass url=/api/settlements/month with extra body
 */
export default function SettleButton({
  url,
  label = "Tandai Lunas",
  title = "Tandai Bon Sudah Lunas",
  description,
  confirmLabel = "Simpan sebagai Lunas",
  extraBody,
  successMessage = "Berhasil ditandai Lunas",
  variant = "success",
  size = "",
}: {
  url: string;
  label?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  extraBody?: Record<string, unknown>;
  successMessage?: string;
  variant?: "success" | "primary";
  size?: string;
}) {
  const router = useRouter();
  const toast = useToast();
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
      const cnt = typeof res.count === "number" ? ` (${res.count} bon)` : "";
      toast.show(successMessage + cnt, "success");
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
        className={`${variant === "primary" ? "btn-primary" : "btn-success"} ${size}`}
        onClick={() => setOpen(true)}
      >
        <Icon name="check" size={17} /> {label}
      </button>

      <Modal open={open} onClose={() => !loading && setOpen(false)} title={title}>
        {description && <p className="mb-4 text-[0.95rem] leading-relaxed text-slate-600">{description}</p>}
        <label className="label">Tanggal Pelunasan</label>
        <input
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {error && (
          <p className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[0.9rem] font-medium text-rose-700">
            <Icon name="alert" size={16} /> {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-secondary" onClick={() => setOpen(false)} disabled={loading}>
            Batal
          </button>
          <button className="btn-success" onClick={confirm} disabled={loading}>
            {loading ? "Memproses…" : confirmLabel}
          </button>
        </div>
      </Modal>
    </>
  );
}
