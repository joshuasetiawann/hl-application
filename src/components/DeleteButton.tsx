"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

export default function DeleteButton({
  url,
  confirmText,
  title = "Hapus Data?",
  label = "Hapus",
  redirectTo,
}: {
  url: string;
  confirmText: string;
  title?: string;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onConfirm() {
    setLoading(true);
    try {
      await apiSend(url, "DELETE");
      toast.show("Data berhasil dihapus", "success");
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Gagal menghapus", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-danger">
        🗑 {label}
      </button>
      <Modal open={open} onClose={() => !loading && setOpen(false)} title={title}>
        <p className="text-lg text-slate-700">{confirmText}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setOpen(false)} disabled={loading}>
            Batal
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </Modal>
    </>
  );
}
