import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, StatusBadge, TypeBadge } from "@/components/ui";
import SettleButton from "@/components/SettleButton";
import DeleteButton from "@/components/DeleteButton";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/transactions" className="text-sm text-brand-600">
            ← Transaksi
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            Bon {txn.nomorBon}
            <StatusBadge status={txn.status} isBonus={txn.isBonus} />
          </h1>
          <p className="text-sm text-slate-500">
            {formatDate(txn.tanggal)} •{" "}
            <Link href={`/customers/${txn.customerId}`} className="text-brand-600 hover:underline">
              {txn.customer.nama}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!txn.isBonus && txn.status === "PIUTANG" && (
            <SettleButton
              url={`/api/transactions/${txn.id}/settle`}
              label="Lunas"
              successMessage="Bon berhasil dilunasi"
            />
          )}
          <Link href={`/transactions/${txn.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <DeleteButton
            url={`/api/transactions/${txn.id}`}
            confirmText={`Hapus bon ${txn.nomorBon}? (soft-delete)`}
            redirectTo="/transactions"
          />
        </div>
      </div>

      {txn.isBonus && (
        <div className="rounded-md bg-purple-50 px-4 py-3 text-sm text-purple-800">
          🎁 Ini adalah <b>Bonus Bon</b>. Produk gratis — 0 omzet, 0 tagihan, 0 laba.
          Bonus diberikan: <b>{txn.bonusUnitsGranted}</b>.
        </div>
      )}

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Detail Baris</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-th">Produk</th>
                <th className="table-th">Tipe</th>
                <th className="table-th">Diskon</th>
                <th className="table-th text-right">Harga Base</th>
                <th className="table-th text-right">Harga/unit</th>
                <th className="table-th text-right">Qty</th>
                <th className="table-th text-right">Omzet</th>
                <th className="table-th text-right">Laba HL</th>
              </tr>
            </thead>
            <tbody>
              {txn.lines.map((l) => (
                <tr key={l.id} className="border-b border-slate-50">
                  <td className="table-td font-medium">{l.productNameSnapshot}</td>
                  <td className="table-td">
                    <TypeBadge tipe={l.productTypeSnapshot} />
                  </td>
                  <td className="table-td text-xs text-slate-500">
                    {formatDiscountSteps(parseDiscountArray(l.discountStepsSnapshot))}
                  </td>
                  <td className="table-td text-right">{formatIDR(l.hargaBaseSnapshot)}</td>
                  <td className="table-td text-right">
                    {formatIDR(l.discountedUnitPriceSnapshot)}
                  </td>
                  <td className="table-td text-right">{l.quantity}</td>
                  <td className="table-td text-right">{formatIDR(l.lineOmzetSnapshot)}</td>
                  <td className="table-td text-right">{formatIDR(l.lineProfitSnapshot)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Ringkasan</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Omzet (tanpa ongkir)" value={formatIDR(txn.isBonus ? 0 : txn.omzetTotal)} />
            <Row label="Ongkir" value={formatIDR(txn.ongkir)} />
            <Row
              label="Total Tagihan"
              value={formatIDR(txn.isBonus ? 0 : txn.amountOwed)}
              bold
            />
            <Row label="Laba HL" value={formatIDR(txn.isBonus ? 0 : txn.profitTotal)} />
          </dl>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Status Pembayaran</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <StatusBadge status={txn.status} isBonus={txn.isBonus} />
              </dd>
            </div>
            <Row
              label="Tanggal Pelunasan"
              value={txn.paymentDate ? formatDate(txn.paymentDate) : "—"}
            />
            {txn.deskripsi && <Row label="Deskripsi" value={txn.deskripsi} />}
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={bold ? "font-bold" : "font-medium"}>{value}</dd>
    </div>
  );
}
