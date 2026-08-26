import * as XLSX from "xlsx";

/** Exporte un tableau d'objets simples vers un fichier .xlsx téléchargé côté
 * client (une feuille, en-têtes = clés du premier objet). */
export function exportToExcel(rows: Record<string, string | number>[], sheetName: string, fileName: string): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}
