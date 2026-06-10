import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, StatCard, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import MonthYearSelector from "@/components/MonthYearSelector";
import FilterSelect from "@/components/FilterSelect";
import PdfButton from "@/components/PdfButton";
import SettleButton from "@/components/SettleButton";
import { getFilteredTransactions } from "@/lib/services/report";
import { formatIDR, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PiutangPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; customerId?: string };
}) {
  const now = new Date();
  const year = Number(searchParams.year) || now.getFullYear();
  const month = Number(searchParams.month) || 0; // 0 = whole year
  const customerId = searchParams.customerId || "";

  const txns = (
    await getFilteredTransactions({
      year,
      month: month || undefined,
      customerId: customerId || undefined,
    })
  ).filter((t) => !t.isBonus && t.status === "PIUTANG");

  const total = txns.reduce((s, t) => s + t.amountOwed, 0);

  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });

  const txYears = await prisma.transaction.findMany({
    where: { deletedAt: null },
    select: { tanggal: true },
  });
  const yearSet = new Set<number>([now.getFullYear(), year]);
  txYears.forEach((t) => yearSet.add(new Date(t.tanggal).getFullYear()));
  const years = Array.from(yearSet).sort((a, b) => b - a);

  const pdfQuery = `year=${year}${month ? `&month=${month}` : ""}${customerId ? `&customerId=${customerId}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.7rem]">
            Daftar Piutang
          </h1>
          <p className="mt-1 text-[0.95rem] text-slate-500">Bon yang belum dibayar.</p>
        </div>
        <PdfButton url={`/api/pdf/piutang?${pdfQuery}`} label="Download PDF" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <MonthYearSelector year={year} month={month} years={years} includeAllMonths />
        <FilterSelect
          paramKey="customerId"
          value={customerId}
          allLabel="Semua Pelanggan"
          options={customers.map((c) => ({ value: c.id, label: c.nama }))}
        />
      </div>

      <StatCard
        label="Total Piutang (sesuai filter)"
        value={formatIDR(total)}
        accent="red"
        icon="wallet"
        hint={`${txns.length} bon belum lunas`}
      />

      <Card>
        {txns.length === 0 ? (
          <EmptyState
            icon="checkCircle"
            title="Tidak ada piutang"
            message="Semua bon pada periode ini sudah lunas."
          />
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[40rem]">
              <thead>
                <tr className="border-b border-slate-200/70">
                  <th className="table-th">Tanggal</th>
                  <th className="table-th">Nomor Bon</th>
                  <th className="table-th">Pelanggan</th>
                  <th className="table-th text-right">Omzet</th>
                  <th className="table-th text-right">Ongkir</th>
                  <th className="table-th text-right">Total Tagihan</th>
                  <th className="table-th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="table-td whitespace-nowrap text-slate-500">{formatDate(t.tanggal)}</td>
                    <td className="table-td font-semibold text-slate-900">{t.nomorBon}</td>
                    <td className="table-td">{t.customer.nama}</td>
                    <td className="table-td num">{formatIDR(t.omzetTotal)}</td>
                    <td className="table-td num text-slate-500">{formatIDR(t.ongkir)}</td>
                    <td className="table-td num font-semibold text-slate-900">{formatIDR(t.amountOwed)}</td>
                    <td className="table-td">
                      <div className="flex justify-end gap-2">
                        <Link href={`/transactions/${t.id}`} className="btn-secondary btn-sm">
                          <Icon name="eye" size={16} /> Lihat
                        </Link>
                        <SettleButton
                          url={`/api/transactions/${t.id}/settle`}
                          label="Lunas"
                          description={`Tandai bon ${t.nomorBon} sebagai sudah lunas.`}
                          successMessage="Bon berhasil ditandai Lunas"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
