"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/icons";

/** One-click demo-data fill, shown on the dashboard only while the DB is empty. */
export default function SeedDemoButton() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function seed() {
    setLoading(true);
    try {
      const res = await apiSend<{ customers: number; products: number; transactions: number }>(
        "/api/admin/seed-demo",
        "POST"
      );
      toast.show(
        `Data contoh dibuat: ${res.customers} pelanggan, ${res.products} produk, ${res.transactions} bon`,
        "success"
      );
      router.refresh();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Gagal mengisi data contoh", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn-primary" onClick={seed} disabled={loading}>
      <Icon name="sparkles" size={17} />
      {loading ? "Mengisi data…" : "Isi Data Contoh"}
    </button>
  );
}
