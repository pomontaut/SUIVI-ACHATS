import { dateVal } from "./tableFilter";
import { isAtt, isClos } from "./etape";
import { joursRetard, livraisonCategorie, parseFrDate, workingDaysBetween } from "./dates";
import type { Livraison, Operation, Options, Todo, Transverse } from "../types";

function num(v: string | null | undefined): number {
  const n = parseFloat(String(v ?? ""));
  return Number.isNaN(n) ? 0 : n;
}
function numOrNaN(v: string | null | undefined): number {
  return parseFloat(String(v ?? ""));
}

export interface Bucket {
  label: string;
  value: number;
  color: string;
}

const COL_ETAPE = ["#185FA5", "#3B6D11", "#854F0B", "#A32D2D", "#534AB7", "#888780"];
const COL_ENTITE = ["#185FA5", "#3B6D11", "#534AB7", "#854F0B", "#888780", "#0F6E56"];
const COL_FOURN = ["#185FA5", "#534AB7", "#3B6D11", "#854F0B", "#A32D2D", "#0F6E56", "#888780"];
const COL_GAIN = ["#3B6D11", "#185FA5", "#534AB7", "#854F0B", "#888780"];

export function kpis(operations: Operation[]) {
  const actifs = operations.filter((o) => !isClos(o.etape)).length;
  const clos = operations.filter((o) => isClos(o.etape)).length;
  const att = operations.filter((o) => isAtt(o.etape)).length;
  const montant = operations.reduce((s, o) => s + num(o.montant), 0);
  let gain = 0;
  for (const o of operations) {
    const b = numOrNaN(o.budget);
    const m = numOrNaN(o.montant);
    const g = numOrNaN(o.gain);
    if (!Number.isNaN(b) && b > 0 && !Number.isNaN(m) && m > 0) gain += m - b;
    else if (!Number.isNaN(g)) gain += g;
  }
  const fournisseurs = new Set(operations.map((o) => o.fournisseur).filter((f) => f && f.trim())).size;
  return { actifs, clos, att, montant, gain, fournisseurs };
}

function topN(counts: Record<string, number>, n: number, colors: string[]): Bucket[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
}

export function etapeBreakdown(operations: Operation[]): Bucket[] {
  const c: Record<string, number> = {};
  operations.forEach((o) => { const k = o.etape || "?"; c[k] = (c[k] ?? 0) + 1; });
  return topN(c, 6, COL_ETAPE);
}

export function entiteBreakdown(operations: Operation[]): Bucket[] {
  const c: Record<string, number> = {};
  operations.forEach((o) => { const k = o.ent || "?"; c[k] = (c[k] ?? 0) + 1; });
  return topN(c, 999, COL_ENTITE);
}

export function fournitureBreakdown(operations: Operation[]): Bucket[] {
  const c: Record<string, number> = {};
  operations.forEach((o) => { const k = o.fourn || "Autres"; c[k] = (c[k] ?? 0) + 1; });
  return topN(c, 7, COL_FOURN);
}

export interface TrancheResult {
  lbl: string;
  col: string;
  count: number;
  total: number;
}

export function tranchesBreakdown(operations: Operation[], tranches: Options["TRANCHES"]): TrancheResult[] {
  const withMnt = operations.filter((o) => num(o.montant) > 0);
  return tranches.map((t) => {
    const max = t.max ?? Infinity;
    const rows = withMnt.filter((o) => { const m = num(o.montant); return m >= t.min && m <= max; });
    return { lbl: t.lbl, col: t.col, count: rows.length, total: rows.reduce((s, o) => s + num(o.montant), 0) };
  });
}

export function getPertCat(comment: string | null, typeActionAchat: string | null, tco: string | null, pertCats: Options["PERT_CATS"]): string {
  if ((tco ?? "").toLowerCase() === "oui") return "tco";
  const combined = `${comment ?? ""} ${typeActionAchat ?? ""}`.toLowerCase();
  for (const cat of pertCats) {
    if (cat.key === "other") continue;
    if (cat.kw.some((kw) => combined.includes(kw))) return cat.key;
  }
  return "other";
}

export interface PertResult {
  key: string;
  label: string;
  count: number;
  pct: number;
  total: number;
}

