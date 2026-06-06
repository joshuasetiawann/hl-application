"use client";

import { type ReactNode } from "react";

/** Accessible, senior-friendly centered modal. */
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
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className={`card w-full ${maxWidth} p-7`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="mb-4 text-2xl font-bold text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}
