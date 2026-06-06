import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 text-4xl text-white shadow-lg">
            🧾
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            HL Sales &amp; Receivables
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Kelola Bon, Piutang, Bonus, dan Rekap HL
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
