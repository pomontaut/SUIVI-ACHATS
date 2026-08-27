import { dateVal } from "./tableFilter";
import { isAtt, isClos } from "./etape";
import { joursRetard, livraisonCategorie, parseFrDate, workingDaysBetween } from "./dates";
import { isAutoPrioType, operationNeedsWarning, operationPrio, prioRank } from "./priority";
import type { Fournisseur, Livraison, NonConformite, Operation, Options, Todo, Transverse } from "../types";

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
  count: number;
  pct: number;
  color: string;
}

export function gainByTypeBreakdown(operations: Operation[]): { rows: GainTypeResult[]; total: number; totalCount: number } {
  const byCat: Record<string, number> = Object.fromEntries(GAIN_CATS.map((c) => [c, 0]));
  const countByCat: Record<string, number> = Object.fromEntries(GAIN_CATS.map((c) => [c, 0]));
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
      countByCat[cat] += 1;
    }
  }
  const total = Object.values(byCat).reduce((s, v) => s + v, 0);
  const totalCount = Object.values(countByCat).reduce((s, v) => s + v, 0);
  // pct calculé sur le nombre de commandes de la catégorie (nombre et %), pas sur le montant
  const rows = GAIN_CATS.map((key, i) => ({
    key,
    value: byCat[key],
    count: countByCat[key],
    color: COL_GAIN[i],
    pct: totalCount > 0 ? Math.round((countByCat[key] / totalCount) * 100) : 0,
  }));
  return { rows, total, totalCount };
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

// ===== Top 10 priorités (tous modules confondus) =====

export interface TopPrioItem {
  id: string;
  origine: "Opérationnel" | "Transverse" | "To do";
  type: string;
  prio: string;
  sujet: string;
  quoi: string;
  ent: string;
  echeance: string | null;
  warning: boolean;
  vuDate: string | null;
  isExploitation: boolean;
}

/**
 * Combine Opérationnel/Transverse/To do en une seule liste triée par
 * urgence réelle : un sujet "sur le point de se terminer" (échéance
 * dépassée ou à J-1, tous types confondus) passe toujours en premier ;
 * sinon les sujets exploitation priment sur tout le reste ; à égalité, tri
 * par priorité (P0 → P4).
 */
export function top10Priorites(operations: Operation[], transverses: Transverse[], todos: Todo[]): TopPrioItem[] {
  const opItems: TopPrioItem[] = operations
    .filter((o) => !isClos(o.etape))
    .map((o) => {
      const kind = isAutoPrioType(o.type);
      return {
        id: o.id,
        origine: "Opérationnel" as const,
        type: o.type || "—",
        prio: operationPrio(o),
        sujet: o.nom || o.chant || "—",
        quoi: o.prec || o.etape || "—",
        ent: o.ent || "—",
        echeance: kind === "exploitation" ? o.retourMax : kind === "sla" ? o.retour : null,
        warning: operationNeedsWarning(o),
        vuDate: o.vuDate,
        isExploitation: kind === "exploitation",
      };
    });

  const trItems: TopPrioItem[] = transverses
    .filter((t) => (t.statut ?? "Actif") !== "Clôturé")
    .map((t) => ({
      id: t.id,
      origine: "Transverse" as const,
      type: t.type || "Transverse",
      prio: t.prio ?? "",
      sujet: t.nom || t.dem || "—",
      quoi: t.action || t.prec || "—",
      ent: t.ent || "—",
      echeance: t.retour,
      warning: needsWarningForDeadline(t.retour),
      vuDate: t.vuDate,
      isExploitation: false,
    }));

  const tdItems: TopPrioItem[] = todos
    .filter((d) => (d.statut ?? "Actif") !== "Clôturé")
    .map((d) => ({
      id: d.id,
      origine: "To do" as const,
      type: "To do",
      prio: d.prio ?? "",
      sujet: d.qui || "—",
      quoi: d.quoi || d.action || "—",
      ent: "—",
      echeance: d.deadlineAction || d.deadline,
      warning: needsWarningForDeadline(d.deadlineAction || d.deadline),
      vuDate: d.vuDate,
      isExploitation: false,
    }));

  const tier = (it: TopPrioItem) => (it.warning ? 0 : it.isExploitation ? 1 : 2);
  const all = [...opItems, ...trItems, ...tdItems];
  all.sort((a, b) => tier(a) - tier(b) || prioRank(a.prio) - prioRank(b.prio));

  return all.slice(0, 10);
}

// ===== Ratio commandes < seuil vs reste =====

