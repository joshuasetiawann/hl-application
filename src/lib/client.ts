"use client";

/** Thin client-side fetch helpers with JSON + error handling. */

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await toError(res);
  // DELETE may return empty
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

async function toError(res: Response): Promise<Error> {
  try {
    const data = await res.json();
    return new Error(data.error || `Request gagal (${res.status})`);
  } catch {
    return new Error(`Request gagal (${res.status})`);
  }
}
