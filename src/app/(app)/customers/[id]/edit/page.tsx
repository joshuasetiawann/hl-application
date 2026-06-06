import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import CustomerForm from "@/components/CustomerForm";
import { parseDiscountArray } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: { id: string };
}) {
  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Pelanggan</h1>
      <CustomerForm
        initial={{
          id: customer.id,
          nama: customer.nama,
          lmDiscounts: parseDiscountArray(customer.lmDiscounts),
          brDiscounts: parseDiscountArray(customer.brDiscounts),
          bonusThreshold: customer.bonusThreshold,
        }}
      />
    </div>
  );
}
