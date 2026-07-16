import type { ColInfo } from 'xlsx';

function sanitizeExcelValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trimStart();
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${value}`;
  }

  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .slice(0, 32767);
}

function sanitizeExcelRows(data: any[]): any[] {
  return data.map(row => {
    const safeRow: Record<string, unknown> = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      safeRow[key] = sanitizeExcelValue(value);
    });
    return safeRow;
  });
}

export async function exportToExcel(data: any[], sheetName: string, fileName: string, columnWidths: ColInfo[] | null = null): Promise<void> {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(sanitizeExcelRows(data));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  if (columnWidths) {
    worksheet["!cols"] = columnWidths;
  }

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
