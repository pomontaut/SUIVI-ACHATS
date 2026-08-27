import { prisma } from "./prisma.js";
import { parseConsult } from "./consult.js";
import type { AppelOffre } from "@prisma/client";

function norm(s: string | null | undefined): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}
function contentKey(chant: string | null, nom: string | null, fournisseur: string): string {
  return `${norm(chant)}|${norm(nom)}|${norm(fournisseur)}`;
}

/**
 * Toute opération dont le TCO est "oui" génère/actualise automatiquement une
 * ligne Appel d'offres par fournisseur listé dans sa colonne Consultation,
 * pour éviter à l'utilisateur de ressaisir à la main des données déjà
 * présentes dans l'Opérationnel. Les champs propres au suivi de l'appel
 * d'offres (offre du fournisseur, comparatif technique, statut...) ne sont
 * jamais écrasés : seuls les champs "miroir" de l'opération source sont
 * resynchronisés.
 *
 * L'identité d'une ligne auto-générée (pour la resynchronisation et la
 * détection des orphelins) repose sur operationId + consultTag, le tag de
 * consultation d'origine — jamais sur le champ fournisseur, librement
 * modifiable ensuite par l'utilisateur (ex: préciser "Helmut Breschan AG" là
 * où la consultation ne portait que "Breschan") sans que la ligne soit
 * reconstruite/perdue au prochain resync.
 *
 * Avant de créer une ligne, on cherche d'abord une ligne existante sans
 * operationId (saisie manuelle, ou reprise de l'ancien outil avant que ce
 * lien n'existe) dont chantier + nom + fournisseur correspondent déjà : on
 * l'adopte (on lui attribue l'operationId + consultTag) plutôt que d'en
 * créer un doublon. Si une ligne auto-générée existe déjà pour cette
 * opération+tag, une éventuelle ligne non liée avec la même clé est un
 * doublon résiduel (créé avant l'introduction de l'adoption ci-dessus) :
 * elle est fusionnée dans la ligne conservée puis supprimée, jamais adoptée
 * en double.
 */
export async function syncAppelsOffresFromOperations(): Promise<void> {
  const operations = await prisma.operation.findMany({
    where: { tco: { equals: "oui" } },
  });
  const allRows = await prisma.appelOffre.findMany();

  const byOpConsultTag = new Map<string, AppelOffre>();
  const unlinkedByContentKey = new Map<string, AppelOffre[]>();
  for (const row of allRows) {
    if (row.operationId) {
      byOpConsultTag.set(`${row.operationId}|${row.consultTag ?? row.fournisseur}`, row);
    } else {
      const key = contentKey(row.chant, row.nom, row.fournisseur ?? "");
      const bucket = unlinkedByContentKey.get(key) ?? [];
      bucket.push(row);
      unlinkedByContentKey.set(key, bucket);
    }
  }

  const duplicatesToMerge: { keep: AppelOffre; drop: AppelOffre }[] = [];
  const qualifyingKeys: string[] = [];

  for (const o of operations) {
    const fournisseurs = parseConsult(o.consult);
    for (const tag of fournisseurs) {
      const opKey = `${o.id}|${tag}`;
      qualifyingKeys.push(opKey);
      const mirror = {
        date: o.date, chant: o.chant, nom: o.nom, ent: o.ent, dem: o.dem, prec: o.prec,
        dateEnvoi: o.launch, dateRetourMax: o.retourMax,
      };
      const existingAuto = byOpConsultTag.get(opKey);
      const contentK = contentKey(o.chant, o.nom, tag);
      const unlinkedBucket = unlinkedByContentKey.get(contentK);

      if (existingAuto) {
        // Ligne auto déjà présente : on la resynchronise (sans toucher à
        // fournisseur, librement modifié par l'utilisateur), et toute ligne
        // non liée avec la même clé est un doublon résiduel à fusionner.
        await prisma.appelOffre.update({ where: { id: existingAuto.id }, data: mirror });
        if (unlinkedBucket) {
          for (const dup of unlinkedBucket.splice(0)) duplicatesToMerge.push({ keep: existingAuto, drop: dup });
        }
        continue;
      }

      const adoptable = unlinkedBucket?.shift();
      if (adoptable) {
        const updated = await prisma.appelOffre.update({ where: { id: adoptable.id }, data: { operationId: o.id, consultTag: tag, fournisseur: tag, ...mirror } });
        byOpConsultTag.set(opKey, updated);
        continue;
      }

      const created = await prisma.appelOffre.create({ data: { operationId: o.id, consultTag: tag, fournisseur: tag, ...mirror } });
      byOpConsultTag.set(opKey, created);
    }
  }

  for (const { keep, drop } of duplicatesToMerge) {
    const fillIn: Record<string, string> = {};
    for (const field of ["statut", "dateRetour", "offreFournisseur", "comparatifTechnique", "rem"] as const) {
      if (!keep[field] && drop[field]) fillIn[field] = drop[field] as string;
    }
    if (Object.keys(fillIn).length > 0) {
      await prisma.appelOffre.update({ where: { id: keep.id }, data: fillIn });
    }
    await prisma.appelOffre.delete({ where: { id: drop.id } });
  }

  // Un appel d'offres auto-généré dont l'opération n'est plus TCO=oui, ou
  // dont le tag de consultation a été retiré de la consultation, ne doit
  // plus exister (le fournisseur, potentiellement renommé par l'utilisateur
  // depuis, n'intervient jamais dans cette détection).
  const qualifyingSet = new Set(qualifyingKeys);
  const orphanIds = [...byOpConsultTag.values()]
    .filter((a) => !qualifyingSet.has(`${a.operationId}|${a.consultTag ?? a.fournisseur}`))
    .map((a) => a.id);
  if (orphanIds.length > 0) {
    await prisma.appelOffre.deleteMany({ where: { id: { in: orphanIds } } });
  }
}
