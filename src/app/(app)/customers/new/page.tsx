import CustomerForm from "@/components/CustomerForm";

export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tambah Pelanggan</h1>
      <CustomerForm />
    </div>
  );
}
