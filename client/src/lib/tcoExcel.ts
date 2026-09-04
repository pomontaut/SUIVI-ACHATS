import ExcelJS from "exceljs";
import type { AoCritereTech, AoCritereTechValeur, AppelOffre } from "../types";
import { CRITERE_SCORE } from "../components/AoCriteresTechComparatif";

function num(v: string | null | undefined): number | null {
  const n = parseFloat(String(v ?? ""));
  return Number.isNaN(n) ? null : n;
}

const NAVY = "1E293B"; // slate-800 : bandeau de titre
const HEADER_FILL = "E0E7FF"; // indigo-100 : en-têtes de colonnes
const SECTION_FILL = "EEF2FF"; // indigo-50 : sous-titre
const GREEN_FILL = "DCFCE7"; // green-100 : meilleure offre / meilleur score
const BORDER_COLOR = "D1D5DB"; // gray-300

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
  left: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
  bottom: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
  right: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
};

interface Poste {
  id: string;
  reference: string | null;
  libelle: string | null;
  budget: string | null;
}
interface PosteMontant {
  posteId: string;
  appelOffreId: string;
  montant: string | null;
}

export interface TcoExportInput {
  numeroAO: string;
  nom: string;
  chant: string | null;
  prec: string;
  rows: AppelOffre[];
  postes?: Poste[];
  posteMontants?: PosteMontant[];
  criteres?: AoCritereTech[];
  critereValeurs?: AoCritereTechValeur[];
}

/** Ajoute un bandeau de titre (fond marine, texte blanc) + une ligne de
 * sous-titre (contexte du sujet AO) fusionnés sur toute la largeur du
 * tableau, à l'image des comparatifs de référence transmis par
 * l'utilisateur. Retourne le n° de la première ligne libre après l'entête. */
function addTitleBlock(ws: ExcelJS.Worksheet, title: string, subtitle: string, nbCols: number): number {
  ws.mergeCells(1, 1, 1, nbCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title.toUpperCase();
  titleCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
  titleCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 22;

  ws.mergeCells(2, 1, 2, nbCols);
  const subtitleCell = ws.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { italic: true, color: { argb: "FF475569" }, size: 9 };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${SECTION_FILL}` } };
  subtitleCell.alignment = { vertical: "middle" };

  return 4; // ligne 3 laissée vide comme séparateur
}

function styleHeaderRow(ws: ExcelJS.Worksheet, rowIndex: number, nbCols: number) {
  const row = ws.getRow(rowIndex);
  row.font = { bold: true, size: 10 };
  for (let c = 1; c <= nbCols; c++) {
    const cell = row.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_FILL}` } };
    cell.border = thinBorder;
    cell.alignment = { vertical: "middle", wrapText: true };
  }
}

function applyDataBorders(ws: ExcelJS.Worksheet, fromRow: number, toRow: number, nbCols: number) {
  for (let r = fromRow; r <= toRow; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= nbCols; c++) {
      row.getCell(c).border = thinBorder;
    }
    row.alignment = { vertical: "top", wrapText: true };
  }
}

/** Génère le classeur TCO complet (financier, poste par poste, technique par
 * critère + score) au format et avec la mise en forme attendus, à l'image
 * des comparatifs de référence transmis par l'utilisateur (bandeau de
 * titre, en-têtes colorés, moins cher/meilleur score surligné). */
