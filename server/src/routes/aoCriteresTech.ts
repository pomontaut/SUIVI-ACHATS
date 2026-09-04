import { Router } from "express";
import { prisma } from "../lib/prisma.js";

// Critères de comparaison technique/logistique d'un sujet AO (comparatif TCO
// détaillé, cf. AoCritereTech/AoCritereTechValeur dans le schéma) - même
// indexation par clé de regroupement que /api/ao-postes.
export const aoCriteresTechRouter = Router();

aoCriteresTechRouter.get("/", async (req, res) => {
  const sujetCle = typeof req.query.sujetCle === "string" ? req.query.sujetCle : undefined;
  const criteres = await prisma.aoCritereTech.findMany({
    where: sujetCle !== undefined ? { sujetCle } : undefined,
    orderBy: { ordre: "asc" },
  });
  const valeurs = await prisma.aoCritereTechValeur.findMany({
    where: criteres.length > 0 ? { critereId: { in: criteres.map((c) => c.id) } } : undefined,
  });
  res.json({ criteres, valeurs });
});

aoCriteresTechRouter.post("/", async (req, res) => {
  const { sujetCle, libelle } = req.body;
  const maxOrdre = await prisma.aoCritereTech.aggregate({ where: { sujetCle }, _max: { ordre: true } });
  const critere = await prisma.aoCritereTech.create({
    data: { sujetCle, libelle: libelle ?? null, ordre: (maxOrdre._max.ordre ?? -1) + 1 },
  });
  res.status(201).json(critere);
});

aoCriteresTechRouter.put("/:id", async (req, res) => {
  const { libelle, remarque, ordre } = req.body;
  const data: Record<string, unknown> = {};
  if (libelle !== undefined) data.libelle = libelle;
  if (remarque !== undefined) data.remarque = remarque;
  if (ordre !== undefined) data.ordre = ordre;
  const critere = await prisma.aoCritereTech.update({ where: { id: req.params.id }, data });
  res.json(critere);
});

aoCriteresTechRouter.delete("/:id", async (req, res) => {
  await prisma.aoCritereTechValeur.deleteMany({ where: { critereId: req.params.id } });
  await prisma.aoCritereTech.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

aoCriteresTechRouter.put("/:critereId/valeur/:appelOffreId", async (req, res) => {
  const { critereId, appelOffreId } = req.params;
  const { valeur } = req.body;
  const row = await prisma.aoCritereTechValeur.upsert({
    where: { critereId_appelOffreId: { critereId, appelOffreId } },
    update: { valeur },
    create: { critereId, appelOffreId, valeur },
  });
  res.json(row);
});