export function pertBreakdown(operations: Operation[], pertCats: Options["PERT_CATS"]): { rows: PertResult[]; totalCmd: number } {
  const cmdRows = operations.filter((o) => num(o.montant) > 0);
  const byKey = new Map(pertCats.map((c) => [c.key, { count: 0, total: 0 }]));
  for (const o of cmdRows) {
    const key = getPertCat(o.comment, o.typeActionAchat, o.tco, pertCats);
    const entry = byKey.get(key)!;
    entry.count++;
    entry.total += num(o.montant);
  }
  const rows = pertCats.map((c) => {
    const e = byKey.get(c.key)!;
    return { key: c.key, label: c.label, count: e.count, total: e.total, pct: cmdRows.length > 0 ? Math.round((e.count / cmdRows.length) * 100) : 0 };
  });
  return { rows, totalCmd: cmdRows.length };
}

const GAIN_CATS = ["Budget soumission", "Cost avoidance", "Budget meilleure offre conforme", "Budget contrat cadre", "Autres"];

export interface GainTypeResult {
  key: string;
  value: number;
  pct: number;
  color: string;
}

export function gainByTypeBreakdown(operations: Operation[]): { rows: GainTypeResult[]; total: number } {
  const byCat: Record<string, number> = Object.fromEntries(GAIN_CATS.map((c) => [c, 0]));
  for (const o of operations) {
    const b = numOrNaN(o.budget);
    const m = numOrNaN(o.montant);
    const g = numOrNaN(o.gain);
    let saving = 0;
    if (!Number.isNaN(b) && b > 0) saving = b - m;
    else if (!Number.isNaN(g)) saving = g;
    if (saving > 0) {
      const cat = GAIN_CATS.includes(o.typeBudget ?? "") ? (o.typeBudget as string) : "Autres";
      byCat[cat] += saving;
    }
  }
  const total = Object.values(byCat).reduce((s, v) => s + v, 0);
  const rows = GAIN_CATS.map((key, i) => ({ key, value: byCat[key], color: COL_GAIN[i], pct: total > 0 ? Math.round((byCat[key] / total) * 100) : 0 }));
  return { rows, total };
}

const PRIO_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, "": 5 };

export function actionsPrioritaires(todos: Todo[]): Todo[] {
  return todos
    .filter((t) => (t.statut ?? "Actif") !== "Clôturé")
    .slice()
    .sort((a, b) => (PRIO_ORDER[a.prio ?? ""] ?? 5) - (PRIO_ORDER[b.prio ?? ""] ?? 5));
}

/** Reprend needsWarning() de l'outil d'origine : une action sans deadline
 * définie est considérée à risque (warning), tout comme une deadline à J-1 ou dépassée. */
export function needsWarningForDeadline(deadline: string | null): boolean {
  const d = parseFrDate(deadline);
  if (!d) return true;
  const jours = workingDaysBetween(new Date(), d);
  return jours !== null && jours <= 1;
}

export interface ProchaineLivraison {
  operation: Operation;
  urgent: boolean;
  attention: boolean;
}

export function prochainesLivraisons(operations: Operation[]): ProchaineLivraison[] {
  const rows = operations
    .filter((o) => o.dateLivraison && o.dateLivraison.trim() && !isClos(o.etape))
    .sort((a, b) => dateVal(a.dateLivraison) - dateVal(b.dateLivraison))
    .slice(0, 10);
  const today = new Date();
  return rows.map((o) => {
    const d = parseFrDate(o.dateLivraison);
    const jours = workingDaysBetween(today, d);
    return { operation: o, urgent: jours !== null && jours <= 1, attention: jours !== null && jours <= 3 };
  });
}

export interface DepFournRow {
  fournisseur: string;
  total: number;
  count: number;
  pct: number;
}

const DEP_FOURN_COLORS = ["#185FA5", "#534AB7", "#3B6D11", "#854F0B", "#A32D2D", "#0F6E56", "#888780", "#6B4F2A", "#1A8C7A", "#C25B00"];

export function depFourn(operations: Operation[]): { rows: (DepFournRow & { color: string })[]; total: number; maxTotal: number } {
  const rows = operations.filter((o) => o.fournisseur && o.fournisseur.trim() && num(o.montant) > 0);
  const byF = new Map<string, { total: number; count: number }>();
  for (const o of rows) {
    const f = (o.fournisseur as string).trim();
    const e = byF.get(f) ?? { total: 0, count: 0 };
    e.total += num(o.montant);
    e.count++;
    byF.set(f, e);
  }
  const sorted = [...byF.entries()].sort((a, b) => b[1].total - a[1].total);
  const total = sorted.reduce((s, [, v]) => s + v.total, 0);
  const maxTotal = sorted.length > 0 ? sorted[0][1].total : 1;
  return {
    rows: sorted.map(([fournisseur, v], i) => ({ fournisseur, total: v.total, count: v.count, pct: total > 0 ? Math.round((v.total / total) * 100) : 0, color: DEP_FOURN_COLORS[i % DEP_FOURN_COLORS.length] })),
    total,
    maxTotal,
  };
}

