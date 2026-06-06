import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, TypeBadge } from "@/components/ui";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Produk</h1>
        <Link href="/products/new" className="btn-primary btn-lg">
          + Tambah Produk
        </Link>
      </div>

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
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
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
                  <td colSpan={5} className="p-6 text-center text-sm text-slate-400">
                    Belum ada produk.
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="table-td font-medium">{p.nama}</td>
                  <td className="table-td">
                    <TypeBadge tipe={p.tipe} />
                  </td>
                  <td className="table-td text-right font-semibold">{formatIDR(p.hargaBase)}</td>
                  <td className="table-td text-right">
                    <span className="text-slate-600">{formatIDR(p.hargaModal)}</span>
                    <span className="ml-2 badge bg-slate-100 text-slate-500">Internal</span>
                  </td>
                  <td className="table-td">
                    <div className="flex justify-end gap-2">
                      <Link href={`/products/${p.id}/edit`} className="btn-secondary">
                        ✏️ Edit
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
        <p className="px-4 py-2 text-xs text-slate-400">
          Harga Modal hanya dipakai untuk perhitungan Laba HL (internal).
        </p>
      </Card>
    </div>
  );
}
