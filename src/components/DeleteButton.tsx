"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/icons";

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
      <button onClick={() => setOpen(true)} className="btn-secondary text-rose-600 hover:border-rose-300 hover:bg-rose-50">
        <Icon name="trash" size={17} /> {label}
      </button>
      <Modal open={open} onClose={() => !loading && setOpen(false)} title={title}>
        <div className="flex gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <Icon name="alert" size={20} />
          </span>
          <p className="text-[0.95rem] leading-relaxed text-slate-600">{confirmText}</p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-secondary" onClick={() => setOpen(false)} disabled={loading}>
            Batal
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Menghapus…" : "Ya, Hapus"}
          </button>
        </div>
      </Modal>
    </>
  );
}
