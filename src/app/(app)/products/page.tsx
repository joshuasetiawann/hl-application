import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, TypeBadge, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import SearchField from "@/components/SearchField";
import FilterSelect from "@/components/FilterSelect";
import { formatIDR } from "@/lib/format";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; tipe?: string };
}) {
  const q = searchParams.q || "";
  const tipe = searchParams.tipe || "";
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(q ? { nama: { contains: q } } : {}),
      ...(tipe === "LM" || tipe === "BR" ? { tipe } : {}),
    },
    orderBy: [{ tipe: "asc" }, { nama: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        subtitle="Daftar produk LM & BR beserta harga jual dan harga modal."
        actions={
          <Link href="/products/new" className="btn-primary">
            <Icon name="plus" size={18} /> Tambah Produk
          </Link>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[16rem] flex-1">
            <SearchField paramKey="q" placeholder="Cari nama produk..." />
          </div>
          <FilterSelect
            paramKey="tipe"
            value={tipe}
            allLabel="Semua Tipe"
            options={[
              { value: "LM", label: "LM" },
              { value: "BR", label: "BR" },
            ]}
          />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr className="border-b border-slate-200/70">
                <th className="table-th">Nama</th>
                <th className="table-th">Tipe</th>
                <th className="table-th text-right">Harga Base / Jual</th>
                <th className="table-th text-right">Harga Modal (Internal)</th>
                <th className="table-th text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[0.9rem] text-slate-400">
                    Belum ada produk.
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="table-td font-semibold text-slate-900">{p.nama}</td>
                  <td className="table-td">
                    <TypeBadge tipe={p.tipe} />
                  </td>
                  <td className="table-td num font-semibold text-slate-900">{formatIDR(p.hargaBase)}</td>
                  <td className="table-td num">
                    <span className="text-slate-600">{formatIDR(p.hargaModal)}</span>
                    <span className="ml-2 badge-neutral">Internal</span>
                  </td>
                  <td className="table-td">
                    <div className="flex justify-end gap-2">
                      <Link href={`/products/${p.id}/edit`} className="btn-secondary btn-sm">
                        <Icon name="edit" size={16} /> Edit
                      </Link>
                      <DeleteButton
                        url={`/api/products/${p.id}`}
                        title="Hapus Produk?"
                        confirmText="Produk akan disembunyikan dari Bon baru, tetapi riwayat Bon lama tetap aman."
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-[0.8rem] text-slate-400">
          Harga Modal hanya dipakai untuk perhitungan Laba HL (internal).
        </p>
      </Card>
    </div>
  );
}
