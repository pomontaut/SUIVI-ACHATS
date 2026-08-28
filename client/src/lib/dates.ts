// Les dates sont saisies librement au format jj/mm/aa, comme dans l'outil
// d'origine. On les convertit en Date uniquement pour comparer/calculer un
// retard, jamais pour forcer un format de saisie.
export function parseFrDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  // Accepte "/" et "." comme séparateur (les deux se rencontrent dans les
  // données saisies/importées, ex: 20.08.2026 vs 20/08/2026) - sinon les
  // dates au format à points sont silencieusement ignorées par tout calcul
  // basé sur cette fonction (priorités, regroupements mensuels du tableau
  // de bord...) sans qu'aucune erreur ne le signale.
  const m = s.trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (!m) return null;
  const [, dd, mm, yyRaw] = m;
  const yy = yyRaw.length === 2 ? 2000 + Number(yyRaw) : Number(yyRaw);
  const d = new Date(yy, Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Nombre de jours ouvrés (lun-ven) entre deux dates (exclut le jour de fin). */
export function workingDaysBetween(d1: Date | null, d2: Date | null): number | null {
  if (!d1 || !d2) return null;
  let count = 0;
  const cur = new Date(d1);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(d2);
  end.setHours(0, 0, 0, 0);
  if (cur >= end) return 0;
  while (cur < end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Vrai si la livraison a du retard (livrée en retard, ou pas encore livrée et échéance dépassée). */
export function isLivRetard(dateLivraison: string | null, dateLivraisonReelle: string | null): boolean {
  const prevue = parseFrDate(dateLivraison);
  if (!prevue) return false;
  const reelle = parseFrDate(dateLivraisonReelle);
  if (!reelle) return today() > prevue;
  return reelle > prevue;
}

/** Nombre de jours de retard (0 si à l'heure ou sans date prévue). */
export function joursRetard(dateLivraison: string | null, dateLivraisonReelle: string | null): number {
  const prevue = parseFrDate(dateLivraison);
  if (!prevue) return 0;
  const ref = parseFrDate(dateLivraisonReelle) ?? new Date();
  const diff = Math.round((ref.getTime() - prevue.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/** Catégorie à 3 états reprise de getLivStatutFromRow dans l'outil d'origine. */
export type LivraisonCategorie = "retard" | "encours" | "livre";

export function livraisonCategorie(dateLivraison: string | null, dateLivraisonReelle: string | null): LivraisonCategorie {
  const reelle = parseFrDate(dateLivraisonReelle);
  if (!reelle) {
    const prevue = parseFrDate(dateLivraison);
    if (prevue && today() > prevue) return "retard";
    return "encours";
  }
  return "livre";
}

export function statutLivraisonLabel(dateLivraison: string | null, dateLivraisonReelle: string | null): string {
  const cat = livraisonCategorie(dateLivraison, dateLivraisonReelle);
  if (cat === "livre") {
    const jr = joursRetard(dateLivraison, dateLivraisonReelle);
    return jr > 0 ? `Livré (${jr}j retard)` : "Livré à temps";
  }
  if (cat === "retard") return `En retard (${joursRetard(dateLivraison, null)}j)`;
  return "En cours";
}
