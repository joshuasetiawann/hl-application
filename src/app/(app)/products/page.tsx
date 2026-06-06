import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, TypeBadge } from "@/components/ui";
import { formatIDR } from "@/lib/format";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ tipe: "asc" }, { nama: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produk</h1>
        <Link href="/products/new" className="btn-primary">
          + Tambah Produk
        </Link>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-th">Nama</th>
                <th className="table-th">Tipe</th>
                <th className="table-th text-right">Harga Base / Jual</th>
                <th className="table-th text-right">Harga Modal</th>
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
                  <td className="table-td text-right">{formatIDR(p.hargaBase)}</td>
                  <td className="table-td text-right text-slate-400">
                    {formatIDR(p.hargaModal)}
                  </td>
                  <td className="table-td">
                    <div className="flex justify-end gap-2">
                      <Link href={`/products/${p.id}/edit`} className="btn-secondary py-1">
                        Edit
                      </Link>
                      <DeleteButton
                        url={`/api/products/${p.id}`}
                        confirmText={`Hapus produk "${p.nama}"? Riwayat bon tetap utuh (soft-delete).`}
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