export interface TauxServiceResult {
  ts: number;
  tsColor: string;
  onTimeCount: number;
  retardTotalCount: number;
  denom: number;
  totalLiv: number;
  avgRetardDays: number | null;
  byFournisseur: { fournisseur: string; ok: number; total: number; pct: number; color: string }[];
}

export function tauxService(livraisons: Livraison[]): TauxServiceResult {
  const withReal = livraisons.filter((l) => l.dateLivraisonReelle && l.dateLivraisonReelle.trim());
  const withRealOk = withReal.filter((l) => {
    const dPrev = parseFrDate(l.dateLivraison);
    const dReal = parseFrDate(l.dateLivraisonReelle);
    return dReal && dPrev ? dReal <= dPrev : true;
  });
  const retardRows = withReal.filter((l) => {
    const dPrev = parseFrDate(l.dateLivraison);
    const dReal = parseFrDate(l.dateLivraisonReelle);
    return Boolean(dReal && dPrev && dReal > dPrev);
  });
  const encoursRetard = livraisons.filter((l) => livraisonCategorie(l.dateLivraison, l.dateLivraisonReelle) === "retard");
  const denom = withReal.length + encoursRetard.length;
  const retardTotalCount = retardRows.length + encoursRetard.length;
  const ts = denom > 0 ? Math.round((withRealOk.length / denom) * 100) : 0;
  const tsColor = ts >= 95 ? "#3B6D11" : ts >= 80 ? "#854F0B" : "#A32D2D";

  let avgRetardDays: number | null = null;
  if (retardTotalCount > 0) {
    let totalDays = 0;
    for (const l of retardRows) {
      const d1 = parseFrDate(l.dateLivraison);
      const d2 = parseFrDate(l.dateLivraisonReelle);
      if (d1 && d2) totalDays += Math.round((d2.getTime() - d1.getTime()) / 86_400_000);
    }
    for (const l of encoursRetard) totalDays += joursRetard(l.dateLivraison, l.dateLivraisonReelle);
    avgRetardDays = Math.round(totalDays / retardTotalCount);
  }

  const byF = new Map<string, { ok: number; total: number }>();
  for (const l of withReal) {
    const f = l.fournisseur && l.fournisseur.trim() ? l.fournisseur : "(inconnu)";
    const e = byF.get(f) ?? { ok: 0, total: 0 };
    e.total++;
    const dPrev = parseFrDate(l.dateLivraison);
    const dReal = parseFrDate(l.dateLivraisonReelle);
    if (dReal && dPrev && dReal <= dPrev) e.ok++;
    byF.set(f, e);
  }
  const byFournisseur = [...byF.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([fournisseur, v]) => {
      const pct = v.total > 0 ? Math.round((v.ok / v.total) * 100) : 0;
      return { fournisseur, ok: v.ok, total: v.total, pct, color: pct >= 95 ? "#3B6D11" : pct >= 80 ? "#854F0B" : "#A32D2D" };
    });

  return { ts, tsColor, onTimeCount: withRealOk.length, retardTotalCount, denom, totalLiv: livraisons.length, avgRetardDays, byFournisseur };
}

/** Statut à 4 états repris de getLivStatus() dans l'outil d'origine, calculé
 * directement sur une ligne Opération (distinct de livraisonCategorie qui
 * opère sur le module Livraisons indépendant). */
export type DashLivStatus = "livre_ok" | "livre_retard" | "retard" | "encours";

export function getLivStatus(o: Operation): DashLivStatus {
  const hasPrev = Boolean(o.dateLivraison && o.dateLivraison.trim());
  const hasReal = Boolean(o.dateLivraisonReelle && o.dateLivraisonReelle.trim());
  const clos = isClos(o.etape);
  const dPrev = parseFrDate(o.dateLivraison);
  const dReal = parseFrDate(o.dateLivraisonReelle);
  if (hasReal) {
    if (hasPrev) return dReal && dPrev && dReal <= dPrev ? "livre_ok" : "livre_retard";
    return "livre_ok";
  }
  if (clos) return "livre_ok";
  if (hasPrev) {
    if (new Date() > (dPrev as Date)) return "retard";
    return "encours";
  }
  return "encours";
}

export interface DashLivRow {
  operation: Operation;
  status: DashLivStatus;
  urgent: boolean;
  attention: boolean;
}

