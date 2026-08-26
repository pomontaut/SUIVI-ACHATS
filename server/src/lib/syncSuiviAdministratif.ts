import { prisma } from "./prisma.js";
import { parseDdMmYy } from "./dateUtil.js";

// Le suivi administratif ne doit reprendre que les commandes passées à
// partir de cette date : les nombreux n° de commande déjà présents dans les
// données reprises (souvent de simples espaces réservés type "x") ne
// doivent pas polluer ce nouvel onglet.
const DEBUT_SUIVI = Date.UTC(2026, 7, 25); // 25/08/2026

/**
 * Reporte automatiquement dans le Suivi Administratif toute opération dont
 * le n° de commande a été saisi à partir du 25/08/2026. Les champs propres
 * à ce suivi (confirmation, BL) ne sont jamais écrasés : seuls les champs
 * "miroir" de l'opération source sont resynchronisés.
 */
export async function syncSuiviAdministratifFromOperations(): Promise<void> {
  const operations = await prisma.operation.findMany({ where: { numCmd: { not: null } } });
  const qualifying = operations.filter((o) => {
    if (!o.numCmd || !o.numCmd.trim()) return false;
    const d = parseDdMmYy(o.dateCmd);
    return d !== null && d.getTime() >= DEBUT_SUIVI;
  });

  for (const o of qualifying) {
    const mirror = {
      date: o.date,
      chant: o.chant,
      nom: o.nom,
      ent: o.ent,
      dem: o.dem,
      fournisseur: o.fournisseur,
      prec: o.prec,
      fourn: o.fourn,
      numCmd: o.numCmd,
      dateCmd: o.dateCmd,
    };
    await prisma.suiviAdministratif.upsert({
      where: { operationId: o.id },
      update: mirror,
      create: { operationId: o.id, ...mirror },
    });
  }

  const qualifyingIds = qualifying.map((o) => o.id);
  await prisma.suiviAdministratif.deleteMany({
    where: { operationId: { not: null, notIn: qualifyingIds } },
  });
}
