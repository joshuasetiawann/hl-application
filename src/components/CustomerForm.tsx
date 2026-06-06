"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiSend } from "@/lib/client";
import { applyCascadingDiscount } from "@/lib/calc";
import { formatIDR } from "@/lib/format";

export interface CustomerFormData {
  id?: string;
  nama: string;
  lmDiscounts: number[];
  brDiscounts: number[];
  bonusThreshold: number;
}

function DiscountEditor({
  title,
  color,
  steps,
  setSteps,
}: {
  title: string;
  color: "blue" | "teal";
  steps: number[];
  setSteps: (s: number[]) => void;
}) {
  const colors =
    color === "blue"
      ? "border-blue-200 bg-blue-50/40"
      : "border-teal-200 bg-teal-50/40";

  function add() {
    setSteps([...steps, 10]);
  }
  function update(i: number, value: string) {
    const v = Number(value);
    const next = [...steps];
    next[i] = isNaN(v) ? 0 : v;
    setSteps(next);
  }
  function remove(i: number) {
    setSteps(steps.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  }

  const invalid = steps.some((s) => s < 0 || s > 100);
  const previewPrice = applyCascadingDiscount(100000, steps).toNumber();

  return (
    <div className={`rounded-2xl border-2 ${colors} p-5`}>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="help">Diskon dihitung bertahap, bukan dijumlahkan.</p>

      {/* Pills preview */}
      {steps.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {steps.map((s, i) => (
            <span key={i} className="flex items-center">
              <span className="rounded-full bg-white px-3 py-1.5 text-lg font-bold text-slate-800 ring-2 ring-slate-200">
                {s}%
              </span>
              {i < steps.length - 1 && <span className="mx-1 text-xl text-slate-400">→</span>}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-7 text-center text-lg font-bold text-slate-400">{i + 1}.</span>
            <input
              type="number"
              min={0}
              max={100}
              step="any"
              className="input w-28"
              value={s}
              onChange={(e) => update(i, e.target.value)}
              aria-label={`${title} langkah ${i + 1}`}
            />
            <span className="text-lg font-semibold text-slate-500">%</span>
            <button type="button" className="btn-secondary" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Naik">↑</button>
            <button type="button" className="btn-secondary" onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Turun">↓</button>
            <button type="button" className="btn-danger" onClick={() => remove(i)} aria-label="Hapus langkah">🗑</button>
          </div>
        ))}
        {steps.length === 0 && <p className="text-lg text-slate-400">Belum ada diskon.</p>}
      </div>

      <button type="button" className="btn-secondary mt-4" onClick={add}>
        + Tambah Diskon {title.includes("LM") ? "LM" : "BR"}
      </button>

      {invalid ? (
        <p className="mt-3 text-base font-semibold text-red-600">Diskon harus antara 0 sampai 100.</p>
      ) : (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-base text-slate-700 ring-1 ring-slate-200">
          Harga contoh <b>Rp 100.000</b> menjadi <b className="text-brand-700">{formatIDR(previewPrice)}</b>
        </p>
      )}
    </div>
  );
}

export default function CustomerForm({ initial }: { initial?: CustomerFormData }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!initial?.id;
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [lm, setLm] = useState<number[]>(initial?.lmDiscounts ?? []);
  const [br, setBr] = useState<number[]>(initial?.brDiscounts ?? []);
  const [threshold, setThreshold] = useState<string>(
    initial?.bonusThreshold ? String(initial.bonusThreshold) : "0"
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nama.trim()) return setError("Nama wajib diisi");
    if ([...lm, ...br].some((s) => s < 0 || s > 100))
      return setError("Diskon harus antara 0 sampai 100");
    const th = Number(threshold);
    if (isNaN(th) || th < 0) return setError("Batas bonus harus berupa angka Rupiah");

    const body = { nama: nama.trim(), lmDiscounts: lm, brDiscounts: br, bonusThreshold: th || 0 };
    setLoading(true);
    try {
      if (isEdit) await apiSend(`/api/customers/${initial!.id}`, "PUT", body);
      else await apiSend("/api/customers", "POST", body);
      toast.show(isEdit ? "Pelanggan diperbarui" : "Pelanggan ditambahkan", "success");
      router.push("/customers");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan";
      setError(msg);
      toast.show(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="max-w-lg">
          <label className="label">Nama Pelanggan *</label>
          <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Toko Sinar Jaya" required />
        </div>

        <div className="max-w-lg">
          <label className="label">Batas Bonus (Rupiah)</label>
          <input
            type="number"
            min={0}
            step="any"
            className="input"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
          <p className="help">Setiap kelipatan ini dari omzet Lunas memberi 1 bonus. Isi 0 untuk menonaktifkan.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <DiscountEditor title="Diskon LM" color="blue" steps={lm} setSteps={setLm} />
          <DiscountEditor title="Diskon BR" color="teal" steps={br} setSteps={setBr} />
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary btn-lg" disabled={loading}>
            {loading ? "Menyimpan..." : "💾 Simpan"}
          </button>
          <button type="button" className="btn-secondary btn-lg" onClick={() => router.back()}>
            Batal
          </button>
        </div>
      </form>
    </Card>
  );
}
