import type { ReportTable } from "./data";

function esc(s: string) {
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function tableToCsvString(table: ReportTable) {
  const lines = [table.headers.map(esc).join(",")];
  for (const r of table.rows) {
    lines.push(r.map(esc).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}
