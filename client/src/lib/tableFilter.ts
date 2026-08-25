// Aide au tri/filtrage des tableaux, reprenant la logique de l'outil HTML
// d'origine (dateVal/numVal/strVal/compareVals).

export function dateVal(s: string | null | undefined): number {
  if (!s || s === "-" || s === "done") return 0;
  const p = s.split("/");
  if (p.length === 3) {
    const yy = parseInt(p[2], 10);
    const mm = parseInt(p[1], 10);
    const dd = parseInt(p[0], 10);
    if (!Number.isNaN(yy) && !Number.isNaN(mm) && !Number.isNaN(dd)) {
      return (2000 + (yy % 100)) * 10000 + mm * 100 + dd;
    }
  }
  return 0;
}

export function numVal(s: string | null | undefined): number {
  const n = parseFloat(String(s ?? ""));
  return Number.isNaN(n) ? -Infinity : n;
}

export function strVal(s: string | null | undefined): string {
  return (s ?? "").toLowerCase();
}

export type ColType = "str" | "num" | "date" | "select" | "bool";

export function compareVals(a: string | null | undefined, b: string | null | undefined, type: ColType, dir: "asc" | "desc"): number {
  let v: number;
  if (type === "date") v = dateVal(a) - dateVal(b);
  else if (type === "num") v = numVal(a) - numVal(b);
  else v = strVal(a) < strVal(b) ? -1 : strVal(a) > strVal(b) ? 1 : 0;
  return dir === "asc" ? v : -v;
}

export type ColFilterValue = string[] | { min?: string; max?: string } | { from?: string; to?: string };

export function isColFilterActive(fv: ColFilterValue | undefined): boolean {
  if (!fv) return false;
  if (Array.isArray(fv)) return fv.length > 0;
  const range = fv as { min?: string; max?: string; from?: string; to?: string };
  return Boolean(range.min || range.max || range.from || range.to);
}
