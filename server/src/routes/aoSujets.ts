import { Router } from "express";
import { prisma } from "../lib/prisma.js";

// Statut de commande par "sujet AO" (regroupement virtuel côté client par
// date+chantier+objet, cf. AppelsOffresPage.tsx#buildAoGroups). Le sujet
// n'ayant pas de ligne propre, on l'indexe par la clé que le client calcule
// et fournit telle quelle.
export const aoSujetsRouter = Router();

aoSujetsRouter.get("/", async (_req, res) => {
  const rows = await prisma.aoSujet.findMany();
  res.json(rows);
});

aoSujetsRouter.put("/:cle", async (req, res) => {
  const cle = decodeURIComponent(req.params.cle);
  const { statutCommande, numCmd } = req.body;
  const row = await prisma.aoSujet.upsert({
    where: { cle },
    update: { statutCommande, numCmd },
    create: { cle, statutCommande, numCmd },
  });
  res.json(row);
});
