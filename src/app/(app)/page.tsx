import Link from "next/link";
import { prisma } from "@/lib/db";
import { recapOverall } from "@/lib/services/report";
import { getEligibleCustomers } from "@/lib/services/bonus";
import { calculateRecognizedTotals } from "@/lib/calc";
import { StatCard, Card, StatusBadge } from "@/components/ui";
import PdfButton from "@/components/PdfButton";
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

  const hari = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">Selamat datang di HL 👋</h1>
            <p className="mt-1 text-lg text-brand-50">Hari ini: {hari}</p>
          </div>
          <Link href="/transactions/new" className="btn btn-lg bg-white text-brand-700 hover:bg-brand-50">
            + Buat Bon Baru
          </Link>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/customers/new" className="btn-secondary">👥 Tambah Pelanggan</Link>
        <Link href="/products/new" className="btn-secondary">📦 Tambah Produk</Link>
        <Link href="/reports" className="btn-secondary">📊 Lihat Rekap</Link>
        <Link href="/piutang" className="btn-secondary">💳 Daftar Piutang</Link>
        <PdfButton url="/api/pdf/piutang" label="PDF Piutang" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Piutang"
          value={formatIDR(allTotals.totalOutstandingPiutang.toNumber())}
          accent="red"
          icon="💳"
          hint="Semua bon belum Lunas"
        />
        <StatCard
          label="Sudah Dibayar Bulan Ini"
          value={formatIDR(monthRecap.totalPaid)}
          accent="green"
          icon="✓"
        />
        <StatCard
          label="Omzet Lunas Bulan Ini"
          value={formatIDR(monthRecap.recognizedOmzet)}
          accent="blue"
          icon="📈"
        />
        <StatCard
          label="Laba HL Bulan Ini"
          value={formatIDR(monthRecap.recognizedProfit)}
          accent="blue"
          icon="💰"
        />
        <StatCard
          label="Bonus Tersedia"
          value={String(totalBonus)}
          accent="purple"
          icon="🎁"
          hint={`${eligible.length} pelanggan`}
        />
      </div>

      {/* LM vs BR summary (this month, recognized) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Omzet LM (bulan ini)" value={formatIDR(monthRecap.omzetLM)} />
        <StatCard label="Omzet BR (bulan ini)" value={formatIDR(monthRecap.omzetBR)} />
        <StatCard label="Laba HL LM" value={formatIDR(monthRecap.profitLM)} />
        <StatCard label="Laba HL BR" value={formatIDR(monthRecap.profitBR)} />
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
