import Link from "next/link";
import { prisma } from "@/lib/db";
import { recapOverall } from "@/lib/services/report";
import { getEligibleCustomers } from "@/lib/services/bonus";
import { calculateRecognizedTotals } from "@/lib/calc";
import { StatCard, Card, StatusBadge } from "@/components/ui";
import { formatIDR, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Outstanding piutang across all time (non-bonus).
  const allTxns = await prisma.transaction.findMany({
    where: { deletedAt: null },
    select: {
      status: true,
      isBonus: true,
      omzetTotal: true,
      profitTotal: true,
      ongkir: true,
    },
  });
  const allTotals = calculateRecognizedTotals(
    allTxns.map((t) => ({
      status: t.status as "PIUTANG" | "LUNAS",
      isBonus: t.isBonus,
      omzetTotal: t.omzetTotal,
      profitTotal: t.profitTotal,
      ongkir: t.ongkir,
    }))
  );

  const monthRecap = await recapOverall({ year, month });
  const eligible = await getEligibleCustomers();

  const recentBons = await prisma.transaction.findMany({
    where: { deletedAt: null },
    include: { customer: true },
    orderBy: { tanggal: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Ringkasan bulan {now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/transactions/new" className="btn-primary">
          + Buat Bon
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Piutang Outstanding"
          value={formatIDR(allTotals.totalOutstandingPiutang.toNumber())}
          accent="red"
          hint="Seluruh transaksi belum Lunas"
        />
        <StatCard
          label="Sudah Dibayar Bulan Ini"
          value={formatIDR(monthRecap.totalPaid)}
          accent="green"
        />
        <StatCard
          label="Omzet Diakui Bulan Ini"
          value={formatIDR(monthRecap.recognizedOmzet)}
          accent="blue"
          hint="Hanya transaksi Lunas"
        />
        <StatCard
          label="Laba HL Bulan Ini"
          value={formatIDR(monthRecap.recognizedProfit)}
          accent="blue"
          hint="Hanya transaksi Lunas"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold">Bon Terbaru</h2>
            <Link href="/transactions" className="text-sm text-brand-600">
              Lihat semua
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-th">Tanggal</th>
                  <th className="table-th">Nomor Bon</th>
                  <th className="table-th">Pelanggan</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Tagihan</th>
                </tr>
              </thead>
              <tbody>
                {recentBons.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-slate-400">
                      Belum ada bon.
                    </td>
                  </tr>
                )}
                {recentBons.map((t) => (
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
                      {formatIDR(t.isBonus ? 0 : t.amountOwed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold">Pelanggan Eligible Bonus</h2>
          </div>
          <div className="p-4">
            {eligible.length === 0 ? (
              <p className="text-sm text-slate-400">
                Belum ada pelanggan yang eligible bonus.
              </p>
            ) : (
              <ul className="space-y-2">
                {eligible.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-sm text-brand-600 hover:underline"
                    >
                      {c.nama}
                    </Link>
                    <span className="badge bg-purple-100 text-purple-700">
                      {c.bonusesAvailable} bonus
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
