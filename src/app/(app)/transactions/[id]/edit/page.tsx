import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import TransactionForm from "@/components/TransactionForm";
import { getActiveCustomerOptions, getActiveProductOptions } from "@/lib/options";
import { toDateInputValue } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditTransactionPage({
  params,
}: {
  params: { id: string };
}) {
  const txn = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { lines: true },
  });
  if (!txn || txn.deletedAt) notFound();

  const [customers, products] = await Promise.all([
    getActiveCustomerOptions(),
    getActiveProductOptions(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Bon {txn.nomorBon}</h1>
      <TransactionForm
        customers={customers}
        products={products}
        initial={{
          id: txn.id,
          tanggal: toDateInputValue(txn.tanggal),
          nomorBon: txn.nomorBon,
          customerId: txn.customerId,
          ongkir: txn.ongkir,
          deskripsi: txn.deskripsi,
          isBonus: txn.isBonus,
          bonusUnitsGranted: txn.bonusUnitsGranted,
          lines: txn.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
          })),
        }}
      />
    </div>
  );
}
