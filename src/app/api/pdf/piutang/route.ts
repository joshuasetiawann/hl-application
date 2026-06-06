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

    const txns = (await getFilteredTransactions({ customerId, year, month }))
      .filter((t) => !t.isBonus && t.status === "PIUTANG");

    let total = 0;
    const rows = txns.map((t) => {
      total += t.amountOwed;
      return [
        formatDate(t.tanggal),
        t.nomorBon,
        t.customer.nama,
        t.omzetTotal,
        t.ongkir,
        t.amountOwed,
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
      title: "Daftar Piutang",
      filters,
      columns: [
        { header: "Tanggal", width: 2 },
        { header: "Nomor Bon", width: 2 },
        { header: "Pelanggan", width: 3 },
        { header: "Omzet", width: 2, align: "right", money: true },
        { header: "Ongkir", width: 2, align: "right", money: true },
        { header: "Jumlah Tagihan", width: 2, align: "right", money: true },
      ],
      rows,
      totals: [{ label: "Total Piutang", value: formatIDR(total) }],
      note: "Piutang = Omzet + Ongkir untuk transaksi normal yang belum Lunas.",
    });

    return pdfResponse(pdf, "daftar-piutang.pdf");
  } catch (err) {
    return handleError(err);
  }
}
