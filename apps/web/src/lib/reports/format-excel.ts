import ExcelJS from "exceljs";

import type { ReportTable } from "./data";

export async function tableToXlsxBuffer(table: ReportTable, sheetName: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName.slice(0, 31) || "Reporte", {
    properties: { defaultColWidth: 16 },
  });
  ws.addRow(table.headers);
  for (const row of table.rows) {
    ws.addRow(row);
  }
  ws.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
