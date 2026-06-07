"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/icons";

/** Accessible, premium centered modal with backdrop blur. */
export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose?: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`card w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-b-none rounded-t-2xl p-6 shadow-elevated sm:rounded-2xl sm:p-7`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="-mr-1.5 -mt-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Tutup"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
