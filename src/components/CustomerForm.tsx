"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText } from "@/components/ui";
import { apiSend } from "@/lib/client";
import { applyCascadingDiscount } from "@/lib/calc";

export interface CustomerFormData {
  id?: string;
  nama: string;
  lmDiscounts: number[];
  brDiscounts: number[];
  bonusThreshold: number;
}

function DiscountEditor({
  title,
  steps,
  setSteps,
}: {
  title: string;
  steps: number[];
  setSteps: (s: number[]) => void;
}) {
  const [newVal, setNewVal] = useState("");

  function add() {
    const v = Number(newVal);
    if (newVal === "" || isNaN(v) || v < 0 || v > 100) {
      alert("Diskon harus angka antara 0 dan 100");
      return;
    }
    setSteps([...steps, v]);
    setNewVal("");
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

  const preview = applyCascadingDiscount(100, steps).toNumber();
  const effective = (100 - preview).toFixed(2);

  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs text-slate-500">
          Preview base 100 → {preview} (efektif {effective}%)
        </span>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        Diskon bertingkat — urutan berpengaruh, tidak dijumlahkan.
        {steps.length > 0 && (
          <span className="ml-1 font-medium text-slate-700">
            {steps.map((s) => `${s}%`).join(" → ")}
          </span>
        )}
      </p>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-center text-xs text-slate-400">{i + 1}.</span>
            <input
              type="number"
              min={0}
              max={100}
              step="any"
              className="input w-28"
              value={s}
              onChange={(e) => update(i, e.target.value)}
            />
            <span className="text-sm text-slate-500">%</span>
            <button type="button" className="btn-secondary py-1" onClick={() => move(i, -1)} disabled={i === 0}>
              ↑
            </button>
            <button
              type="button"
              className="btn-secondary py-1"
              onClick={() => move(i, 1)}
              disabled={i === steps.length - 1}
            >
              ↓
            </button>
            <button type="button" className="btn-danger py-1" onClick={() => remove(i)}>
              Hapus
            </button>
          </div>
        ))}
        {steps.length === 0 && (
          <p className="text-sm text-slate-400">Belum ada step diskon.</p>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          step="any"
          className="input w-28"
          placeholder="0-100"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
        />
        <button type="button" className="btn-secondary" onClick={add}>
          + Tambah Step
        </button>
      </div>
    </div>
  );
}

export default function CustomerForm({ initial }: { initial?: CustomerFormData }) {
  const router = useRouter();
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
    if (!nama.trim()) {
      setError("Nama wajib diisi");
      return;
    }
    const body = {
      nama: nama.trim(),
      lmDiscounts: lm,
      brDiscounts: br,
      bonusThreshold: Number(threshold) || 0,
    };
    setLoading(true);
    try {
      if (isEdit) {
        await apiSend(`/api/customers/${initial!.id}`, "PUT", body);
      } else {
        await apiSend("/api/customers", "POST", body);
      }
      router.push("/customers");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="label">Nama Pelanggan *</label>
          <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} required />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DiscountEditor title="Diskon LM" steps={lm} setSteps={setLm} />
          <DiscountEditor title="Diskon BR" steps={br} setSteps={setBr} />
        </div>

        <div>
          <label className="label">Threshold Bonus (Rupiah)</label>
          <input
            type="number"
            min={0}
            step="any"
            className="input max-w-xs"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            0 berarti program bonus dinonaktifkan untuk pelanggan ini.
          </p>
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Batal
          </button>
        </div>
      </form>
    </Card>
  );
}
