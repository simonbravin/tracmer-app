import PDFDocument from "pdfkit";

import type { ReportTable } from "./data";

const MAX_PDF_ROWS = 300;

export async function tableToPdfBuffer(table: ReportTable, generatedAt: Date): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40, layout: "landscape" });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.fontSize(14).text(table.title, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(9).text(`Generado: ${generatedAt.toLocaleString("es-AR")}`, { align: "right" });
  if (table.truncated) {
    doc.moveDown(0.3);
    doc.fillColor("#b91c1c").fontSize(8).text("Aviso: hay más datos en el origen; la exportación tabular puede estar recortada.", { align: "left" });
    doc.fillColor("#000000");
  }
  const slice = table.rows.slice(0, MAX_PDF_ROWS);
  if (table.rows.length > MAX_PDF_ROWS) {
    doc.moveDown(0.3);
    doc
      .fontSize(8)
      .text(
        `Solo se muestran ${MAX_PDF_ROWS} filas en PDF. Descargá Excel o CSV para el listado completo (${table.rows.length} filas en esta vista).`,
        { align: "left" },
      );
  }
  doc.moveDown(0.8);
  const line = (parts: string[]) => parts.map((p) => (p || "").replace(/\s+/g, " ").replace(/\|/g, "/").slice(0, 48)).join(" | ");
  doc.fontSize(7).font("Helvetica-Bold").text(line(table.headers), 40, doc.y, { width: doc.page.width - 80 });
  doc.moveDown(0.4);
  doc.font("Helvetica");
  for (const r of slice) {
    if (doc.y > doc.page.height - 50) {
      doc.addPage({ layout: "landscape", margin: 40 });
    }
    doc.fontSize(6.5).text(line(r), 40, doc.y, { width: doc.page.width - 80 });
    doc.moveDown(0.25);
  }
  doc.end();
  return done;
}
