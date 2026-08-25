import { prisma } from "./prisma.js";

/**
 * Reprend syncLivFromOp() de l'outil d'origine : toute opération de type
 * "exploitation" ayant un numéro de commande alimente/actualise
 * automatiquement une ligne du suivi Livraisons, pour éviter à
 * l'utilisateur de ressaisir à la main des données déjà présentes dans
 * l'Opérationnel. Les champs propres au suivi livraison (confirmation,
 * date de livraison réelle, remarques) ne sont jamais écrasés : seuls les
 * champs "miroir" de l'opération source sont resynchronisés. Une ligne
 * saisie manuellement (operationId = null) n'est jamais affectée.
 */
export async function syncLivraisonsFromOperations(): Promise<void> {
  const operations = await prisma.operation.findMany({
    where: {
      numCmd: { not: null },
      type: { contains: "exploitation" },
    },
  });
  const qualifying = operations.filter((o) => o.numCmd && o.numCmd.trim());

  for (const o of qualifying) {
    const mirror = {
      chant: o.chant,
      nom: o.nom,
      ent: o.ent,
      dem: o.dem,
      numCmd: o.numCmd,
      fournisseur: o.fournisseur,
      prec: o.prec,
      montant: o.montant,
      dateCmd: o.dateCmd,
      dateLivraison: o.dateLivraison,
    };
    await prisma.livraison.upsert({
      where: { operationId: o.id },
      update: mirror,
      create: { operationId: o.id, ...mirror },
    });
  }

  // Une opération qui a perdu son n° de commande (ou changé de type) ne
  // doit plus avoir de ligne Livraisons associée.
  const qualifyingIds = qualifying.map((o) => o.id);
  await prisma.livraison.deleteMany({
    where: {
      operationId: { not: null, notIn: qualifyingIds },
    },
  });
}
