"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login gagal");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-7">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className="input"
            placeholder="Masukkan username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-lg font-semibold text-red-700">
            ⚠ {error}
          </div>
        )}
        <button type="submit" className="btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
      <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-base text-slate-600">
        <div className="font-bold text-slate-700">Akun demo:</div>
        <div>Username: <span className="font-mono font-bold">admin</span></div>
        <div>Password: <span className="font-mono font-bold">admin123</span></div>
      </div>
    </Card>
  );
}
