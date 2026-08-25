import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import seedData from "./seed-data.json" with { type: "json" };

const prisma = new PrismaClient();

function str(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

async function main() {
  const opCount = await prisma.operation.count();
  if (opCount > 0) {
    console.log("La base contient déjà des données, seed ignoré.");
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

  console.log(`Import de ${seedData.FOURN_ABACUS.length} fournisseurs (référentiel Abacus)...`);
  const noms = [...new Set(seedData.FOURN_ABACUS as string[])];
  const batchSize = 500;
  for (let i = 0; i < noms.length; i += batchSize) {
    const batch = noms.slice(i, i + batchSize);
    await prisma.fournisseur.createMany({ data: batch.map((nom) => ({ nom })) });
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
