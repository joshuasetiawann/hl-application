import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { formatIDR, formatDiscountSteps } from "@/lib/format";
import { parseDiscountArray } from "@/lib/serialize";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { nama: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pelanggan</h1>
        <Link href="/customers/new" className="btn-primary">
          + Tambah Pelanggan
        </Link>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-th">Nama</th>
                <th className="table-th">Diskon LM</th>
                <th className="table-th">Diskon BR</th>
                <th className="table-th text-right">Threshold Bonus</th>
                <th className="table-th text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm text-slate-400">
                    Belum ada pelanggan.
                  </td>
                </tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="table-td font-medium">
                    <Link href={`/customers/${c.id}`} className="text-brand-600 hover:underline">
                      {c.nama}
                    </Link>
                  </td>
                  <td className="table-td">
                    {formatDiscountSteps(parseDiscountArray(c.lmDiscounts))}
                  </td>
                  <td className="table-td">
                    {formatDiscountSteps(parseDiscountArray(c.brDiscounts))}
                  </td>
                  <td className="table-td text-right">
                    {c.bonusThreshold > 0 ? formatIDR(c.bonusThreshold) : "—"}
                  </td>
                  <td className="table-td">
                    <div className="flex justify-end gap-2">
                      <Link href={`/customers/${c.id}`} className="btn-secondary py-1">
                        Detail
                      </Link>
                      <Link href={`/customers/${c.id}/edit`} className="btn-secondary py-1">
                        Edit
                      </Link>
                      <DeleteButton
                        url={`/api/customers/${c.id}`}
                        confirmText={`Hapus pelanggan "${c.nama}"? Riwayat transaksi tetap tersimpan (soft-delete).`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
