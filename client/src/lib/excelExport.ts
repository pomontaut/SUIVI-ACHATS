import * as XLSX from "xlsx";

/** Exporte plusieurs tableaux d'objets simples vers un fichier .xlsx
 * téléchargé côté client (une feuille par tableau, en-têtes = clés du
 * premier objet de chaque tableau). */
export function exportSheetsToExcel(sheets: { name: string; rows: Record<string, string | number>[] }[], fileName: string): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}

/** Exporte un tableau d'objets simples vers un fichier .xlsx téléchargé côté
 * client (une feuille, en-têtes = clés du premier objet). */
export function exportToExcel(rows: Record<string, string | number>[], sheetName: string, fileName: string): void {
  exportSheetsToExcel([{ name: sheetName, rows }], fileName);
}
