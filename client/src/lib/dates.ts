// Les dates sont saisies librement au format jj/mm/aa, comme dans l'outil
// d'origine. On les convertit en Date uniquement pour comparer/calculer un
// retard, jamais pour forcer un format de saisie.
export function parseFrDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, dd, mm, yyRaw] = m;
  const yy = yyRaw.length === 2 ? 2000 + Number(yyRaw) : Number(yyRaw);
  return new Date(yy, Number(mm) - 1, Number(dd));
}

export function joursRetard(livraisonPrevue: string | null, livraisonReelle: string | null): number | null {
  const prevue = parseFrDate(livraisonPrevue);
  const reelle = parseFrDate(livraisonReelle);
  if (!prevue) return null;
  const ref = reelle ?? new Date();
  const diffMs = ref.setHours(0, 0, 0, 0) - prevue.setHours(0, 0, 0, 0);
  return Math.round(diffMs / 86_400_000);
}

export function statutLivraison(livraisonPrevue: string | null, livraisonReelle: string | null): string {
  if (livraisonReelle) {
    const jr = joursRetard(livraisonPrevue, livraisonReelle);
    if (jr === null) return "Livré";
    return jr > 0 ? `Livré (${jr}j retard)` : "Livré à temps";
  }
  const jr = joursRetard(livraisonPrevue, null);
  if (jr === null) return "En attente";
  return jr > 0 ? `En retard (${jr}j)` : "En cours";
}
