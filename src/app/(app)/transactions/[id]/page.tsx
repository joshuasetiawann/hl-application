import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, StatusBadge, TypeBadge } from "@/components/ui";
import SettleButton from "@/components/SettleButton";
import DeleteButton from "@/components/DeleteButton";
import PdfButton from "@/components/PdfButton";
import { parseDiscountArray } from "@/lib/serialize";
import { formatIDR, formatDate, formatDiscountSteps } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const txn = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { customer: true, lines: true },
  });
  if (!txn || txn.deletedAt) notFound();

  const isPiutang = !txn.isBonus && txn.status === "PIUTANG";
  const isLunas = !txn.isBonus && txn.status === "LUNAS";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/transactions" className="text-lg font-semibold text-brand-700 hover:underline">
            ← Kembali ke Daftar Bon
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-3xl font-extrabold">
            Bon {txn.nomorBon}
            <StatusBadge status={txn.status} isBonus={txn.isBonus} />
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PdfButton url={`/api/pdf/bon/${txn.id}`} label="Download PDF" />
          {isPiutang && (
            <SettleButton
              url={`/api/transactions/${txn.id}/settle`}
              label="Tandai Lunas"
              description={`Tandai bon ${txn.nomorBon} sebagai sudah lunas.`}
              successMessage="Bon berhasil ditandai Lunas"
            />
          )}
          <Link href={`/transactions/${txn.id}/edit`} className="btn-secondary">
            ✏️ Edit
          </Link>
          <DeleteButton
            url={`/api/transactions/${txn.id}`}
            title="Hapus Bon?"
            confirmText={`Bon ${txn.nomorBon} akan dihapus dari daftar. Tindakan ini tidak menambah/mengurangi data lain.`}
            redirectTo="/transactions"
          />
        </div>
      </div>

      {/* Payment status banner */}
      {isPiutang && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-300 bg-amber-50 p-5">
          <div className="text-xl font-bold text-amber-800">⏳ Bon ini belum lunas</div>
          <SettleButton
            url={`/api/transactions/${txn.id}/settle`}
            label="Tandai Sudah Lunas"
            description={`Tandai bon ${txn.nomorBon} sebagai sudah lunas.`}
            successMessage="Bon berhasil ditandai Lunas"
          />
        </Card>
      )}
      {isLunas && (
        <Card className="border-emerald-300 bg-emerald-50 p-5">
          <div className="text-xl font-bold text-emerald-800">
            ✓ Bon sudah lunas pada {formatDate(txn.paymentDate)}
          </div>
        </Card>
      )}
      {txn.isBonus && (
        <Card className="border-purple-300 bg-purple-50 p-5">
          <div className="text-xl font-bold text-purple-800">
            🎁 Bon Bonus — produk gratis, {txn.bonusUnitsGranted} bonus dipakai
          </div>
          <p className="mt-1 text-lg text-purple-700">
            Tidak dihitung sebagai omzet, piutang, atau laba.
          </p>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Pelanggan">
          <Link href={`/customers/${txn.customerId}`} className="text-brand-700 hover:underline">
            {txn.customer.nama}
          </Link>
        </InfoCard>
        <InfoCard label="Tanggal">{formatDate(txn.tanggal)}</InfoCard>
        <InfoCard label="Tanggal Pelunasan">
          {txn.paymentDate ? formatDate(txn.paymentDate) : "—"}
        </InfoCard>
        <InfoCard label="Deskripsi">{txn.deskripsi || "—"}</InfoCard>
      </div>

      {/* Line table */}
      <Card>
        <div className="border-b-2 border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold">Detail Produk</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="table-th">Produk</th>
                <th className="table-th">Tipe</th>
                <th className="table-th">Diskon</th>
                <th className="table-th text-right">Harga/unit</th>
                <th className="table-th text-right">Qty</th>
                <th className="table-th text-right">Omzet</th>
              </tr>
            </thead>
            <tbody>
              {txn.lines.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="table-td font-semibold">{l.productNameSnapshot}</td>
                  <td className="table-td">
                    <TypeBadge tipe={l.productTypeSnapshot} />
                  </td>
                  <td className="table-td text-slate-500">
                    {formatDiscountSteps(parseDiscountArray(l.discountStepsSnapshot))}
                  </td>
                  <td className="table-td text-right">{formatIDR(l.discountedUnitPriceSnapshot)}</td>
                  <td className="table-td text-right">{l.quantity}</td>
                  <td className="table-td text-right font-semibold">
                    {formatIDR(txn.isBonus ? 0 : l.lineOmzetSnapshot)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6">
        <h3 className="mb-4 text-xl font-bold">Ringkasan</h3>
        <dl className="grid grid-cols-1 gap-3 text-lg sm:grid-cols-2">
          <Row label="Omzet (tanpa ongkir)" value={formatIDR(txn.isBonus ? 0 : txn.omzetTotal)} />
          <Row label="Ongkir" value={formatIDR(txn.ongkir)} />
          <Row label="Laba HL" value={formatIDR(txn.isBonus ? 0 : txn.profitTotal)} />
          <div className="rounded-xl bg-brand-600 px-4 py-3 text-white sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total Tagihan</span>
              <span className="text-3xl font-extrabold">
                {formatIDR(txn.isBonus ? 0 : txn.amountOwed)}
              </span>
            </div>
          </div>
        </dl>
      </Card>
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-base font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{children}</div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-bold text-slate-900">{value}</dd>
    </div>
  );
}
