"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

type State = "idle" | "loading" | "success" | "error";

/**
 * Downloads a PDF from `url` with clear UI states:
 * idle → "Menyiapkan PDF..." → success toast / error toast.
 * Opens the generated PDF in a new tab on success.
 */
export default function PdfButton({
  url,
  label = "Download PDF",
  variant = "secondary",
}: {
  url: string;
  label?: string;
  variant?: "secondary" | "primary";
}) {
  const toast = useToast();
  const [state, setState] = useState<State>("idle");

  async function onClick() {
    setState("loading");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Gagal (${res.status})`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      window.open(objUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
      setState("success");
      toast.show("PDF berhasil dibuat", "success");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      toast.show("PDF gagal dibuat, coba lagi.", "error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  const base = variant === "primary" ? "btn-primary" : "btn-secondary";
  return (
    <button onClick={onClick} className={base} disabled={state === "loading"} aria-busy={state === "loading"}>
      {state === "loading" && (
        <>
          <Spinner /> Menyiapkan PDF...
        </>
      )}
      {state === "success" && <>✓ PDF siap</>}
      {state === "error" && <>⚠ Coba lagi</>}
      {state === "idle" && <>🖨 {label}</>}
    </button>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}