export interface RatioSeuilResult {
  seuil: number;
  countBelow: number;
  countAbove: number;
  montantBelow: number;
  montantAbove: number;
  pctCountBelow: number;
  pctMontantBelow: number;
}

export function ratioSeuil(operations: Operation[], seuil = 5000): RatioSeuilResult {
  const rows = operations.filter((o) => num(o.montant) > 0);
  let countBelow = 0, countAbove = 0, montantBelow = 0, montantAbove = 0;
  for (const o of rows) {
    const m = num(o.montant);
    if (m < seuil) { countBelow++; montantBelow += m; } else { countAbove++; montantAbove += m; }
  }
  const totalCount = countBelow + countAbove;
  const totalMontant = montantBelow + montantAbove;
  return {
    seuil, countBelow, countAbove, montantBelow, montantAbove,
    pctCountBelow: totalCount > 0 ? Math.round((countBelow / totalCount) * 100) : 0,
    pctMontantBelow: totalMontant > 0 ? Math.round((montantBelow / totalMontant) * 100) : 0,
  };
}

export interface RatioSeuilMonthPoint {
  monthKey: string;
  label: string;
  countBelow: number;
  countAbove: number;
  montantBelow: number;
  montantAbove: number;
  // null = aucune commande ce mois-là (à distinguer d'un ratio réellement à 0%)
  pctCountBelow: number | null;
  pctMontantBelow: number | null;
}

/** Évolution sur N mois du ratio commandes < seuil vs reste, pour repérer une
 * dérive de la dépense hors des sujets suivis (nombre et montant).
 *
 * Le mois en cours est exclu : ses données sont par nature partielles (on
 * n'est qu'au début ou au milieu du mois), ce qui produit un ratio non
 * représentatif et trompeur sur seulement 2-3 commandes passées depuis le
 * 1er. La fenêtre porte donc sur les N derniers mois CIVILS COMPLETS. Un
 * mois sans aucune commande retourne un pourcentage null (point non tracé)
 * plutôt que 0%, pour ne pas laisser croire que 0% des commandes de ce
 * mois étaient sous le seuil alors qu'il n'y en a simplement eu aucune. */
export function ratioSeuilEvolution(operations: Operation[], months = 6, seuil = 5000): RatioSeuilMonthPoint[] {
  const now = new Date();
  const keys: { key: string; label: string }[] = [];
  for (let i = months; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-CH", { month: "short", year: "2-digit" });
    keys.push({ key, label });
  }
  return keys.map(({ key, label }) => {
    const rows = operations.filter((o) => {
      if (num(o.montant) <= 0) return false;
      const d = parseFrDate(o.dateCmd) ?? parseFrDate(o.date);
      return d ? monthKeyOf(d) === key : false;
    });
    let countBelow = 0, countAbove = 0, montantBelow = 0, montantAbove = 0;
    for (const o of rows) {
      const m = num(o.montant);
      if (m < seuil) { countBelow++; montantBelow += m; } else { countAbove++; montantAbove += m; }
    }
    const totalCount = countBelow + countAbove;
    const totalMontant = montantBelow + montantAbove;
    return {
      monthKey: key, label, countBelow, countAbove, montantBelow, montantAbove,
      pctCountBelow: totalCount > 0 ? Math.round((countBelow / totalCount) * 100) : null,
      pctMontantBelow: totalMontant > 0 ? Math.round((montantBelow / totalMontant) * 100) : null,
    };
  });
}

// ===== Analyse dépense fournisseur (chantier / marchandise / fournisseur) =====

export interface DepBreakdownRow {
  key: string;
  total: number;
  count: number;
  pct: number;
  color: string;
}

