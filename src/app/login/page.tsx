import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            HL Sales &amp; Receivables
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Aplikasi internal — silakan login
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
