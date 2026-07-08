// core/excelExporter.js - Exporting tables to XLSX format using SheetJS

export function exportToExcel(data, sheetName, fileName, columnWidths = null) {
  if (typeof XLSX === 'undefined') {
    console.error("Thư viện XLSX chưa được tải.");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
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
