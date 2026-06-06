"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText } from "@/components/ui";
import { apiSend } from "@/lib/client";

export interface ProductFormData {
  id?: string;
  nama: string;
  tipe: "LM" | "BR";
  hargaBase: number;
  hargaModal: number;
}

export default function ProductForm({ initial }: { initial?: ProductFormData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [tipe, setTipe] = useState<"LM" | "BR">(initial?.tipe ?? "LM");
  const [hargaBase, setHargaBase] = useState(
    initial?.hargaBase != null ? String(initial.hargaBase) : ""
  );
  const [hargaModal, setHargaModal] = useState(
    initial?.hargaModal != null ? String(initial.hargaModal) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nama.trim()) return setError("Nama produk wajib diisi");
    const base = Number(hargaBase);
    const modal = Number(hargaModal);
    if (isNaN(base) || base < 0) return setError("Harga base harus angka >= 0");
    if (isNaN(modal) || modal < 0) return setError("Harga modal harus angka >= 0");

    const body = { nama: nama.trim(), tipe, hargaBase: base, hargaModal: modal };
    setLoading(true);
    try {
      if (isEdit) {
        await apiSend(`/api/products/${initial!.id}`, "PUT", body);
      } else {
        await apiSend("/api/products", "POST", body);
      }
      router.push("/products");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="label">Nama Produk *</label>
          <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} required />
        </div>
        <div>
          <label className="label">Tipe Produk *</label>
          <select className="input" value={tipe} onChange={(e) => setTipe(e.target.value as "LM" | "BR")}>
            <option value="LM">LM</option>
            <option value="BR">BR</option>
          </select>
        </div>
        <div>
          <label className="label">Harga Base / Jual (Rupiah) *</label>
          <input
            type="number"
            min={0}
            step="any"
            className="input"
            value={hargaBase}
            onChange={(e) => setHargaBase(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Harga Modal (Rupiah) *</label>
          <input
            type="number"
            min={0}
            step="any"
            className="input"
            value={hargaModal}
            onChange={(e) => setHargaModal(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Internal — hanya untuk perhitungan Laba HL.
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
