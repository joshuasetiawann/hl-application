import Link from "next/link";
import { prisma } from "@/lib/db";
import { recapOverall } from "@/lib/services/report";
import { getEligibleCustomers } from "@/lib/services/bonus";
import { calculateRecognizedTotals } from "@/lib/calc";
import { StatCard, Card, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import PdfButton from "@/components/PdfButton";
import SeedDemoButton from "@/components/SeedDemoButton";
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
  const totalBonus = eligible.reduce((s, c) => s + c.bonusesAvailable, 0);

  const recentBons = await prisma.transaction.findMany({
    where: { deletedAt: null },
    include: { customer: true },
    orderBy: { tanggal: "desc" },
    take: 8,
  });

  // Brand-new database (no customers at all) → offer one-click demo data.
  const isEmpty = recentBons.length === 0 && (await prisma.customer.count()) === 0;

  const hari = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const periode = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Executive header */}
      <Card className="relative overflow-hidden bg-brand-900 p-6 text-white sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(500px 240px at 100% 0%, rgba(189,139,45,0.22), transparent 60%), radial-gradient(600px 300px at 0% 120%, rgba(255,255,255,0.08), transparent 55%)",
          }}
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[0.78rem] font-medium uppercase tracking-[0.18em] text-white/60">
              {hari}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ringkasan Bisnis HL
            </h1>
            <p className="mt-1 text-[0.95rem] text-white/70">
              Periode berjalan: {periode}
            </p>
          </div>
          <Link
            href="/transactions/new"
            className="btn btn-lg bg-white text-brand-800 shadow-elevated hover:bg-brand-50"
          >
            <Icon name="plus" size={19} /> Buat Bon Baru
          </Link>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/customers/new" className="btn-secondary btn-sm">
          <Icon name="users" size={16} /> Tambah Pelanggan
        </Link>
        <Link href="/products/new" className="btn-secondary btn-sm">
          <Icon name="package" size={16} /> Tambah Produk
        </Link>
        <Link href="/reports" className="btn-secondary btn-sm">
          <Icon name="chart" size={16} /> Lihat Rekap
        </Link>
        <Link href="/piutang" className="btn-secondary btn-sm">
          <Icon name="wallet" size={16} /> Daftar Piutang
        </Link>
        <PdfButton url="/api/pdf/piutang" label="PDF Piutang" />
      </div>

      {/* Empty database → one-click starter data */}
      {isEmpty && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-dashed p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Belum ada data penjualan
            </h2>
            <p className="mt-1 max-w-xl text-[0.92rem] text-slate-500">
              Mulai dengan menambah pelanggan & produk sendiri, atau isi dulu dengan
              data contoh (2 pelanggan, 4 produk, 6 bon) untuk melihat cara kerja
              aplikasi. Data contoh bisa dihapus kapan saja.
            </p>
          </div>
          <SeedDemoButton />
        </Card>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Piutang"
          value={formatIDR(allTotals.totalOutstandingPiutang.toNumber())}
          accent="red"
          icon="wallet"
          hint="Semua bon belum Lunas"
        />
        <StatCard
          label="Dibayar Bulan Ini"
          value={formatIDR(monthRecap.totalPaid)}
          accent="green"
          icon="checkCircle"
        />
        <StatCard
          label="Omzet Lunas Bln Ini"
          value={formatIDR(monthRecap.recognizedOmzet)}
          accent="blue"
          icon="trendingUp"
        />
        <StatCard
          label="Laba HL Bulan Ini"
          value={formatIDR(monthRecap.recognizedProfit)}
          accent="blue"
          icon="coins"
        />
        <StatCard
          label="Bonus Tersedia"
          value={String(totalBonus)}
          accent="gold"
          icon="gift"
          hint={`${eligible.length} pelanggan`}
        />
      </div>

      {/* LM vs BR (recognized, this month) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Omzet LM (bln ini)" value={formatIDR(monthRecap.omzetLM)} />
        <StatCard label="Omzet BR (bln ini)" value={formatIDR(monthRecap.omzetBR)} />
        <StatCard label="Laba HL LM" value={formatIDR(monthRecap.profitLM)} />
        <StatCard label="Laba HL BR" value={formatIDR(monthRecap.profitBR)} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent bons */}
        <Card className="lg:col-span-2">
          <div className="panel-head">
            <h2 className="text-base font-semibold text-slate-900">Bon Terbaru</h2>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1 text-[0.85rem] font-semibold text-brand-700 hover:text-brand-800"
            >
              Lihat semua <Icon name="chevronRight" size={15} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="w-full min-w-[34rem]">
              <thead>
                <tr className="border-b border-slate-200/70">
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
                    <td colSpan={5} className="px-4 py-8 text-center text-[0.9rem] text-slate-400">
                      Belum ada bon.
                    </td>
                  </tr>
                )}
                {recentBons.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="table-td whitespace-nowrap text-slate-500">{formatDate(t.tanggal)}</td>
                    <td className="table-td">
                      <Link
                        href={`/transactions/${t.id}`}
                        className="font-semibold text-brand-700 hover:text-brand-800 hover:underline"
                      >
                        {t.nomorBon}
                      </Link>
                    </td>
                    <td className="table-td">{t.customer.nama}</td>
                    <td className="table-td">
                      <StatusBadge status={t.status} isBonus={t.isBonus} />
                    </td>
                    <td className="table-td num font-semibold text-slate-900">
                      {formatIDR(t.isBonus ? 0 : t.amountOwed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bonus eligibility — business alert */}
        <Card>
          <div className="panel-head">
            <h2 className="text-base font-semibold text-slate-900">Eligible Bonus</h2>
            <span className="badge-gold">
              <Icon name="gift" size={13} strokeWidth={2} /> {totalBonus}
            </span>
          </div>
          <div className="p-4 sm:p-5">
            {eligible.length === 0 ? (
              <p className="py-4 text-center text-[0.9rem] text-slate-400">
                Belum ada pelanggan yang eligible bonus.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {eligible.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                  >
                    <Link
                      href={`/customers/${c.id}`}
                      className="truncate text-[0.92rem] font-medium text-slate-700 hover:text-brand-700"
                    >
                      {c.nama}
                    </Link>
                    <span className="badge-gold shrink-0">{c.bonusesAvailable} bonus</span>
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
