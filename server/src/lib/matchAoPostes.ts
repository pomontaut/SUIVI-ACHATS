import { prisma } from "./prisma.js";
import type { PosteExtrait } from "./extractOffre.js";

/** Même clé de regroupement que côté client (AppelsOffresPage.tsx#buildAoGroups) :
 * un "sujet AO" = même date + même chantier + même objet (Précisions). */
export function aoSujetKeyOf(row: { date: string | null; chant: string | null; prec: string | null }): string {
  return `${row.date ?? ""}|${row.chant ?? ""}|${(row.prec ?? "").trim().toLowerCase()}`;
}

function norm(s: string | null | undefined): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Rattache les postes extraits automatiquement d'une offre à la ligne
 * AppelOffre correspondante : fait correspondre chaque poste extrait à un
 * AoPoste existant du même sujet (par référence, puis par libellé
 * normalisés), sinon en crée un nouveau. Ne touche jamais un montant déjà
 * saisi/confirmé à la main sur ce poste pour ce fournisseur - un nouvel
 * upload ne remplace qu'une valeur elle-même issue d'une extraction
 * automatique précédente (ou absente).
 */
export async function matchAoPostesFromExtraction(
  appelOffreId: string,
  sujetCle: string,
  postes: PosteExtrait[],
): Promise<void> {
  const chiffres = postes.filter((p) => p.montantHT !== null);
  if (chiffres.length === 0) return;

  const existing = await prisma.aoPoste.findMany({ where: { sujetCle }, orderBy: { ordre: "asc" } });
  const byRef = new Map(existing.filter((p) => p.reference).map((p) => [norm(p.reference), p]));
  const byLibelle = new Map(existing.filter((p) => p.libelle).map((p) => [norm(p.libelle), p]));
  let nextOrdre = existing.reduce((m, p) => Math.max(m, p.ordre), -1) + 1;

  for (const extracted of chiffres) {
    let poste = (extracted.reference && byRef.get(norm(extracted.reference))) || byLibelle.get(norm(extracted.libelle));
    if (!poste) {
      poste = await prisma.aoPoste.create({
        data: { sujetCle, reference: extracted.reference, libelle: extracted.libelle, ordre: nextOrdre++ },
      });
      if (poste.reference) byRef.set(norm(poste.reference), poste);
      if (poste.libelle) byLibelle.set(norm(poste.libelle), poste);
    }

    const existingMontant = await prisma.aoPosteMontant.findUnique({
      where: { posteId_appelOffreId: { posteId: poste.id, appelOffreId } },
    });
    if (existingMontant && !existingMontant.montantAuto && existingMontant.montant) continue;

    await prisma.aoPosteMontant.upsert({
      where: { posteId_appelOffreId: { posteId: poste.id, appelOffreId } },
      update: { montant: String(extracted.montantHT), montantAuto: true },
      create: { posteId: poste.id, appelOffreId, montant: String(extracted.montantHT), montantAuto: true },
    });
  }
}
