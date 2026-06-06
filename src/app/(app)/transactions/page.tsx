import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, StatusBadge } from "@/components/ui";
import { formatIDR, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = searchParams.status;
  const txns = await prisma.transaction.findMany({
    where: {
      deletedAt: null,
      ...(status === "PIUTANG" || status === "LUNAS" ? { status } : {}),
    },
    include: { customer: true },
    orderBy: { tanggal: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bon / Transaksi</h1>
        <div className="flex gap-2">
          <a href="/api/pdf/transactions" target="_blank" className="btn-secondary">
            PDF Transaksi
          </a>
          <a href="/api/pdf/piutang" target="_blank" className="btn-secondary">
            PDF Piutang
          </a>
          <Link href="/transactions/new" className="btn-primary">
            + Buat Bon
          </Link>
        </div>
      </div>

      <div className="flex gap-2 text-sm">
        <Link
          href="/transactions"
          className={`rounded-md px-3 py-1 ${!status ? "bg-brand-50 text-brand-700" : "text-slate-600"}`}
        >
          Semua
        </Link>
        <Link
          href="/transactions?status=PIUTANG"
          className={`rounded-md px-3 py-1 ${status === "PIUTANG" ? "bg-brand-50 text-brand-700" : "text-slate-600"}`}
        >
          Piutang
        </Link>
        <Link
          href="/transactions?status=LUNAS"
          className={`rounded-md px-3 py-1 ${status === "LUNAS" ? "bg-brand-50 text-brand-700" : "text-slate-600"}`}
        >
          Lunas
        </Link>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-th">Tanggal</th>
                <th className="table-th">Nomor Bon</th>
                <th className="table-th">Pelanggan</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Omzet</th>
                <th className="table-th text-right">Ongkir</th>
                <th className="table-th text-right">Tagihan</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-slate-400">
                    Belum ada transaksi.
                  </td>
                </tr>
              )}
              {txns.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="table-td">{formatDate(t.tanggal)}</td>
                  <td className="table-td">
                    <Link href={`/transactions/${t.id}`} className="text-brand-600 hover:underline">
                      {t.nomorBon}
                    </Link>
                  </td>
                  <td className="table-td">{t.customer.nama}</td>
                  <td className="table-td">
                    <StatusBadge status={t.status} isBonus={t.isBonus} />
                  </td>
                  <td className="table-td text-right">
                    {formatIDR(t.isBonus ? 0 : t.omzetTotal)}
                  </td>
                  <td className="table-td text-right">{formatIDR(t.ongkir)}</td>
                  <td className="table-td text-right">
                    {formatIDR(t.isBonus ? 0 : t.amountOwed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
