import TransactionForm from "@/components/TransactionForm";
import { getActiveCustomerOptions, getActiveProductOptions } from "@/lib/options";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: { customerId?: string; bonus?: string };
}) {
  const [customers, products] = await Promise.all([
    getActiveCustomerOptions(),
    getActiveProductOptions(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buat Bon</h1>
      <TransactionForm
        customers={customers}
        products={products}
        defaultCustomerId={searchParams.customerId}
        defaultBonus={searchParams.bonus === "1"}
      />
    </div>
  );
}
