import { requireAuth, handleError } from "@/lib/api";
import { buildPdf, pdfResponse } from "@/lib/pdf";
import { recapPerCustomer, recapOverall } from "@/lib/services/report";
import { prisma } from "@/lib/db";
import { formatIDR, monthLabel } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "overall"; // overall | customer
    const customerId = searchParams.get("customerId") || undefined;
    const year = searchParams.get("year")
      ? Number(searchParams.get("year"))
      : undefined;
    const month = searchParams.get("month")
      ? Number(searchParams.get("month"))
      : undefined;

    const filters: { label: string; value: string }[] = [];
    if (year) filters.push({ label: "Tahun", value: String(year) });
    if (month) filters.push({ label: "Bulan", value: monthLabel(month) });

    if (type === "customer") {
      const rows = await recapPerCustomer({ year, month, customerId });
      if (customerId) {
        const c = await prisma.customer.findUnique({ where: { id: customerId } });
        if (c) filters.push({ label: "Pelanggan", value: c.nama });
      }
      const totals = rows.reduce(
        (acc, r) => {
          acc.omzet += r.recognizedOmzet;
          acc.profit += r.recognizedProfit;
          acc.paid += r.totalPaid;
          acc.piutang += r.totalOutstandingPiutang;
          return acc;
        },
        { omzet: 0, profit: 0, paid: 0, piutang: 0 }
      );

      const pdf = await buildPdf({
        title: "Rekap per Pelanggan",
        filters,
        columns: [
          { header: "Pelanggan", width: 3 },
          { header: "Omzet (Lunas)", width: 2, align: "right", money: true },
          { header: "Laba HL", width: 2, align: "right", money: true },
          { header: "Omzet LM", width: 2, align: "right", money: true },
          { header: "Omzet BR", width: 2, align: "right", money: true },
          { header: "Sudah Dibayar", width: 2, align: "right", money: true },
          { header: "Piutang", width: 2, align: "right", money: true },
        ],
        rows: rows.map((r) => [
          r.customerName,
          r.recognizedOmzet,
          r.recognizedProfit,
          r.omzetLM,
          r.omzetBR,
          r.totalPaid,
          r.totalOutstandingPiutang,
        ]),
        totals: [
          { label: "Total Omzet (Lunas)", value: formatIDR(totals.omzet) },
          { label: "Total Laba HL", value: formatIDR(totals.profit) },
          { label: "Total Sudah Dibayar", value: formatIDR(totals.paid) },
          { label: "Total Piutang", value: formatIDR(totals.piutang) },
        ],
        note: "Bonus dikecualikan dari omzet/laba/piutang. Tanpa PPN.",
      });
      return pdfResponse(pdf, "rekap-per-pelanggan.pdf");
    }

    // overall
    const r = await recapOverall({ year, month, customerId });
    const pdf = await buildPdf({
      title: "Rekap Keseluruhan",
      filters,
      columns: [
        { header: "Metrik", width: 3 },
        { header: "Nilai", width: 3, align: "right", money: true },
      ],
      rows: [
        ["Total Omzet (Lunas)", r.recognizedOmzet],
        ["Total Laba HL (Lunas)", r.recognizedProfit],
        ["Omzet LM", r.omzetLM],
        ["Omzet BR", r.omzetBR],
        ["Laba HL LM", r.profitLM],
        ["Laba HL BR", r.profitBR],
        ["Total Sudah Dibayar", r.totalPaid],
        ["Total Piutang Outstanding", r.totalOutstandingPiutang],
      ],
      note: `Transaksi Lunas: ${r.countLunas} • Piutang: ${r.countPiutang} • Bonus bon: ${r.countBonus}. Bonus dikecualikan dari semua total. Tanpa PPN.`,
    });
    return pdfResponse(pdf, "rekap-keseluruhan.pdf");
  } catch (err) {
    return handleError(err);
  }
}
