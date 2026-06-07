import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, StatusBadge, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import MonthYearSelector from "@/components/MonthYearSelector";
import FilterSelect from "@/components/FilterSelect";
import SearchField from "@/components/SearchField";
import PdfButton from "@/components/PdfButton";
import SettleButton from "@/components/SettleButton";
import { formatIDR, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "", label: "Semua" },
  { key: "PIUTANG", label: "Piutang" },
  { key: "LUNAS", label: "Lunas" },
  { key: "BONUS", label: "Bonus" },
];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { status?: string; year?: string; month?: string; customerId?: string; q?: string };
}) {
  const now = new Date();
  const status = searchParams.status || "";
  const year = Number(searchParams.year) || now.getFullYear();
  const month = Number(searchParams.month) || 0;
  const customerId = searchParams.customerId || "";
  const q = searchParams.q || "";

  const range =
    month > 0
      ? { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) }
      : { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };

  const txns = await prisma.transaction.findMany({
    where: {
      deletedAt: null,
      tanggal: range,
      ...(customerId ? { customerId } : {}),
      ...(q ? { nomorBon: { contains: q } } : {}),
      ...(status === "PIUTANG" || status === "LUNAS"
        ? { status, isBonus: false }
        : status === "BONUS"
          ? { isBonus: true }
          : {}),
    },
    include: { customer: true },
    orderBy: { tanggal: "desc" },
  });

  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });
  const txYears = await prisma.transaction.findMany({ where: { deletedAt: null }, select: { tanggal: true } });
  const yearSet = new Set<number>([now.getFullYear(), year]);
  txYears.forEach((t) => yearSet.add(new Date(t.tanggal).getFullYear()));
  const years = Array.from(yearSet).sort((a, b) => b - a);

  function tabHref(key: string) {
    const p = new URLSearchParams();
    if (key) p.set("status", key);
    if (month) p.set("month", String(month));
    p.set("year", String(year));
    if (customerId) p.set("customerId", customerId);
    if (q) p.set("q", q);
    return `/transactions?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Bon"
        subtitle="Semua transaksi penjualan, piutang, pelunasan, dan bonus."
        actions={
          <Link href="/transactions/new" className="btn-primary">
            <Icon name="plus" size={18} /> Buat Bon Baru
          </Link>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <MonthYearSelector year={year} month={month} years={years} includeAllMonths />
          <FilterSelect
            paramKey="customerId"
            value={customerId}
            allLabel="Semua Pelanggan"
            options={customers.map((c) => ({ value: c.id, label: c.nama }))}
          />
          <SearchField paramKey="q" placeholder="Cari Nomor Bon..." />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              className={`rounded-lg px-3.5 py-2 text-[0.88rem] font-semibold transition-colors ${
                status === t.key
                  ? "bg-brand-700 text-white shadow-card"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        {txns.length === 0 ? (
          <EmptyState
            title="Belum ada bon"
            message="Belum ada bon untuk filter ini. Mulai dengan membuat bon baru."
            action={<Link href="/transactions/new" className="btn-primary">+ Buat Bon Baru</Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem]">
              <thead>
                <tr className="border-b border-slate-200/70">
                  <th className="table-th">Tanggal</th>
                  <th className="table-th">Nomor Bon</th>
                  <th className="table-th">Pelanggan</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Omzet</th>
                  <th className="table-th text-right">Ongkir</th>
                  <th className="table-th text-right">Total Tagihan</th>
                  <th className="table-th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr
                    key={t.id}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/70 ${
                      t.status === "LUNAS" && !t.isBonus ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    <td className="table-td whitespace-nowrap text-slate-500">{formatDate(t.tanggal)}</td>
                    <td className="table-td">
                      <Link href={`/transactions/${t.id}`} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                        {t.nomorBon}
                      </Link>
                    </td>
                    <td className="table-td">{t.customer.nama}</td>
                    <td className="table-td">
                      <StatusBadge status={t.status} isBonus={t.isBonus} />
                    </td>
                    <td className="table-td num">{formatIDR(t.isBonus ? 0 : t.omzetTotal)}</td>
                    <td className="table-td num text-slate-500">{formatIDR(t.ongkir)}</td>
                    <td className="table-td num font-semibold text-slate-900">{formatIDR(t.isBonus ? 0 : t.amountOwed)}</td>
                    <td className="table-td">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href={`/transactions/${t.id}`} className="btn-secondary btn-sm"><Icon name="eye" size={16} /> Lihat</Link>
                        {!t.isBonus && t.status === "PIUTANG" && (
                          <SettleButton
                            url={`/api/transactions/${t.id}/settle`}
                            label="Lunas"
                            size="btn-sm"
                            description={`Tandai bon ${t.nomorBon} sebagai sudah lunas.`}
                            successMessage="Bon berhasil ditandai Lunas"
                          />
                        )}
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
