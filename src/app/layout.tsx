import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HL Sales & Receivables",
  description: "Aplikasi internal manajemen penjualan & piutang HL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
