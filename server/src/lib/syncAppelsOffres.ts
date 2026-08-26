import { prisma } from "./prisma.js";
import { parseConsult } from "./consult.js";

/**
 * Toute opération dont le TCO est "oui" génère/actualise automatiquement une
 * ligne Appel d'offres par fournisseur listé dans sa colonne Consultation,
 * pour éviter à l'utilisateur de ressaisir à la main des données déjà
 * présentes dans l'Opérationnel. Les champs propres au suivi de l'appel
 * d'offres (offre du fournisseur, comparatif technique, statut...) ne sont
 * jamais écrasés : seuls les champs "miroir" de l'opération source sont
 * resynchronisés. Une ligne saisie manuellement (operationId = null) n'est
 * jamais affectée.
 */
export async function syncAppelsOffresFromOperations(): Promise<void> {
  const operations = await prisma.operation.findMany({
    where: { tco: { equals: "oui" } },
  });

  const qualifyingPairs: { operationId: string; fournisseur: string }[] = [];

  for (const o of operations) {
    const fournisseurs = parseConsult(o.consult);
    for (const fournisseur of fournisseurs) {
      qualifyingPairs.push({ operationId: o.id, fournisseur });
      const mirror = {
        date: o.date, chant: o.chant, nom: o.nom, ent: o.ent, dem: o.dem, prec: o.prec,
      };
      await prisma.appelOffre.upsert({
        where: { operationId_fournisseur: { operationId: o.id, fournisseur } },
        update: mirror,
        create: { operationId: o.id, fournisseur, ...mirror },
      });
    }
  }

  // Un appel d'offres auto-généré dont l'opération n'est plus TCO=oui, ou
  // dont le fournisseur a été retiré de la consultation, ne doit plus exister.
  const existingAuto = await prisma.appelOffre.findMany({
    where: { operationId: { not: null } },
    select: { id: true, operationId: true, fournisseur: true },
  });
  const qualifyingKeys = new Set(qualifyingPairs.map((p) => `${p.operationId}|${p.fournisseur}`));
  const orphanIds = existingAuto
    .filter((a) => !qualifyingKeys.has(`${a.operationId}|${a.fournisseur}`))
    .map((a) => a.id);
  if (orphanIds.length > 0) {
    await prisma.appelOffre.deleteMany({ where: { id: { in: orphanIds } } });
  }
}
