import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, StatCard, StatusBadge } from "@/components/ui";
import MonthYearSelector from "@/components/MonthYearSelector";
import SettleButton from "@/components/SettleButton";
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
    where: {
      customerId: customer.id,
      deletedAt: null,
      tanggal: { gte: start, lt: end },
    },
    include: { lines: true, customer: true },
    orderBy: { tanggal: "asc" },
  });

  const recap = computeRecap(txns);
  const bonus = await getCustomerBonusEligibility(customer.id);

  // Build a sensible year list (current year +/- a few, plus any txn years).
  const allYears = await prisma.transaction.findMany({
    where: { customerId: customer.id, deletedAt: null },
    select: { tanggal: true },
  });
  const yearSet = new Set<number>([now.getFullYear(), year]);
  allYears.forEach((t) => yearSet.add(new Date(t.tanggal).getFullYear()));
  const years = Array.from(yearSet).sort((a, b) => b - a);

  const hasPiutang = txns.some(
    (t) => !t.isBonus && t.status === "PIUTANG"
  );

  const pdfQuery = `customerId=${customer.id}&year=${year}&month=${month}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/customers" className="text-sm text-brand-600">
            ← Pelanggan
          </Link>
          <h1 className="text-2xl font-bold">{customer.nama}</h1>
          {customer.deletedAt && (
            <span className="badge bg-red-100 text-red-700">Dihapus</span>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/customers/${customer.id}/edit`} className="btn-secondary">
            Edit Pelanggan
          </Link>
          <Link
            href={`/transactions/new?customerId=${customer.id}`}
            className="btn-primary"
          >
            + Buat Bon
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Diskon</h3>
          <p className="text-sm">
            <span className="font-medium">Diskon LM:</span>{" "}
            {formatDiscountSteps(parseDiscountArray(customer.lmDiscounts))}
          </p>
          <p className="text-sm">
            <span className="font-medium">Diskon BR:</span>{" "}
            {formatDiscountSteps(parseDiscountArray(customer.brDiscounts))}
          </p>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-2 font-semibold">Status Bonus</h3>
          {!bonus.enabled ? (
            <p className="text-sm text-slate-500">
              Program bonus nonaktif (threshold 0).
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Threshold</div>
                <div className="font-semibold">{formatIDR(bonus.threshold.toNumber())}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Akumulasi Omzet Lunas</div>
                <div className="font-semibold">
                  {formatIDR(bonus.accumulatedPaidOmzet.toNumber())}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Bonus Tersedia</div>
                <div
                  className={`font-semibold ${
                    bonus.bonusesAvailable > 0 ? "text-purple-700" : ""
                  }`}
                >
                  {bonus.bonusesAvailable}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Carry Over</div>
                <div className="font-semibold">{formatIDR(bonus.carryOver.toNumber())}</div>
              </div>
            </div>
          )}
          {bonus.enabled && bonus.bonusesAvailable > 0 && (
            <div className="mt-3 rounded-md bg-purple-50 px-3 py-2 text-sm text-purple-700">
              🎁 Pelanggan ini memiliki <b>{bonus.bonusesAvailable}</b> bonus tersedia.{" "}
              <Link
                href={`/transactions/new?customerId=${customer.id}&bonus=1`}
                className="font-medium underline"
              >
                Buat bonus bon
              </Link>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">
            Aktivitas — {monthLabel(month)} {year}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <MonthYearSelector year={year} month={month} years={years} />
            <a
              href={`/api/pdf/piutang?${pdfQuery}`}
              target="_blank"
              className="btn-secondary"
            >
              PDF Piutang
            </a>
            <a
              href={`/api/pdf/transactions?${pdfQuery}`}
              target="_blank"
              className="btn-secondary"
            >
              PDF Transaksi
            </a>
            {hasPiutang && (
              <SettleButton
                url="/api/settlements/month"
                label="Sudah Lunas (Bulan Ini)"
                extraBody={{ customerId: customer.id, year, month }}
                successMessage="Pelunasan bulanan berhasil"
              />
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-th">Tanggal</th>
                <th className="table-th">Nomor Bon</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Tagihan</th>
                <th className="table-th text-right">Tgl Lunas</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm text-slate-400">
                    Tidak ada aktivitas pada bulan ini.
                  </td>
                </tr>
              )}
              {txns.map((t) => (
                <tr
                  key={t.id}
                  className={`border-b border-slate-50 hover:bg-slate-50 ${
                    t.status === "LUNAS" && !t.isBonus ? "bg-emerald-50/40" : ""
                  }`}
                >
                  <td className="table-td">{formatDate(t.tanggal)}</td>
                  <td className="table-td">
                    <Link href={`/transactions/${t.id}`} className="text-brand-600 hover:underline">
                      {t.nomorBon}
                    </Link>
                  </td>
                  <td className="table-td">
                    <StatusBadge status={t.status} isBonus={t.isBonus} />
                  </td>
                  <td className="table-td text-right">
                    {formatIDR(t.isBonus ? 0 : t.amountOwed)}
                  </td>
                  <td className="table-td text-right">
                    {t.paymentDate ? formatDate(t.paymentDate) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Piutang (bulan ini)"
          value={formatIDR(recap.totalOutstandingPiutang)}
          accent="red"
        />
        <StatCard
          label="Total Sudah Dibayar"
          value={formatIDR(recap.totalPaid)}
          accent="green"
        />
        <StatCard
          label="Total Omzet (Lunas)"
          value={formatIDR(recap.recognizedOmzet)}
          accent="blue"
          hint="Tidak termasuk ongkir"
        />
        <StatCard label="Total Laba HL" value={formatIDR(recap.recognizedProfit)} accent="blue" />
        <StatCard label="Omzet LM" value={formatIDR(recap.omzetLM)} />
        <StatCard label="Omzet BR" value={formatIDR(recap.omzetBR)} />
        <StatCard
          label="Combined Total (Omzet LM + BR)"
          value={formatIDR(recap.omzetLM + recap.omzetBR)}
        />
      </div>
    </div>
  );
}
