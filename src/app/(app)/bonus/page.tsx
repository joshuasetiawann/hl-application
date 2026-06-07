import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCustomerBonusEligibility } from "@/lib/services/bonus";
import { formatDate, formatIDR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BonusPage() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null, bonusThreshold: { gt: 0 } },
    orderBy: { nama: "asc" },
    select: { id: true, nama: true },
  });

  const rows = await Promise.all(
    customers.map(async (c) => {
      const e = await getCustomerBonusEligibility(c.id);
      const acc = e.accumulatedPaidOmzet.toNumber();
      const threshold = e.threshold.toNumber();
      const sisa = threshold > 0 ? threshold - (acc % threshold) : 0;
      return { id: c.id, nama: c.nama, acc, threshold, available: e.bonusesAvailable, sisa };
    })
  );
  const withBonus = rows.filter((r) => r.available > 0);

  const bonusBons = await prisma.transaction.findMany({
    where: { deletedAt: null, isBonus: true },
    include: { customer: true, lines: true },
    orderBy: { tanggal: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.7rem]">
          Bonus Pelanggan
        </h1>
        <p className="mt-1 max-w-2xl text-[0.95rem] text-slate-500">
          Bonus dihitung dari omzet yang sudah Lunas. Bon Bonus tidak menambah omzet, piutang, atau laba.
        </p>
      </div>

      {/* Bonus tersedia */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Bonus Tersedia</h2>
        {withBonus.length === 0 ? (
          <Card>
            <EmptyState title="Belum ada bonus" message="Belum ada pelanggan yang mencapai batas bonus." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {withBonus.map((r) => (
              <Card key={r.id} className="border-gold-200 bg-gold-50/50 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/customers/${r.id}`} className="truncate text-[1.05rem] font-bold text-gold-800 hover:underline">
                    {r.nama}
                  </Link>
                  <span className="badge-bonus shrink-0">{r.available} bonus</span>
                </div>
                <dl className="mt-4 space-y-2 text-[0.92rem]">
                  <Row label="Omzet Lunas Terkumpul" value={formatIDR(r.acc)} />
                  <Row label="Batas Bonus" value={formatIDR(r.threshold)} />
                  <Row label="Sisa Omzet ke bonus berikutnya" value={formatIDR(r.sisa)} />
                </dl>
                <Link
                  href={`/transactions/new?customerId=${r.id}&bonus=1`}
                  className="btn-gold btn-block mt-4"
                >
                  <Icon name="gift" size={17} /> Buat Bon Bonus
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* All customers progress */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Progress Semua Pelanggan</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/70">
                  <th className="table-th">Pelanggan</th>
                  <th className="table-th text-right">Omzet Lunas</th>
                  <th className="table-th text-right">Batas Bonus</th>
                  <th className="table-th text-right">Bonus Tersedia</th>
                  <th className="table-th text-right">Sisa Omzet</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="table-td font-semibold">{r.nama}</td>
                    <td className="table-td text-right">{formatIDR(r.acc)}</td>
                    <td className="table-td text-right">{formatIDR(r.threshold)}</td>
                    <td className="table-td text-right">
                      {r.available > 0 ? (
                        <span className="badge-bonus">{r.available}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="table-td text-right">{formatIDR(r.sisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Riwayat bonus */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Riwayat Bonus</h2>
        <Card>
          {bonusBons.length === 0 ? (
            <EmptyState title="Belum ada bonus bon" message="Bon bonus yang dibuat akan muncul di sini." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/70">
                    <th className="table-th">Tanggal</th>
                    <th className="table-th">Nomor Bon</th>
                    <th className="table-th">Pelanggan</th>
                    <th className="table-th text-right">Jumlah Bonus Dipakai</th>
                    <th className="table-th">Produk Bonus</th>
                    <th className="table-th text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {bonusBons.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="table-td whitespace-nowrap text-slate-500">{formatDate(t.tanggal)}</td>
                      <td className="table-td font-semibold text-slate-900">{t.nomorBon}</td>
                      <td className="table-td">{t.customer.nama}</td>
                      <td className="table-td num font-semibold">{t.bonusUnitsGranted}</td>
                      <td className="table-td">
                        {t.lines.map((l) => `${l.productNameSnapshot} ×${l.quantity}`).join(", ")}
                      </td>
                      <td className="table-td text-right">
                        <Link href={`/transactions/${t.id}`} className="btn-secondary btn-sm">
                          <Icon name="eye" size={16} /> Lihat
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-bold text-slate-900">{value}</dd>
    </div>
  );
}
