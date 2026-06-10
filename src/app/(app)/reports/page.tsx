import { prisma } from "@/lib/db";
import { Card, StatCard } from "@/components/ui";
import MonthYearSelector from "@/components/MonthYearSelector";
import FilterSelect from "@/components/FilterSelect";
import PdfButton from "@/components/PdfButton";
import { recapOverall, recapPerCustomer } from "@/lib/services/report";
import { formatIDR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; customerId?: string };
}) {
  const now = new Date();
  const year = Number(searchParams.year) || now.getFullYear();
  const month = Number(searchParams.month) || 0; // 0 = whole year
  const customerId = searchParams.customerId || "";

  const filters = { year, month: month || undefined, customerId: customerId || undefined };
  const overall = await recapOverall(filters);
  const perCustomer = await recapPerCustomer(filters);

  const txYears = await prisma.transaction.findMany({
    where: { deletedAt: null },
    select: { tanggal: true },
  });
  const yearSet = new Set<number>([now.getFullYear(), year]);
  txYears.forEach((t) => yearSet.add(new Date(t.tanggal).getFullYear()));
  const years = Array.from(yearSet).sort((a, b) => b - a);

  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });

  const pdfBase = `year=${year}${month ? `&month=${month}` : ""}${customerId ? `&customerId=${customerId}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Rekap / Laporan</h1>
        <div className="flex flex-wrap items-center gap-2">
          <MonthYearSelector year={year} month={month} years={years} includeAllMonths />
          <FilterSelect
            paramKey="customerId"
            value={customerId}
            allLabel="Semua Pelanggan"
            options={customers.map((c) => ({ value: c.id, label: c.nama }))}
          />
          <PdfButton url={`/api/pdf/recap?type=overall&${pdfBase}`} label="PDF Keseluruhan" />
          <PdfButton url={`/api/pdf/recap?type=customer&${pdfBase}`} label="PDF Per Pelanggan" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Rekap Keseluruhan</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Omzet (Lunas)" value={formatIDR(overall.recognizedOmzet)} accent="blue" />
          <StatCard label="Total Laba HL (Lunas)" value={formatIDR(overall.recognizedProfit)} accent="blue" />
          <StatCard label="Total Sudah Dibayar" value={formatIDR(overall.totalPaid)} accent="green" />
          <StatCard label="Total Piutang Outstanding" value={formatIDR(overall.totalOutstandingPiutang)} accent="red" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Rekap per Tipe Produk (LM / BR)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Omzet LM" value={formatIDR(overall.omzetLM)} />
          <StatCard label="Laba HL LM" value={formatIDR(overall.profitLM)} />
          <StatCard label="Omzet BR" value={formatIDR(overall.omzetBR)} />
          <StatCard label="Laba HL BR" value={formatIDR(overall.profitBR)} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Rekap per Pelanggan</h2>
        <Card>
          <div className="table-wrap">
            <table className="w-full min-w-[48rem]">
              <thead>
                <tr className="border-b border-slate-200/70">
                  <th className="table-th">Pelanggan</th>
                  <th className="table-th text-right">Omzet (Lunas)</th>
                  <th className="table-th text-right">Laba HL</th>
                  <th className="table-th text-right">Omzet LM</th>
                  <th className="table-th text-right">Omzet BR</th>
                  <th className="table-th text-right">Sudah Dibayar</th>
                  <th className="table-th text-right">Piutang</th>
                </tr>
              </thead>
              <tbody>
                {perCustomer.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-sm text-slate-400">
                      Tidak ada data pada periode ini.
                    </td>
                  </tr>
                )}
                {perCustomer.map((r) => (
                  <tr key={r.customerId} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="table-td font-medium">{r.customerName}</td>
                    <td className="table-td text-right">{formatIDR(r.recognizedOmzet)}</td>
                    <td className="table-td text-right">{formatIDR(r.recognizedProfit)}</td>
                    <td className="table-td text-right">{formatIDR(r.omzetLM)}</td>
                    <td className="table-td text-right">{formatIDR(r.omzetBR)}</td>
                    <td className="table-td text-right">{formatIDR(r.totalPaid)}</td>
                    <td className="table-td text-right">{formatIDR(r.totalOutstandingPiutang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <p className="text-xs text-slate-400">
        Transaksi bonus dikecualikan dari seluruh total omzet/laba/piutang. Mata uang IDR, tanpa PPN.
      </p>
    </div>
  );
}
