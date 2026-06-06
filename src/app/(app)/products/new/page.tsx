import ProductForm from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tambah Produk</h1>
      <ProductForm />
    </div>
  );
}
