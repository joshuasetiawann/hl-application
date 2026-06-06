import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, StatCard, StatusBadge } from "@/components/ui";
import MonthYearSelector from "@/components/MonthYearSelector";
import SettleButton from "@/components/SettleButton";
import PdfButton from "@/components/PdfButton";
import { getCustomerBonusEligibility } from "@/lib/services/bonus";
import { computeRecap } from "@/lib/services/report";
import { parseDiscountArray } from "@/lib/serialize";
import { formatIDR, formatDate, formatDiscountSteps, monthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { year?: string; month?: string };
}) {
  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) notFound();

  const now = new Date();
  const year = Number(searchParams.year) || now.getFullYear();
  const month = Number(searchParams.month) || now.getMonth() + 1;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const txns = await prisma.transaction.findMany({
    where: { customerId: customer.id, deletedAt: null, tanggal: { gte: start, lt: end } },
    include: { lines: true, customer: true },
    orderBy: { tanggal: "asc" },
  });

  const recap = computeRecap(txns);
  const bonus = await getCustomerBonusEligibility(customer.id);
  const threshold = bonus.threshold.toNumber();
  const acc = bonus.accumulatedPaidOmzet.toNumber();
  const sisaOmzet = threshold > 0 ? threshold - (acc % threshold) : 0;

  const allYears = await prisma.transaction.findMany({
    where: { customerId: customer.id, deletedAt: null },
    select: { tanggal: true },
  });
  const yearSet = new Set<number>([now.getFullYear(), year]);
  allYears.forEach((t) => yearSet.add(new Date(t.tanggal).getFullYear()));
  const years = Array.from(yearSet).sort((a, b) => b - a);

  const hasPiutang = txns.some((t) => !t.isBonus && t.status === "PIUTANG");
  const pdfQuery = `customerId=${customer.id}&year=${year}&month=${month}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/customers" className="text-lg font-semibold text-brand-700 hover:underline">
            ← Pelanggan
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold">{customer.nama}</h1>
          {customer.deletedAt && (
            <span className="badge bg-red-100 text-red-700">Dihapus</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/customers/${customer.id}/edit`} className="btn-secondary">
            ✏️ Edit Pelanggan
          </Link>
          <Link href={`/transactions/new?customerId=${customer.id}`} className="btn-primary">
            + Buat Bon Baru
          </Link>
        </div>
      </div>

      {/* Profile cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="text-base font-semibold text-slate-600">Diskon LM</div>
          <div className="mt-1 text-xl font-bold">
            {formatDiscountSteps(parseDiscountArray(customer.lmDiscounts))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-base font-semibold text-slate-600">Diskon BR</div>
          <div className="mt-1 text-xl font-bold">
            {formatDiscountSteps(parseDiscountArray(customer.brDiscounts))}
          </div>
        </Card>
        <StatCard label="Batas Bonus" value={threshold > 0 ? formatIDR(threshold) : "—"} icon="🎯" />
        <StatCard
          label="Bonus Tersedia"
          value={String(bonus.bonusesAvailable)}
          accent={bonus.bonusesAvailable > 0 ? "purple" : "slate"}
          icon="🎁"
          hint={threshold > 0 ? `Sisa ${formatIDR(sisaOmzet)} ke bonus berikutnya` : "Program bonus nonaktif"}
        />
      </div>

      {/* Bonus highlight */}
      {bonus.enabled && bonus.bonusesAvailable > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-purple-300 bg-purple-50 p-5">
          <div className="text-xl font-bold text-purple-800">
            🎁 Pelanggan ini punya {bonus.bonusesAvailable} bonus tersedia
          </div>
          <Link href={`/transactions/new?customerId=${customer.id}&bonus=1`} className="btn-primary">
            🎁 Buat Bon Bonus
          </Link>
        </Card>
      )}

      {/* Activity */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold">
            Aktivitas — {monthLabel(month)} {year}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <MonthYearSelector year={year} month={month} years={years} />
            <PdfButton url={`/api/pdf/piutang?${pdfQuery}`} label="PDF Piutang" />
            <PdfButton url={`/api/pdf/transactions?${pdfQuery}`} label="PDF Transaksi" />
            {hasPiutang && (
              <SettleButton
                url="/api/settlements/month"
                label="Lunaskan Bulan Ini"
                title="Lunaskan semua Bon bulan ini?"
                description="Semua Bon Piutang untuk bulan ini akan ditandai Lunas. Bon yang sudah Lunas tidak akan diubah."
                confirmLabel="Ya, Tandai Lunas"
                extraBody={{ customerId: customer.id, year, month }}
                successMessage="Pelunasan bulanan berhasil"
              />
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="table-th">Tanggal</th>
                <th className="table-th">Nomor Bon</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Total</th>
                <th className="table-th text-right">Tgl Lunas</th>
                <th className="table-th text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-lg text-slate-400">
                    Tidak ada aktivitas pada bulan ini.
                  </td>
                </tr>
              )}
              {txns.map((t) => (
                <tr
                  key={t.id}
                  className={`border-b border-slate-100 hover:bg-amber-50/50 ${
                    t.status === "LUNAS" && !t.isBonus ? "bg-emerald-50/50" : ""
                  }`}
                >
                  <td className="table-td">{formatDate(t.tanggal)}</td>
                  <td className="table-td font-semibold">{t.nomorBon}</td>
                  <td className="table-td">
                    <StatusBadge status={t.status} isBonus={t.isBonus} />
                  </td>
                  <td className="table-td text-right font-bold">
                    {formatIDR(t.isBonus ? 0 : t.amountOwed)}
                  </td>
                  <td className="table-td text-right">
                    {t.paymentDate ? formatDate(t.paymentDate) : "—"}
                  </td>
                  <td className="table-td text-right">
                    <Link href={`/transactions/${t.id}`} className="btn-secondary">
                      👁 Lihat
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Monthly summary */}
      <h2 className="text-xl font-bold">Ringkasan Bulan Ini</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Piutang" value={formatIDR(recap.totalOutstandingPiutang)} accent="red" icon="💳" />
        <StatCard label="Total Sudah Dibayar" value={formatIDR(recap.totalPaid)} accent="green" icon="✓" />
        <StatCard label="Omzet Lunas" value={formatIDR(recap.recognizedOmzet)} accent="blue" icon="📈" hint="Tidak termasuk ongkir" />
        <StatCard label="Laba HL" value={formatIDR(recap.recognizedProfit)} accent="blue" icon="💰" />
        <StatCard label="Omzet LM" value={formatIDR(recap.omzetLM)} />
        <StatCard label="Omzet BR" value={formatIDR(recap.omzetBR)} />
      </div>
    </div>
  );
}
