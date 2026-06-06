"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client";

export default function DeleteButton({
  url,
  confirmText,
  label = "Hapus",
  redirectTo,
}: {
  url: string;
  confirmText: string;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (!confirm(confirmText)) return;
    setLoading(true);
    try {
      await apiSend(url, "DELETE");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={onClick} className="btn-danger py-1" disabled={loading}>
      {loading ? "..." : label}
    </button>
  );
}