export function dashLivraisons(operations: Operation[]): DashLivRow[] {
  const rows = operations.filter((o) => {
    if (!(o.type ?? "").toLowerCase().includes("exploitation")) return false;
    const hasLivraison = Boolean(o.dateLivraison && o.dateLivraison.trim());
    const hasCmd = Boolean(o.numCmd && o.numCmd.trim());
    const hasReal = Boolean(o.dateLivraisonReelle && o.dateLivraisonReelle.trim());
    return hasLivraison || hasCmd || (isClos(o.etape) && hasReal);
  });
  const today = new Date();
  return rows
    .map((o) => {
      const status = getLivStatus(o);
      const dPrev = parseFrDate(o.dateLivraison);
      const jours = workingDaysBetween(today, dPrev);
      return { operation: o, status, urgent: status === "retard" || (jours !== null && jours <= 1), attention: jours !== null && jours <= 3 };
    })
    .sort((a, b) => dateVal(a.operation.dateLivraison || a.operation.dateCmd) - dateVal(b.operation.dateLivraison || b.operation.dateCmd));
}

// ===== Bilan période =====

function monthKeyOf(d: Date | null): string | null {
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function statusInRange(start: Date | null, end: Date | null, closed: boolean, fromKey: string, toKey: string): "fin" | "encours" | null {
  if (!start) return null;
  const startKey = monthKeyOf(start)!;
  if (startKey > toKey) return null;
  if (closed) {
    if (end) {
      const endKey = monthKeyOf(end)!;
      if (endKey < fromKey) return null;
      return endKey <= toKey ? "fin" : "encours";
    }
    return startKey >= fromKey && startKey <= toKey ? "fin" : null;
  }
  return "encours";
}

export interface BilanRow {
  origine: "Opérationnel" | "Transverse" | "To do";
  sujet: string;
  quoi: string;
  ent: string;
  start: Date | null;
  end: Date | null;
  statut: "fin" | "encours";
  sortKey: Date | null;
}

export interface BilanPeriodeOptions {
  fromKey: string;
  toKey: string;
  statusFilter: "tous" | "encours" | "fin";
  origineFilter: "tous" | BilanRow["origine"];
  entiteFilter: string;
  search: string;
}

export function bilanPeriode(
  operations: Operation[],
  transverses: Transverse[],
  todos: Todo[],
  opts: BilanPeriodeOptions,
): { all: BilanRow[]; filtered: BilanRow[]; entites: string[] } {
  let { fromKey, toKey } = opts;
  if (fromKey > toKey) [fromKey, toKey] = [toKey, fromKey];
  const all: BilanRow[] = [];

  for (const o of operations) {
    const start = parseFrDate(o.date);
    const end = parseFrDate(o.dateLivraison) ?? parseFrDate(o.dateCmd) ?? parseFrDate(o.retour);
    const statut = statusInRange(start, end, isClos(o.etape), fromKey, toKey);
    if (!statut) continue;
    all.push({ origine: "Opérationnel", sujet: o.nom || o.chant || "—", quoi: o.prec || o.etape || "—", ent: o.ent || "—", start, end, statut, sortKey: end ?? start });
  }
  for (const t of transverses) {
    const start = parseFrDate(t.date);
    const end = parseFrDate(t.retour);
    const statut = statusInRange(start, end, (t.statut ?? "Actif") === "Clôturé", fromKey, toKey);
    if (!statut) continue;
    all.push({ origine: "Transverse", sujet: t.nom || t.dem || "—", quoi: t.action || t.prec || "—", ent: t.ent || "—", start, end, statut, sortKey: end ?? start });
  }
  for (const d of todos) {
    const start = parseFrDate(d.deadline);
    const end = parseFrDate(d.deadlineAction);
    const statut = statusInRange(start, end, (d.statut ?? "Actif") === "Clôturé", fromKey, toKey);
    if (!statut) continue;
    all.push({ origine: "To do", sujet: d.qui || "—", quoi: d.quoi || d.action || "—", ent: "—", start, end, statut, sortKey: end ?? start });
  }

  const entites = [...new Set(all.map((r) => r.ent).filter((e) => e && e !== "—"))].sort();

  const search = opts.search.trim().toLowerCase();
  const filtered = all.filter((r) => {
    if (opts.statusFilter !== "tous" && r.statut !== opts.statusFilter) return false;
    if (opts.origineFilter !== "tous" && r.origine !== opts.origineFilter) return false;
    if (opts.entiteFilter !== "tous" && r.ent !== opts.entiteFilter) return false;
    if (search) {
      const hay = `${r.sujet} ${r.quoi} ${r.ent}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
  filtered.sort((a, b) => (b.sortKey?.getTime() ?? 0) - (a.sortKey?.getTime() ?? 0));

  return { all, filtered, entites };
}
