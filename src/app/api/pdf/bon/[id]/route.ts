import { requireAuth, handleError } from "@/lib/api";
import { buildPdf, pdfResponse } from "@/lib/pdf";
import { prisma } from "@/lib/db";
import { formatIDR, formatDate } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const t = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: { customer: true, lines: true },
    });
    if (!t || t.deletedAt) {
      return new Response("Not found", { status: 404 });
    }

    const filters = [
      { label: "Pelanggan", value: t.customer.nama },
      { label: "Tanggal", value: formatDate(t.tanggal) },
      { label: "Status", value: t.isBonus ? "BONUS" : t.status },
    ];
    if (t.paymentDate) filters.push({ label: "Tgl Pelunasan", value: formatDate(t.paymentDate) });

    const rows = t.lines.map((l) => [
      l.productNameSnapshot,
      l.productTypeSnapshot,
      String(l.quantity),
      t.isBonus ? 0 : l.discountedUnitPriceSnapshot,
      t.isBonus ? 0 : l.lineOmzetSnapshot,
    ]);

    const pdf = await buildPdf({
      title: `Bon ${t.nomorBon}`,
      filters,
      columns: [
        { header: "Produk", width: 4 },
        { header: "Tipe", width: 1.5 },
        { header: "Qty", width: 1.5, align: "right" },
        { header: "Harga/unit", width: 2.5, align: "right", money: true },
        { header: "Omzet", width: 2.5, align: "right", money: true },
      ],
      rows,
      totals: [
        { label: "Omzet", value: formatIDR(t.isBonus ? 0 : t.omzetTotal) },
        { label: "Ongkir", value: formatIDR(t.ongkir) },
        { label: "Total Tagihan", value: formatIDR(t.isBonus ? 0 : t.amountOwed) },
      ],
      note: t.isBonus
        ? "Bon Bonus: produk gratis, tidak dihitung sebagai omzet/piutang/laba."
        : "Total Tagihan = Omzet + Ongkir. Mata uang IDR, tanpa PPN.",
    });

    return pdfResponse(pdf, `bon-${t.nomorBon}.pdf`);
  } catch (err) {
    return handleError(err);
  }
}
