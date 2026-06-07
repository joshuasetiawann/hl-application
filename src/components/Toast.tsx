"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "@/components/icons";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<{
  show: (message: string, kind?: ToastKind) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const STYLES: Record<ToastKind, string> = {
  success: "bg-white text-slate-800 ring-emerald-200",
  error: "bg-white text-slate-800 ring-rose-200",
  info: "bg-white text-slate-800 ring-slate-200",
};
const ICON_WRAP: Record<ToastKind, string> = {
  success: "bg-emerald-50 text-emerald-600",
  error: "bg-rose-50 text-rose-600",
  info: "bg-brand-50 text-brand-600",
};
const ICONS: Record<ToastKind, IconName> = {
  success: "checkCircle",
  error: "alert",
  info: "info",
};

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-center gap-2.5 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-[0.92rem] font-medium shadow-elevated ring-1 ${STYLES[t.kind]}`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ICON_WRAP[t.kind]}`}>
              <Icon name={ICONS[t.kind]} size={17} />
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