export async function exportTcoExcel(input: TcoExportInput): Promise<void> {
  const { numeroAO, nom, chant, prec, rows, postes = [], posteMontants = [], criteres = [], critereValeurs = [] } = input;

  const offres = rows
    .map((row) => ({ row, montant: num(row.offreFournisseur) }))
    .sort((a, b) => (a.montant ?? Infinity) - (b.montant ?? Infinity));
  const cheapest = offres.find((o) => o.montant !== null)?.montant ?? null;

  const title = `TCO — AO ${numeroAO} — ${nom}${chant ? ` (chantier ${chant})` : ""}`;
  const today = new Date().toLocaleDateString("fr-CH");
  const subtitle = `${prec} | ${rows.length} fournisseur(s) consulté(s) | Généré le ${today}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Suivi Achats Induni";
  wb.created = new Date();

  // --- Feuille 1 : Comparatif financier -----------------------------------
  const wsFin = wb.addWorksheet("Comparatif financier", { views: [{ state: "frozen", ySplit: 5 }] });
  const finCols = ["Fournisseur", "Offre HT (CHF)", "Écart vs moins cher (CHF)", "Statut", "Validation", "Remarque"];
  wsFin.columns = [
    { width: 32 }, { width: 16 }, { width: 20 }, { width: 14 }, { width: 22 }, { width: 40 },
  ];
  const finStart = addTitleBlock(wsFin, title, subtitle, finCols.length);
  wsFin.getRow(finStart).values = finCols;
  styleHeaderRow(wsFin, finStart, finCols.length);
  wsFin.getColumn(2).numFmt = "#,##0.00";
  wsFin.getColumn(3).numFmt = "#,##0.00";
  let r = finStart + 1;
  for (const { row, montant } of offres) {
    const ecart = montant !== null && cheapest !== null && montant > cheapest ? montant - cheapest : null;
    const remarque = row.offreMontantAuto ? "Montant extrait automatiquement — à vérifier" : (row.offreExtractionNote ?? "");
    wsFin.getRow(r).values = [
      row.fournisseur ?? "",
      montant !== null ? montant : "",
      ecart !== null ? ecart : "",
      row.statut ?? "",
      row.validation ?? "",
      remarque,
    ];
    if (montant !== null && montant === cheapest) {
      wsFin.getRow(r).eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GREEN_FILL}` } }; });
      wsFin.getCell(r, 1).font = { bold: true, color: { argb: "FF15803D" } };
    }
    r++;
  }
  applyDataBorders(wsFin, finStart, r - 1, finCols.length);

  // --- Feuille 2 : Comparatif par poste (si des postes existent) ---------
  if (postes.length > 0) {
    const wsPoste = wb.addWorksheet("Comparatif par poste", { views: [{ state: "frozen", ySplit: 5 }] });
    const posteCols = ["Réf.", "Poste", "Budget (CHF)", ...rows.map((rr) => rr.fournisseur || "—"), "Écart min/max (CHF)"];
    wsPoste.columns = [
      { width: 10 }, { width: 40 }, { width: 14 },
      ...rows.map(() => ({ width: 16 })),
      { width: 16 },
    ];
    const posteStart = addTitleBlock(wsPoste, title, subtitle, posteCols.length);
    wsPoste.getRow(posteStart).values = posteCols;
    styleHeaderRow(wsPoste, posteStart, posteCols.length);
    for (let c = 3; c <= posteCols.length; c++) wsPoste.getColumn(c).numFmt = "#,##0.00";
    let pr = posteStart + 1;
    const totalParFournisseur = new Map<string, number>();
    for (const poste of postes) {
      const values: (number | null)[] = rows.map((rr) => {
        const m = posteMontants.find((x) => x.posteId === poste.id && x.appelOffreId === rr.id);
        return num(m?.montant);
      });
      const present = values.filter((v): v is number => v !== null);
      const min = present.length > 0 ? Math.min(...present) : null;
      const max = present.length > 0 ? Math.max(...present) : null;
      wsPoste.getRow(pr).values = [
        poste.reference ?? "",
        poste.libelle ?? "",
        num(poste.budget) ?? "",
        ...values.map((v) => (v !== null ? v : "")),
        min !== null && max !== null && max !== min ? max - min : "",
      ];
      values.forEach((v, i) => {
        if (v !== null && min !== null && v === min) {
          wsPoste.getCell(pr, 4 + i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GREEN_FILL}` } };
        }
        if (v !== null) totalParFournisseur.set(rows[i].id, (totalParFournisseur.get(rows[i].id) ?? 0) + v);
      });
      pr++;
    }
    const totals = rows.map((rr) => totalParFournisseur.get(rr.id) ?? null);
    const presentTotals = totals.filter((v): v is number => v !== null);
    const minTotal = presentTotals.length > 0 ? Math.min(...presentTotals) : null;
    wsPoste.getRow(pr).values = ["", "TOTAL (somme des postes)", "", ...totals.map((v) => (v !== null ? v : "")), ""];
    wsPoste.getRow(pr).font = { bold: true };
    totals.forEach((v, i) => {
      if (v !== null && minTotal !== null && v === minTotal) {
        wsPoste.getCell(pr, 4 + i).font = { bold: true, color: { argb: "FF15803D" } };
      }
    });
    applyDataBorders(wsPoste, posteStart, pr, posteCols.length);
    pr++;
  }

  // --- Feuille 3 : Comparatif technique par critère + score (si des critères existent) --
  if (criteres.length > 0) {
    const wsTech = wb.addWorksheet("Comparatif technique", { views: [{ state: "frozen", ySplit: 5 }] });
    const techCols = ["Critère", ...rows.map((rr) => rr.fournisseur || "—"), "Remarque / analyse"];
    wsTech.columns = [
      { width: 28 },
      ...rows.map(() => ({ width: 20 })),
      { width: 40 },
    ];
    const techStart = addTitleBlock(wsTech, title, subtitle, techCols.length);
    wsTech.getRow(techStart).values = techCols;
    styleHeaderRow(wsTech, techStart, techCols.length);
    let tr = techStart + 1;
    let anyScored = false;
    const scoreParFournisseur = new Map<string, number>();
    for (const critere of criteres) {
      const values = rows.map((rr) => critereValeurs.find((x) => x.critereId === critere.id && x.appelOffreId === rr.id)?.valeur ?? "");
      wsTech.getRow(tr).values = [critere.libelle ?? "", ...values, critere.remarque ?? ""];
      wsTech.getCell(tr, 1).font = { bold: true };
      values.forEach((v, i) => {
        const trimmed = v.trim();
        if (trimmed in CRITERE_SCORE) {
          anyScored = true;
          scoreParFournisseur.set(rows[i].id, (scoreParFournisseur.get(rows[i].id) ?? 0) + CRITERE_SCORE[trimmed]);
        }
      });
      tr++;
    }
    if (anyScored) {
      const scores = rows.map((rr) => scoreParFournisseur.get(rr.id) ?? 0);
      const maxScore = Math.max(...scores);
      wsTech.getRow(tr).values = ["SCORE GLOBAL (✓✓=2, ✓=1, ~=0.5, ✗=0, ?=0)", ...scores, ""];
      wsTech.getRow(tr).font = { bold: true };
      scores.forEach((s, i) => {
        if (s === maxScore) {
          wsTech.getCell(tr, 2 + i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GREEN_FILL}` } };
          wsTech.getCell(tr, 2 + i).font = { bold: true, color: { argb: "FF15803D" } };
        }
      });
      tr++;
    }
    applyDataBorders(wsTech, techStart, tr - 1, techCols.length);
  }

  // --- Feuille 4 : Notes complémentaires (si du texte libre existe) ------
  if (rows.some((rr) => rr.comparatifTechnique)) {
    const wsNotes = wb.addWorksheet("Notes complémentaires");
    const notesCols = ["Fournisseur", "Notes"];
    wsNotes.columns = [{ width: 32 }, { width: 80 }];
    const notesStart = addTitleBlock(wsNotes, title, subtitle, notesCols.length);
    wsNotes.getRow(notesStart).values = notesCols;
    styleHeaderRow(wsNotes, notesStart, notesCols.length);
    let nr = notesStart + 1;
    for (const rr of rows) {
      wsNotes.getRow(nr).values = [rr.fournisseur ?? "", rr.comparatifTechnique ?? ""];
      nr++;
    }
    applyDataBorders(wsNotes, notesStart, nr - 1, notesCols.length);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `TCO-${numeroAO}-${chant || "sanschantier"}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
