/**
 * PDF generation helper built on pdfkit. IDR formatting, title, filters, generated date,
 * tabular data and totals. No tax/PPN. Never exposes Harga Modal in customer-facing docs.
 */
import PDFDocument from "pdfkit";
import { formatIDR, formatDate } from "@/lib/format";

export interface PdfColumn {
  header: string;
  /** Width weight (relative). */
  width: number;
  align?: "left" | "right" | "center";
  /** Format a cell value. If money=true the value is formatted as IDR. */
  money?: boolean;
}

export interface PdfTableSpec {
  title: string;
  subtitle?: string;
  filters?: { label: string; value: string }[];
  columns: PdfColumn[];
  rows: (string | number)[][];
  totals?: { label: string; value: string }[];
  /** Optional note printed at the bottom. */
  note?: string;
}

export function buildPdf(spec: PdfTableSpec): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageLeft = doc.page.margins.left;
    const pageRight = doc.page.width - doc.page.margins.right;
    const usableWidth = pageRight - pageLeft;

    // Header
    doc.fontSize(16).font("Helvetica-Bold").text("HL Sales & Receivables", pageLeft, doc.y);
    doc.moveDown(0.2);
    doc.fontSize(13).font("Helvetica-Bold").text(spec.title);
    if (spec.subtitle) {
      doc.moveDown(0.1);
      doc.fontSize(10).font("Helvetica").text(spec.subtitle);
    }
    doc.moveDown(0.2);
    doc.fontSize(8).font("Helvetica").fillColor("#555")
      .text(`Dibuat: ${formatDate(new Date())} • Mata uang: IDR (Rupiah) • Tanpa PPN`);
    fillBlack(doc);

    if (spec.filters && spec.filters.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica");
      const filterText = spec.filters
        .map((f) => `${f.label}: ${f.value}`)
        .join("   |   ");
      doc.text(filterText);
    }

    doc.moveDown(0.5);

    // Column geometry
    const totalWeight = spec.columns.reduce((s, c) => s + c.width, 0);
    const colWidths = spec.columns.map((c) => (c.width / totalWeight) * usableWidth);
    const colX: number[] = [];
    let acc = pageLeft;
    for (const w of colWidths) {
      colX.push(acc);
      acc += w;
    }

    const rowHeight = 18;
    const padding = 4;

    const drawHeader = () => {
      const y = doc.y;
      doc.rect(pageLeft, y, usableWidth, rowHeight).fill("#1d4ed8");
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
      spec.columns.forEach((c, i) => {
        doc.text(c.header, colX[i] + padding, y + 5, {
          width: colWidths[i] - padding * 2,
          align: c.align ?? "left",
          lineBreak: false,
        });
      });
      fillBlack(doc);
      doc.y = y + rowHeight;
    };

    drawHeader();

    doc.fontSize(8).font("Helvetica");
    spec.rows.forEach((row, idx) => {
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawHeader();
        doc.fontSize(8).font("Helvetica");
      }
      const y = doc.y;
      if (idx % 2 === 1) {
        doc.rect(pageLeft, y, usableWidth, rowHeight).fill("#eef2ff");
        fillBlack(doc);
      }
      spec.columns.forEach((c, i) => {
        const raw = row[i];
        const text =
          c.money && typeof raw === "number" ? formatIDR(raw) : String(raw ?? "");
        doc.text(text, colX[i] + padding, y + 5, {
          width: colWidths[i] - padding * 2,
          align: c.align ?? "left",
          lineBreak: false,
        });
      });
      doc.y = y + rowHeight;
    });

    // Totals
    if (spec.totals && spec.totals.length > 0) {
      doc.moveDown(0.6);
      doc.fontSize(10).font("Helvetica-Bold");
      spec.totals.forEach((t) => {
        doc.text(`${t.label}: ${t.value}`, pageLeft, doc.y, {
          width: usableWidth,
          align: "right",
        });
      });
    }

    if (spec.note) {
      doc.moveDown(0.6);
      doc.fontSize(8).font("Helvetica").fillColor("#777").text(spec.note);
      fillBlack(doc);
    }

    doc.end();
  });
}

function fillBlack(doc: PDFKit.PDFDocument) {
  doc.fillColor("#111111");
}

export function pdfResponse(buffer: Buffer, filename: string): Response {
  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
