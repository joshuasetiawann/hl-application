import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/bootstrap";
import Sidebar from "@/components/Sidebar";
import ToastProvider from "@/components/Toast";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Best-effort: opening any authenticated page self-provisions a fresh/empty
  // database (schema + admin + demo data) so the dashboard is never blank.
  // Memoized per lambda, so it's a no-op after the first call. Never throws here.
  await ensureDatabaseReady().catch(() => {});

  return (
    <ToastProvider>
      <div className="min-h-screen">
        <Sidebar username={session.username} />
        <main className="lg:pl-64">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
