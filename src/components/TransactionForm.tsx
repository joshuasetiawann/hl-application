"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText, TypeBadge } from "@/components/ui";
import { apiGet, apiSend } from "@/lib/client";
import {
  applyCascadingDiscount,
  calculateTransaction,
  discountSetForType,
  toMoneyNumber,
  type ProductType,
} from "@/lib/calc";
import { formatIDR } from "@/lib/format";

export interface CustomerOption {
  id: string;
  nama: string;
  lmDiscounts: number[];
  brDiscounts: number[];
  bonusThreshold: number;
}

export interface ProductOption {
  id: string;
  nama: string;
  tipe: ProductType;
  hargaBase: number;
  hargaModal: number;
}

interface LineState {
  productId: string;
  quantity: number;
}

export interface TransactionFormInitial {
  id?: string;
  tanggal: string;
  nomorBon: string;
  customerId: string;
  ongkir: number;
  deskripsi: string;
  isBonus: boolean;
  bonusUnitsGranted: number;
  lines: LineState[];
}

export default function TransactionForm({
  customers,
  products,
  initial,
  defaultCustomerId,
  defaultBonus,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  initial?: TransactionFormInitial;
  defaultCustomerId?: string;
  defaultBonus?: boolean;
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [tanggal, setTanggal] = useState(
    initial?.tanggal ?? new Date().toISOString().slice(0, 10)
  );
  const [nomorBon, setNomorBon] = useState(initial?.nomorBon ?? "");
  const [customerId, setCustomerId] = useState(
    initial?.customerId ?? defaultCustomerId ?? ""
  );
  const [ongkir, setOngkir] = useState(
    initial?.ongkir != null ? String(initial.ongkir) : "0"
  );
  const [deskripsi, setDeskripsi] = useState(initial?.deskripsi ?? "");
  const [isBonus, setIsBonus] = useState(initial?.isBonus ?? defaultBonus ?? false);
  const [bonusUnitsGranted, setBonusUnitsGranted] = useState(
    initial?.bonusUnitsGranted ?? 1
  );
  const [lines, setLines] = useState<LineState[]>(
    initial?.lines && initial.lines.length > 0
      ? initial.lines
      : [{ productId: "", quantity: 1 }]
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bonusAvailable, setBonusAvailable] = useState<number | null>(null);

  const customer = customers.find((c) => c.id === customerId);
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  // Fetch bonus eligibility when relevant.
  useEffect(() => {
    let active = true;
    if (!customerId) {
      setBonusAvailable(null);
      return;
    }
    apiGet<{ bonusesAvailable: number; enabled: boolean }>(
      `/api/customers/${customerId}/bonus`
    )
      .then((d) => {
        if (active) setBonusAvailable(d.enabled ? d.bonusesAvailable : 0);
      })
      .catch(() => {
        if (active) setBonusAvailable(null);
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  function lineComputed(line: LineState) {
    const product = productMap.get(line.productId);
    if (!product || !customer) {
      return { discountedUnitPrice: 0, lineOmzet: 0, tipe: null as ProductType | null, steps: [] as number[] };
    }
    const steps = discountSetForType(customer, product.tipe);
    const dup = applyCascadingDiscount(product.hargaBase, steps);
    const omzet = isBonus ? 0 : dup.times(line.quantity);
    return {
      discountedUnitPrice: toMoneyNumber(dup),
      lineOmzet: isBonus ? 0 : toMoneyNumber(dup.times(line.quantity)),
      tipe: product.tipe,
      steps,
    };
  }

  // Live transaction totals.
  const totals = useMemo(() => {
    if (!customer)
      return { omzet: 0, owed: 0, ongkirNum: 0 };
    const calcLines = lines
      .filter((l) => l.productId)
      .map((l) => {
        const p = productMap.get(l.productId)!;
        return {
          basePrice: p.hargaBase,
          hargaModal: p.hargaModal,
          qty: l.quantity,
          discountSteps: discountSetForType(customer, p.tipe),
        };
      });
    const result = calculateTransaction({
      lines: calcLines,
      ongkir: Number(ongkir) || 0,
      isBonus,
    });
    return {
      omzet: toMoneyNumber(result.omzetTotal),
      owed: toMoneyNumber(result.amountOwed),
      ongkirNum: isBonus ? 0 : Number(ongkir) || 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, ongkir, isBonus, customerId, products]);

  function addLine() {
    setLines([...lines, { productId: "", quantity: 1 }]);
  }
  function removeLine(i: number) {
    setLines(lines.filter((_, idx) => idx !== i));
  }
  function updateLine(i: number, patch: Partial<LineState>) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerId) return setError("Pelanggan wajib dipilih");
    const validLines = lines.filter((l) => l.productId && l.quantity >= 1);
    if (validLines.length === 0)
      return setError("Minimal 1 baris produk dengan qty >= 1");
    if (!nomorBon.trim()) return setError("Nomor Bon wajib diisi");
    if (isBonus) {
      if (bonusUnitsGranted < 1)
        return setError("Bonus bon harus memberikan minimal 1 bonus");
      if (bonusAvailable != null && bonusUnitsGranted > bonusAvailable)
        return setError(
          `Bonus tersedia hanya ${bonusAvailable}, tidak bisa memberi ${bonusUnitsGranted}`
        );
    }

    const body = {
      tanggal,
      nomorBon: nomorBon.trim(),
      customerId,
      ongkir: isBonus ? 0 : Number(ongkir) || 0,
      deskripsi,
      isBonus,
      bonusUnitsGranted: isBonus ? bonusUnitsGranted : 0,
      lines: validLines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
      })),
    };

    setLoading(true);
    try {
      let res: { id: string };
      if (isEdit) {
        res = await apiSend(`/api/transactions/${initial!.id}`, "PUT", body);
      } else {
        res = await apiSend("/api/transactions", "POST", body);
      }
      router.push(`/transactions/${res.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Tanggal *</label>
            <input
              type="date"
              className="input"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Nomor Bon *</label>
            <input
              className="input"
              value={nomorBon}
              onChange={(e) => setNomorBon(e.target.value)}
              placeholder="Harus unik"
              required
            />
          </div>
          <div>
            <label className="label">Pelanggan *</label>
            <select
              className="input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">— Pilih pelanggan —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <input
              className="input"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 rounded-md border border-purple-200 bg-purple-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-purple-800">
            <input
              type="checkbox"
              checked={isBonus}
              onChange={(e) => setIsBonus(e.target.checked)}
            />
            Tandai sebagai Bonus Bon (produk gratis, 0 omzet, 0 piutang)
          </label>
          {isBonus && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div>
                <label className="label">Jumlah Bonus Diberikan</label>
                <input
                  type="number"
                  min={1}
                  className="input w-32"
                  value={bonusUnitsGranted}
                  onChange={(e) => setBonusUnitsGranted(Number(e.target.value))}
                />
              </div>
              <div className="text-sm text-purple-700">
                {bonusAvailable == null
                  ? "Memuat bonus tersedia..."
                  : `Bonus tersedia: ${bonusAvailable}`}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Baris Produk</h2>
          <button type="button" className="btn-secondary" onClick={addLine}>
            + Tambah Baris
          </button>
        </div>

        {!customer && (
          <p className="mb-3 text-sm text-amber-600">
            Pilih pelanggan dulu untuk melihat harga setelah diskon.
          </p>
        )}

        <div className="space-y-3">
          {lines.map((line, i) => {
            const c = lineComputed(line);
            return (
              <div
                key={i}
                className="grid grid-cols-12 items-end gap-2 rounded-md border border-slate-200 p-3"
              >
                <div className="col-span-12 sm:col-span-5">
                  <label className="label">Produk</label>
                  <select
                    className="input"
                    value={line.productId}
                    onChange={(e) => updateLine(i, { productId: e.target.value })}
                  >
                    <option value="">— Pilih produk —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.tipe})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="label">Qty</label>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(i, { quantity: Math.max(1, Number(e.target.value)) })
                    }
                  />
                </div>
                <div className="col-span-8 sm:col-span-2">
                  <label className="label">Harga / unit</label>
                  <div className="flex items-center gap-2 py-2 text-sm">
                    {c.tipe && <TypeBadge tipe={c.tipe} />}
                    <span>{formatIDR(c.discountedUnitPrice)}</span>
                  </div>
                </div>
                <div className="col-span-8 sm:col-span-2">
                  <label className="label">Omzet baris</label>
                  <div className="py-2 text-sm font-medium">
                    {formatIDR(c.lineOmzet)}
                  </div>
                </div>
                <div className="col-span-4 sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    className="btn-danger py-1"
                    onClick={() => removeLine(i)}
                    disabled={lines.length === 1}
                  >
                    ✕
                  </button>
                </div>
                {c.tipe && c.steps.length > 0 && (
                  <div className="col-span-12 text-xs text-slate-400">
                    Diskon {c.tipe}: {c.steps.map((s) => `${s}%`).join(" → ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Ongkir (Rupiah)</label>
            <input
              type="number"
              min={0}
              step="any"
              className="input"
              value={isBonus ? "0" : ongkir}
              onChange={(e) => setOngkir(e.target.value)}
              disabled={isBonus}
            />
            <p className="mt-1 text-xs text-slate-500">
              Ongkir ditambahkan ke tagihan, tidak masuk omzet/laba.
            </p>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <div className="flex justify-between py-1 text-sm">
              <span>Omzet (tanpa ongkir)</span>
              <span className="font-medium">{formatIDR(totals.omzet)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span>Ongkir</span>
              <span className="font-medium">{formatIDR(totals.ongkirNum)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
              <span>Total Tagihan</span>
              <span>{formatIDR(totals.owed)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Bon"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Batal
          </button>
        </div>
        {!isEdit && !isBonus && (
          <p className="mt-2 text-xs text-slate-500">
            Bon baru otomatis berstatus <b>Piutang</b>.
          </p>
        )}
      </Card>
    </form>
  );
}
