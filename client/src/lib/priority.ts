import { parseFrDate, workingDaysBetween } from "./dates";
import { isClos } from "./etape";
import type { Operation } from "../types";

export type PrioLevel = "P0" | "P1" | "P2" | "P3" | "P4" | "";

const ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, "": 5 };

export function prioRank(p: string | null | undefined): number {
  return ORDER[p ?? ""] ?? 5;
}

export const PRIO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  P0: { bg: "#FCEBEB", text: "#A32D2D", border: "#e8b4b4" },
  P1: { bg: "#FAEEDA", text: "#854F0B", border: "#e8d19f" },
  P2: { bg: "#E6F1FB", text: "#185FA5", border: "#b8d7f2" },
  P3: { bg: "#F1EFE8", text: "#5F5E5A", border: "#dedcd3" },
  P4: { bg: "#F5F4F0", text: "#888780", border: "#e3e1d9" },
  "": { bg: "#F5F4F0", text: "#888780", border: "#e3e1d9" },
};

/** Reprend calcAutoPrio() de l'outil d'origine : priorité calculée à partir
 * du nombre de jours ouvrés restants avant une échéance (retourMax pour les
 * sujets exploitation, retour pour les sujets soumission / Suivi SLA). */
function calcPrioFromDeadline(dateRef: string | null, deadline: string | null, closed: boolean, manual: string | null): PrioLevel {
  if (closed) return (manual as PrioLevel) || "P3";
  const ref = parseFrDate(dateRef);
  const max = parseFrDate(deadline);
  if (!ref || !max) return "P0";
  const jours = workingDaysBetween(new Date(), max);
  if (jours === null || jours < 0) return "P0";
  if (jours <= 4) return "P0";
  if (jours <= 8) return "P1";
  if (jours <= 15) return "P2";
  return "P3";
}

/** Types de sujets pour lesquels la priorité est calculée automatiquement
 * plutôt que saisie manuellement. */
export function isAutoPrioType(type: string | null): "exploitation" | "sla" | null {
  const t = (type ?? "").toLowerCase();
  if (t.includes("exploitation")) return "exploitation";
  if (t === "soumission" || t === "suivi sla") return "sla";
  return null;
}

/** Priorité effective d'une opération : calculée automatiquement pour les
 * sujets exploitation (échéance = retourMax) et soumission/Suivi SLA
 * (échéance = retour), sinon la valeur saisie manuellement. */
export function operationPrio(o: Operation): PrioLevel {
  const kind = isAutoPrioType(o.type);
  const closed = isClos(o.etape);
  if (kind === "exploitation") return calcPrioFromDeadline(o.date, o.retourMax, closed, o.prio);
  if (kind === "sla") return calcPrioFromDeadline(o.date, o.retour, closed, o.prio);
  return (o.prio as PrioLevel) ?? "";
}

export function operationNeedsWarning(o: Operation): boolean {
  if (isClos(o.etape)) return false;
  const kind = isAutoPrioType(o.type);
  const deadline = kind === "exploitation" ? o.retourMax : kind === "sla" ? o.retour : null;
  if (kind === null) return false;
  const max = parseFrDate(deadline);
  if (!max) return true;
  const jours = workingDaysBetween(new Date(), max);
  return jours !== null && jours <= 1;
}
