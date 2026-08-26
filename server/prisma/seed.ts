import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import seedData from "./seed-data.json" with { type: "json" };
import fournisseursAbacus from "./fournisseurs-abacus.json" with { type: "json" };
import chantiersRef from "./chantiers.json" with { type: "json" };

const prisma = new PrismaClient();

function str(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

/**
 * Référentiels fournisseurs/chantiers : contrairement au seed des données
 * métier ci-dessous (qui ne tourne qu'une fois, base vide), ces deux
 * imports doivent pouvoir tourner à chaque déploiement pour enrichir un
 * référentiel déjà en place (ex: ajouter CP/Ville/Pays aux fournisseurs
 * importés avant cette fonctionnalité) - d'où un upsert par clé unique
 * plutôt qu'un create bloqué par un compteur.
 */
async function seedReferentiels() {
  console.log(`Référentiel fournisseurs : ${fournisseursAbacus.length} entrées...`);
  for (const f of fournisseursAbacus as { nom: string; npa: string | null; ville: string | null; pays: string | null }[]) {
    await prisma.fournisseur.upsert({
      where: { nom: f.nom },
      update: { npa: f.npa, ville: f.ville, pays: f.pays },
      create: { nom: f.nom, npa: f.npa, ville: f.ville, pays: f.pays },
    });
  }

  console.log(`Référentiel chantiers : ${chantiersRef.length} entrées...`);
  for (const c of chantiersRef as { numero: string; nom: string | null; npa: string | null }[]) {
    await prisma.chantier.upsert({
      where: { numero: c.numero },
      update: { nom: c.nom, npa: c.npa },
      create: { numero: c.numero, nom: c.nom, npa: c.npa },
    });
  }
  console.log("Référentiels à jour.");
}

async function main() {
  await seedReferentiels();

  const opCount = await prisma.operation.count();
  if (opCount > 0) {
    console.log("La base contient déjà des données métier, seed ignoré (référentiels mis à jour ci-dessus).");
    return;
  }

  console.log(`Import de ${seedData.opData.length} opérations...`);
  for (const d of seedData.opData as Record<string, unknown>[]) {
    await prisma.operation.create({
      data: {
        date: str(d.date),
        dem: str(d.dem),
        ent: str(d.ent),
        chant: str(d.chant),
        nom: str(d.nom),
        type: str(d.type),
        impl: str(d.impl),
        fourn: str(d.fourn),
        prec: str(d.prec),
        etape: str(d.etape),
        consult: str(d.consult),
        rem: str(d.rem),
        launch: str(d.launch),
        retour: str(d.retour),
        retourMax: str(d.retourMax),
        dateCmd: str(d.dateCmd),
        dateLivraison: str(d.dateLivraison),
        dateLivraisonReelle: str(d.dateLivraisonReelle),
        numCmd: str(d.numCmd),
        budget: str(d.budget),
        typeBudget: str(d.typeBudget),
        montant: str(d.montant),
        gain: str(d.gain),
        tco: str(d.tco),
        fournisseur: str(d.fournisseur),
        typeActionAchat: str(d.typeActionAchat),
        comment: str(d.comment),
        statutAo: str(d.statutAo),
      },
    });
  }

  console.log(`Import de ${seedData.trData.length} sujets transverses...`);
  for (const d of seedData.trData as Record<string, unknown>[]) {
    await prisma.transverse.create({
      data: {
        date: str(d.date),
        dem: str(d.dem),
        ent: str(d.ent),
        nom: str(d.nom),
        type: str(d.type),
        prec: str(d.prec),
        budget: str(d.budget),
        rem: str(d.rem),
        action: str(d.action),
        retour: str(d.retour),
      },
    });
  }

  console.log(`Import de ${seedData.tdData.length} tâches...`);
  for (const d of seedData.tdData as Record<string, unknown>[]) {
    await prisma.todo.create({
      data: {
        prio: str(d.prio) ?? "P2",
        statut: str(d.statut) ?? "Actif",
        qui: str(d.qui),
        quoi: str(d.quoi),
        deadline: str(d.deadline),
        action: str(d.action),
        deadlineAction: str(d.deadlineAction),
      },
    });
  }

  console.log(`Import de ${seedData.ncData.length} non-conformités...`);
  for (const d of seedData.ncData as Record<string, unknown>[]) {
    await prisma.nonConformite.create({
      data: {
        date: str(d.date),
        fournisseur: str(d.fournisseur),
        ent: str(d.ent),
        chant: str(d.chant),
        nom: str(d.nom),
        ctx: str(d.ctx),
        montantCmd: str(d.montantCmd),
        catNC: str(d.catNC),
        typeNC: str(d.typeNC),
        statut: str(d.statut),
        statutNC: str(d.statutNC) ?? "En cours",
        montantNC: str(d.montantNC),
        noteCredit: str(d.noteCredit),
        rem: str(d.rem),
      },
    });
  }

  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
