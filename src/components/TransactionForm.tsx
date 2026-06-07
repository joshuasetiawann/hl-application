"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, TypeBadge, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/Toast";
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

const STEPS = ["Info Bon", "Pilih Produk", "Ongkir & Bonus", "Ringkasan"];

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
  const toast = useToast();
  const isEdit = !!initial?.id;

  const [step, setStep] = useState(1);
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
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

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
      return {
        discountedUnitPrice: 0,
        lineOmzet: 0,
        tipe: null as ProductType | null,
        steps: [] as number[],
      };
    }
    const steps = discountSetForType(customer, product.tipe);
    const dup = applyCascadingDiscount(product.hargaBase, steps);
    return {
      discountedUnitPrice: toMoneyNumber(dup),
      lineOmzet: isBonus ? 0 : toMoneyNumber(dup.times(line.quantity)),
      tipe: product.tipe,
      steps,
    };
  }

  const totals = useMemo(() => {
    if (!customer) return { omzet: 0, owed: 0, ongkirNum: 0, laba: 0 };
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
      laba: toMoneyNumber(result.profitTotal),
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

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!tanggal) return "Tanggal wajib diisi";
      if (!nomorBon.trim()) return "Nomor Bon wajib diisi";
      if (!customerId) return "Pelanggan wajib dipilih";
    }
    if (s === 2) {
      const valid = lines.filter((l) => l.productId && l.quantity >= 1);
      if (valid.length === 0) return "Minimal 1 produk dengan jumlah minimal 1";
    }
    if (s === 3 && isBonus) {
      if (bonusUnitsGranted < 1) return "Jumlah bonus minimal 1";
      if (bonusAvailable != null && bonusUnitsGranted > bonusAvailable)
        return `Bonus tersedia hanya ${bonusAvailable}`;
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(4, s + 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function onSave() {
    for (let s = 1; s <= 3; s++) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }
    const validLines = lines.filter((l) => l.productId && l.quantity >= 1);
    const body = {
      tanggal,
      nomorBon: nomorBon.trim(),
      customerId,
      ongkir: isBonus ? 0 : Number(ongkir) || 0,
      deskripsi,
      isBonus,
      bonusUnitsGranted: isBonus ? bonusUnitsGranted : 0,
      lines: validLines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
    };
    setLoading(true);
    try {
      let res: { id: string };
      if (isEdit) res = await apiSend(`/api/transactions/${initial!.id}`, "PUT", body);
      else res = await apiSend("/api/transactions", "POST", body);
      toast.show(isEdit ? "Bon berhasil diperbarui" : "Bon berhasil disimpan", "success");
      router.push(`/transactions/${res.id}`);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan";
      setError(msg);
      toast.show(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  const customerName = customer?.nama ?? "-";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {/* Stepper */}
        <ol className="flex flex-wrap items-center gap-1.5">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <li key={label} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => n < step && setStep(n)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.85rem] font-semibold transition-colors ${
                    active
                      ? "bg-brand-700 text-white shadow-card"
                      : done
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.72rem] ${
                      active ? "bg-white/20" : done ? "bg-emerald-200/70" : "bg-slate-200"
                    }`}
                  >
                    {done ? <Icon name="check" size={12} strokeWidth={2.5} /> : n}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {n < STEPS.length && <span className="text-slate-300">·</span>}
              </li>
            );
          })}
        </ol>

        {error && (
          <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 px-4 py-3 text-[0.95rem] font-medium text-rose-700 ring-1 ring-inset ring-rose-100">
            <Icon name="alert" size={18} className="shrink-0" /> {error}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Langkah 1 — Info Bon</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="label">Tanggal</label>
                <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </div>
              <div>
                <label className="label">Nomor Bon</label>
                <input className="input" value={nomorBon} onChange={(e) => setNomorBon(e.target.value)} placeholder="Contoh: BON-004" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Pilih Pelanggan</label>
                <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">— Pilih pelanggan —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.nama}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Deskripsi (boleh kosong)</label>
                <input className="input" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Catatan tambahan" />
              </div>
            </div>
          </Card>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <Card className="p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">Langkah 2 — Pilih Produk</h2>
              <button type="button" className="btn-secondary btn-sm" onClick={addLine}>
                <Icon name="plus" size={16} /> Tambah Produk
              </button>
            </div>
            <p className="help mb-4">Harga otomatis mengikuti diskon pelanggan.</p>
            {!customer && (
              <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-[0.9rem] text-amber-800 ring-1 ring-inset ring-amber-100">
                <Icon name="info" size={16} className="shrink-0" />
                Pilih pelanggan dulu di Langkah 1 untuk melihat harga setelah diskon.
              </p>
            )}
            <div className="space-y-3">
              {lines.map((line, i) => {
                const c = lineComputed(line);
                return (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                      <div className="sm:col-span-6">
                        <label className="label">Produk</label>
                        <select className="input" value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })}>
                          <option value="">— Pilih produk —</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.nama} ({p.tipe})</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">Jumlah</label>
                        <input type="number" min={1} className="input" value={line.quantity}
                          onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value)) })} />
                      </div>
                      <div className="sm:col-span-4 flex items-end">
                        <button type="button" className="btn-secondary btn-block text-rose-600 hover:border-rose-300 hover:bg-rose-50" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                          <Icon name="trash" size={16} /> Hapus Produk
                        </button>
                      </div>
                    </div>
                    {line.productId && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[0.9rem]">
                        {c.tipe && <span className="flex items-center gap-2">Tipe: <TypeBadge tipe={c.tipe} /></span>}
                        <span>Harga setelah diskon: <b>{formatIDR(c.discountedUnitPrice)}</b></span>
                        <span>Omzet: <b>{isBonus ? formatIDR(0) : formatIDR(c.lineOmzet)}</b></span>
                        {c.steps.length > 0 && (
                          <span className="text-slate-500">Diskon {c.tipe}: {c.steps.map((s) => `${s}%`).join(" → ")}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Langkah 3 — Ongkir &amp; Bonus</h2>
            <div className="max-w-sm">
              <label className="label">Ongkir (Rupiah)</label>
              <input type="number" min={0} step="any" className="input" value={isBonus ? "0" : ongkir}
                onChange={(e) => setOngkir(e.target.value)} disabled={isBonus} />
              <p className="help">Ongkir ditambahkan ke total tagihan, tetapi tidak masuk omzet/laba.</p>
            </div>

            <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-gold-200 bg-gold-50/60 p-4">
              <input type="checkbox" className="h-5 w-5 accent-gold-600" checked={isBonus} onChange={(e) => setIsBonus(e.target.checked)} />
              <span className="flex items-center gap-2 text-[0.95rem] font-semibold text-gold-800">
                <Icon name="gift" size={18} /> Ini Bon Bonus
              </span>
            </label>

            {isBonus && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-gold-50/70 px-4 py-3 text-[0.92rem] text-gold-800 ring-1 ring-inset ring-gold-100">
                  Bon Bonus gratis. Tidak masuk omzet, piutang, atau laba.
                </div>
                <div className="text-[0.95rem] font-semibold text-gold-800">
                  Bonus tersedia: {bonusAvailable == null ? "memuat…" : bonusAvailable}
                </div>
                <div className="max-w-xs">
                  <label className="label">Jumlah bonus yang dipakai</label>
                  <input type="number" min={1} className="input" value={bonusUnitsGranted}
                    onChange={(e) => setBonusUnitsGranted(Number(e.target.value))} />
                </div>
              </div>
            )}
          </Card>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Langkah 4 — Ringkasan &amp; Simpan</h2>
            <dl className="divide-y divide-slate-100 text-[0.95rem]">
              <SummaryRow label="Pelanggan" value={customerName} />
              <SummaryRow label="Nomor Bon" value={nomorBon || "-"} />
              <SummaryRow label="Tanggal" value={tanggal} />
              <SummaryRow label="Omzet" value={formatIDR(totals.omzet)} />
              <SummaryRow label="Ongkir" value={formatIDR(totals.ongkirNum)} />
              <SummaryRow label="Total Tagihan" value={formatIDR(totals.owed)} strong />
              <SummaryRow label="Laba HL" value={formatIDR(totals.laba)} />
              <SummaryRow label="Status Awal" value={isBonus ? "Bonus" : "Piutang"} />
              <SummaryRow label="Bon Bonus" value={isBonus ? `Ya (${bonusUnitsGranted} bonus)` : "Tidak"} />
            </dl>
            {!isBonus && (
              <p className="help mt-4">Bon baru otomatis berstatus <b>Piutang</b> sampai ditandai Lunas.</p>
            )}
          </Card>
        )}

        {/* Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-secondary" onClick={step === 1 ? () => router.back() : back}>
            {step === 1 ? (
              "Batal"
            ) : (
              <>
                <Icon name="arrowLeft" size={17} /> Kembali
              </>
            )}
          </button>
          {step < 4 ? (
            <button type="button" className="btn-primary btn-lg" onClick={next}>
              Lanjut <Icon name="arrowRight" size={18} />
            </button>
          ) : (
            <button type="button" className="btn-success btn-lg" onClick={onSave} disabled={loading}>
              {loading ? (
                "Menyimpan…"
              ) : (
                <>
                  <Icon name="check" size={18} /> {isEdit ? "Simpan Perubahan" : "Simpan Bon"}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Sticky totals */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Card className={`p-5 sm:p-6 ${isBonus ? "border-gold-200 bg-gold-50/30" : ""}`}>
          <h3 className="mb-4 text-[0.78rem] font-semibold uppercase tracking-wide text-slate-500">
            Ringkasan Bon
          </h3>
          <div className="space-y-3">
            <TotalRow label="Omzet" value={formatIDR(totals.omzet)} />
            <TotalRow label="Ongkir" value={formatIDR(totals.ongkirNum)} />
            <div className="rounded-xl bg-brand-800 px-4 py-3.5 text-white">
              <div className="text-[0.78rem] font-medium uppercase tracking-wide text-white/70">
                Total Tagihan
              </div>
              <div className="mt-0.5 text-2xl font-bold tracking-tight tnum">{formatIDR(totals.owed)}</div>
            </div>
            <TotalRow label="Laba HL" value={formatIDR(totals.laba)} />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[0.92rem] text-slate-500">Status</span>
              {isBonus ? <StatusBadge isBonus /> : <StatusBadge status="PIUTANG" />}
            </div>
          </div>
          {isBonus && (
            <p className="mt-4 rounded-lg bg-gold-50 px-3 py-2 text-[0.88rem] text-gold-800 ring-1 ring-inset ring-gold-100">
              Bon Bonus: Omzet Rp 0, Total Rp 0, Laba Rp 0.
            </p>
          )}
        </Card>
      </aside>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className={strong ? "text-xl font-bold tracking-tight tnum text-brand-700" : "font-semibold tnum text-slate-900"}>
        {value}
      </dd>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[0.95rem]">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold tnum text-slate-900">{value}</span>
    </div>
  );
}
