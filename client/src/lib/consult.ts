/** Séparateur utilisé pour stocker plusieurs fournisseurs consultés dans le
 * champ texte unique Operation.consult (liste de tags côté UI). */
const SEP = " | ";

export function parseConsult(consult: string | null): string[] {
  if (!consult || !consult.trim()) return [];
  if (consult.includes(SEP)) return consult.split(SEP).map((s) => s.trim()).filter(Boolean);
  // Texte hérité de l'ancien outil, pas forcément découpable proprement :
  // traité comme une entrée unique tant qu'il n'a pas été retouché via le picker.
  return [consult.trim()];
}

export function joinConsult(fournisseurs: string[]): string | null {
  const clean = fournisseurs.map((f) => f.trim()).filter(Boolean);
  return clean.length ? clean.join(SEP) : null;
}
