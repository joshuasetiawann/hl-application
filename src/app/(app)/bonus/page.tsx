import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { getEligibleCustomers } from "@/lib/services/bonus";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BonusLogPage() {
  const bonusBons = await prisma.transaction.findMany({
    where: { deletedAt: null, isBonus: true },
    include: { customer: true, lines: true },
    orderBy: { tanggal: "desc" },
  });
  const eligible = await getEligibleCustomers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log Bonus</h1>

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Pelanggan Eligible Bonus</h2>
        </div>
        <div className="p-4">
          {eligible.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada pelanggan eligible.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {eligible.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                >
                  <Link href={`/customers/${c.id}`} className="text-sm text-brand-600 hover:underline">
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

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Riwayat Bonus Bon</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-th">Tanggal</th>
                <th className="table-th">Nomor Bon</th>
                <th className="table-th">Pelanggan</th>
                <th className="table-th text-right">Bonus Diberikan</th>
                <th className="table-th text-right">Jumlah Item</th>
              </tr>
            </thead>
            <tbody>
              {bonusBons.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm text-slate-400">
                    Belum ada bonus bon.
                  </td>
                </tr>
              )}
              {bonusBons.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="table-td">{formatDate(t.tanggal)}</td>
                  <td className="table-td">
                    <Link href={`/transactions/${t.id}`} className="text-brand-600 hover:underline">
                      {t.nomorBon}
                    </Link>
                  </td>
                  <td className="table-td">{t.customer.nama}</td>
                  <td className="table-td text-right">{t.bonusUnitsGranted}</td>
                  <td className="table-td text-right">
                    {t.lines.reduce((s, l) => s + l.quantity, 0)}
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
