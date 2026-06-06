import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ProductForm from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Produk</h1>
      <ProductForm
        initial={{
          id: product.id,
          nama: product.nama,
          tipe: product.tipe as "LM" | "BR",
          hargaBase: product.hargaBase,
          hargaModal: product.hargaModal,
        }}
      />
    </div>
  );
}
