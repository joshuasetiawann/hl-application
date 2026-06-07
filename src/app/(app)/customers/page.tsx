import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import SearchField from "@/components/SearchField";
import FilterSelect from "@/components/FilterSelect";
import DeleteButton from "@/components/DeleteButton";
import { getCustomerBonusEligibility } from "@/lib/services/bonus";
import { formatIDR, formatDiscountSteps } from "@/lib/format";
import { parseDiscountArray } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; filter?: string };
}) {
  const q = searchParams.q || "";
  const filter = searchParams.filter || "aktif"; // aktif | dihapus | semua

  const where: Record<string, unknown> = {};
  if (filter === "aktif") where.deletedAt = null;
  else if (filter === "dihapus") where.deletedAt = { not: null };
  if (q) where.nama = { contains: q };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { nama: "asc" },
  });

  const rows = await Promise.all(
    customers.map(async (c) => {
      const e = await getCustomerBonusEligibility(c.id);
      return { ...c, bonusesAvailable: e.bonusesAvailable };
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pelanggan"
        subtitle="Kelola pelanggan beserta diskon bertingkat LM & BR."
        actions={
          <Link href="/customers/new" className="btn-primary">
            <Icon name="plus" size={18} /> Tambah Pelanggan
          </Link>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[16rem] flex-1">
            <SearchField paramKey="q" placeholder="Cari nama pelanggan..." />
          </div>
          <FilterSelect
            paramKey="filter"
            value={filter}
            options={[
              { value: "aktif", label: "Aktif" },
              { value: "dihapus", label: "Dihapus" },
              { value: "semua", label: "Semua" },
            ]}
          />
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada pelanggan"
            message="Tambahkan pelanggan pertama Anda untuk mulai membuat Bon."
            action={<Link href="/customers/new" className="btn-primary">+ Tambah Pelanggan</Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem]">
              <thead>
                <tr className="border-b border-slate-200/70">
                  <th className="table-th">Nama Pelanggan</th>
                  <th className="table-th">Diskon LM</th>
                  <th className="table-th">Diskon BR</th>
                  <th className="table-th text-right">Batas Bonus</th>
                  <th className="table-th text-right">Bonus Tersedia</th>
                  <th className="table-th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="table-td font-semibold">
                      <Link href={`/customers/${c.id}`} className="text-brand-700 hover:text-brand-800 hover:underline">
                        {c.nama}
                      </Link>
                      {c.deletedAt && <span className="ml-2 badge-neutral">Dihapus</span>}
                    </td>
                    <td className="table-td">{formatDiscountSteps(parseDiscountArray(c.lmDiscounts))}</td>
                    <td className="table-td">{formatDiscountSteps(parseDiscountArray(c.brDiscounts))}</td>
                    <td className="table-td num">
                      {c.bonusThreshold > 0 ? formatIDR(c.bonusThreshold) : "—"}
                    </td>
                    <td className="table-td text-right">
                      {c.bonusesAvailable > 0 ? (
                        <span className="badge-bonus">{c.bonusesAvailable}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="table-td">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href={`/customers/${c.id}`} className="btn-secondary btn-sm"><Icon name="eye" size={16} /> Lihat</Link>
                        <Link href={`/customers/${c.id}/edit`} className="btn-secondary btn-sm"><Icon name="edit" size={16} /> Edit</Link>
                        {!c.deletedAt && (
                          <DeleteButton
                            url={`/api/customers/${c.id}`}
                            title="Hapus Pelanggan?"
                            confirmText="Pelanggan akan disembunyikan dari pilihan Bon baru, tetapi riwayat transaksi tetap aman."
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