function groupByMontant(rows: Operation[], keyFn: (o: Operation) => string, colors = DEP_FOURN_COLORS): DepBreakdownRow[] {
  const m = new Map<string, { total: number; count: number }>();
  for (const o of rows) {
    const k = keyFn(o) || "(inconnu)";
    const e = m.get(k) ?? { total: 0, count: 0 };
    e.total += num(o.montant);
    e.count++;
    m.set(k, e);
  }
  const sorted = [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  const total = sorted.reduce((s, [, v]) => s + v.total, 0);
  return sorted.map(([key, v], i) => ({
    key, total: v.total, count: v.count,
    pct: total > 0 ? Math.round((v.total / total) * 100) : 0,
    color: colors[i % colors.length],
  }));
}

/** Bornes mois min/max des commandes présentes (pour initialiser un filtre
 * de période sur toute la donnée disponible). */
export function monthRangeOf(operations: Operation[]): { minKey: string; maxKey: string } {
  const keys = operations
    .map((o) => monthKeyOf(parseFrDate(o.dateCmd) ?? parseFrDate(o.date)))
    .filter((k): k is string => Boolean(k));
  const cur = monthKeyOf(new Date())!;
  if (keys.length === 0) return { minKey: cur, maxKey: cur };
  return { minKey: keys.reduce((a, b) => (a < b ? a : b)), maxKey: keys.reduce((a, b) => (a > b ? a : b)) };
}

export interface DepenseAnalysis {
  byFournisseur: DepBreakdownRow[];
  byChantier: DepBreakdownRow[];
  byMarchandise: DepBreakdownRow[];
  total: number;
  count: number;
}

export function analyseDepense(operations: Operation[], fromKey: string, toKey: string): DepenseAnalysis {
  const rows = operations.filter((o) => {
    if (num(o.montant) <= 0) return false;
    const d = parseFrDate(o.dateCmd) ?? parseFrDate(o.date);
    const k = monthKeyOf(d);
    return k !== null && k >= fromKey && k <= toKey;
  });
  const total = rows.reduce((s, o) => s + num(o.montant), 0);
  return {
    byFournisseur: groupByMontant(rows, (o) => (o.fournisseur ?? "").trim() || "(inconnu)"),
    byChantier: groupByMontant(rows, (o) => o.nom || o.chant || "(inconnu)"),
    byMarchandise: groupByMontant(rows, (o) => o.fourn || "Autres"),
    total,
    count: rows.length,
  };
}

// ===== Analyse détaillée d'un fournisseur (drill-down) =====

export interface FournisseurOrderRow {
  numCmd: string;
  chant: string;
  nom: string;
  montant: number;
  dateCmd: string;
  dateLivraison: string;
}

export interface FournisseurMonthPoint {
  monthKey: string;
  montant: number;
  count: number;
}

export interface FournisseurDrilldown {
  fournisseur: string;
  totalMontant: number;
  nombreCommandes: number;
  orders: FournisseurOrderRow[];
  byMonth: FournisseurMonthPoint[];
  byChantier: DepBreakdownRow[];
  byMarchandise: DepBreakdownRow[];
  marchandiseByChantier: { chantier: string; rows: DepBreakdownRow[] }[];
  tauxServiceMoyen: number | null;
  ncCount: number;
  ncCountMineur: number;
  ncCountMajeur: number;
  ncByTypologie: DepBreakdownRow[];
  montantNcTotal: number;
  montantNcRecupere: number;
  pctRecuperation: number;
  ncList: NonConformite[];
}

export function fournisseurDrilldown(
  operations: Operation[],
  livraisons: Livraison[],
  nonConformites: NonConformite[],
  fournisseur: string,
): FournisseurDrilldown {
  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  const target = norm(fournisseur);

  const ops = operations.filter((o) => norm(o.fournisseur) === target && num(o.montant) > 0);
  const totalMontant = ops.reduce((s, o) => s + num(o.montant), 0);
  const orders: FournisseurOrderRow[] = ops
    .map((o) => ({ numCmd: o.numCmd || "—", chant: o.chant || "—", nom: o.nom || "—", montant: num(o.montant), dateCmd: o.dateCmd || "—", dateLivraison: o.dateLivraison || "—" }))
    .sort((a, b) => dateVal(b.dateCmd) - dateVal(a.dateCmd));

  const monthMap = new Map<string, { montant: number; count: number }>();
  for (const o of ops) {
    const d = parseFrDate(o.dateCmd) ?? parseFrDate(o.date);
    const k = monthKeyOf(d);
    if (!k) continue;
    const e = monthMap.get(k) ?? { montant: 0, count: 0 };
    e.montant += num(o.montant);
    e.count++;
    monthMap.set(k, e);
  }
  const byMonth = [...monthMap.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([monthKey, v]) => ({ monthKey, montant: v.montant, count: v.count }));

  const byChantier = groupByMontant(ops, (o) => o.nom || o.chant || "(inconnu)");
  const byMarchandise = groupByMontant(ops, (o) => o.fourn || "Autres");

  const chantiers = [...new Set(ops.map((o) => o.nom || o.chant || "(inconnu)"))];
  const marchandiseByChantier = chantiers.map((c) => ({
    chantier: c,
    rows: groupByMontant(ops.filter((o) => (o.nom || o.chant || "(inconnu)") === c), (o) => o.fourn || "Autres"),
  }));

  const livF = livraisons.filter((l) => norm(l.fournisseur) === target);
  const ts = tauxService(livF);
  const tauxServiceMoyen = ts.denom > 0 ? ts.ts : null;

  const ncF = nonConformites.filter((n) => norm(n.fournisseur) === target);
  const ncCountMineur = ncF.filter((n) => n.typeNC === "Mineur").length;
  const ncCountMajeur = ncF.filter((n) => n.typeNC === "Majeur" || n.typeNC === "Critique").length;
  const montantNcTotal = ncF.reduce((s, n) => s + num(n.montantNC), 0);
  const montantNcRecupere = ncF.reduce((s, n) => s + num(n.noteCredit), 0);
  const pctRecuperation = montantNcTotal > 0 ? Math.round((montantNcRecupere / montantNcTotal) * 100) : 0;

  const ncTypMap = new Map<string, { total: number; count: number }>();
  for (const n of ncF) {
    const k = n.catNC || "Autre";
    const e = ncTypMap.get(k) ?? { total: 0, count: 0 };
    e.total += num(n.montantNC);
    e.count++;
    ncTypMap.set(k, e);
  }
  const ncSorted = [...ncTypMap.entries()].sort((a, b) => b[1].count - a[1].count);
  const ncTotalCount = ncSorted.reduce((s, [, v]) => s + v.count, 0);
  const ncByTypologie = ncSorted.map(([key, v], i) => ({
    key, total: v.total, count: v.count,
    pct: ncTotalCount > 0 ? Math.round((v.count / ncTotalCount) * 100) : 0,
    color: DEP_FOURN_COLORS[i % DEP_FOURN_COLORS.length],
  }));

  return {
    fournisseur, totalMontant, nombreCommandes: ops.length, orders, byMonth, byChantier, byMarchandise, marchandiseByChantier,
    tauxServiceMoyen, ncCount: ncF.length, ncCountMineur, ncCountMajeur, ncByTypologie,
    montantNcTotal, montantNcRecupere, pctRecuperation, ncList: ncF,
  };
}

// ===== KPI nouveaux fournisseurs (ajoutés manuellement hors référentiel) =====

export interface NouveauFournisseurRow {
  nom: string;
  npa: string | null;
  ville: string | null;
  pays: string | null;
  createdAt: string | null;
  aCommande: boolean;
  montantTotal: number;
  gainTotal: number;
}

export interface NouveauxFournisseursKpi {
  rows: NouveauFournisseurRow[];
  total: number;
  avecCommande: number;
  pctAvecCommande: number;
  gainCumule: number;
  suisseCount: number;
  horsSuisseCount: number;
  pctHorsSuisse: number;
}

export function nouveauxFournisseursKpi(fournisseursManuel: Fournisseur[], operations: Operation[]): NouveauxFournisseursKpi {
  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

  const rows: NouveauFournisseurRow[] = fournisseursManuel.map((f) => {
    const ops = operations.filter((o) => norm(o.fournisseur) === norm(f.nom));
    const montantTotal = ops.reduce((s, o) => s + num(o.montant), 0);
    let gainTotal = 0;
    for (const o of ops) {
      const b = numOrNaN(o.budget);
      const m = numOrNaN(o.montant);
      const g = numOrNaN(o.gain);
      if (!Number.isNaN(b) && b > 0) gainTotal += b - m;
      else if (!Number.isNaN(g)) gainTotal += g;
    }
    return {
      nom: f.nom, npa: f.npa, ville: f.ville, pays: f.pays,
      createdAt: f.createdAt ?? null,
      aCommande: ops.some((o) => num(o.montant) > 0),
      montantTotal, gainTotal,
    };
  });

  const total = rows.length;
  const avecCommande = rows.filter((r) => r.aCommande).length;
  const gainCumule = rows.reduce((s, r) => s + r.gainTotal, 0);
  const suisseCount = fournisseursManuel.filter((f) => (f.pays ?? "").toUpperCase() === "CH").length;
  const horsSuisseCount = fournisseursManuel.filter((f) => f.pays && f.pays.toUpperCase() !== "CH").length;

  return {
    rows: rows.sort((a, b) => b.montantTotal - a.montantTotal),
    total, avecCommande,
    pctAvecCommande: total > 0 ? Math.round((avecCommande / total) * 100) : 0,
    gainCumule, suisseCount, horsSuisseCount,
    pctHorsSuisse: total > 0 ? Math.round((horsSuisseCount / total) * 100) : 0,
  };
}
