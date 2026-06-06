import { requireAuth, handleError } from "@/lib/api";
import { buildPdf, pdfResponse } from "@/lib/pdf";
import { getFilteredTransactions } from "@/lib/services/report";
import { prisma } from "@/lib/db";
import { formatDate, formatIDR, monthLabel } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId") || undefined;
    const year = searchParams.get("year")
      ? Number(searchParams.get("year"))
      : undefined;
    const month = searchParams.get("month")
      ? Number(searchParams.get("month"))
      : undefined;

    const txns = await getFilteredTransactions({ customerId, year, month });

    let totalOmzet = 0;
    let totalOwed = 0;
    const rows = txns.map((t) => {
      if (!t.isBonus) {
        totalOmzet += t.status === "LUNAS" ? t.omzetTotal : 0;
        totalOwed += t.amountOwed;
      }
      return [
        formatDate(t.tanggal),
        t.nomorBon,
        t.customer.nama,
        t.isBonus ? "BONUS" : t.status,
        t.isBonus ? 0 : t.omzetTotal,
        t.ongkir,
        t.isBonus ? 0 : t.amountOwed,
        t.paymentDate ? formatDate(t.paymentDate) : "-",
      ];
    });

    const filters: { label: string; value: string }[] = [];
    if (customerId) {
      const c = await prisma.customer.findUnique({ where: { id: customerId } });
      if (c) filters.push({ label: "Pelanggan", value: c.nama });
    }
    if (year) filters.push({ label: "Tahun", value: String(year) });
    if (month) filters.push({ label: "Bulan", value: monthLabel(month) });

    const pdf = await buildPdf({
      title: "Daftar Transaksi / Bon",
      filters,
      columns: [
        { header: "Tanggal", width: 2 },
        { header: "Nomor Bon", width: 2 },
        { header: "Pelanggan", width: 3 },
        { header: "Status", width: 1.5 },
        { header: "Omzet", width: 2, align: "right", money: true },
        { header: "Ongkir", width: 1.5, align: "right", money: true },
        { header: "Tagihan", width: 2, align: "right", money: true },
        { header: "Tgl Lunas", width: 2 },
      ],
      rows,
      totals: [
        { label: "Total Omzet (Lunas)", value: formatIDR(totalOmzet) },
        { label: "Total Tagihan (non-bonus)", value: formatIDR(totalOwed) },
      ],
      note: "Bonus bon dikecualikan dari total omzet/tagihan.",
    });

    return pdfResponse(pdf, "daftar-transaksi.pdf");
  } catch (err) {
    return handleError(err);
  }
}
