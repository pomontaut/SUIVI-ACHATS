/** Parse une date saisie au format jj/mm/aa(aa) ou jj.mm.aa(aa) ; retourne
 * null si le format ne correspond pas. */
export function parseDdMmYy(d: string | null | undefined): Date | null {
  if (!d) return null;
  const m = d.trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yy = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const date = new Date(Date.UTC(yy, mm - 1, dd));
  return Number.isNaN(date.getTime()) ? null : date;
}
