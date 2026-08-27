import { Router } from "express";
import { prisma } from "../lib/prisma.js";

// Postes budgétaires d'un sujet AO (comparatif TCO détaillé, cf.
// AoPoste/AoPosteMontant dans le schéma) - un sujet n'ayant pas de ligne
// propre, on l'indexe par la clé de regroupement (date+chantier+objet) que
// le client calcule et fournit telle quelle, comme /api/ao-sujets.
export const aoPostesRouter = Router();

aoPostesRouter.get("/", async (req, res) => {
  const sujetCle = typeof req.query.sujetCle === "string" ? req.query.sujetCle : undefined;
  const postes = await prisma.aoPoste.findMany({
    where: sujetCle !== undefined ? { sujetCle } : undefined,
    orderBy: { ordre: "asc" },
  });
  const montants = await prisma.aoPosteMontant.findMany({
    where: postes.length > 0 ? { posteId: { in: postes.map((p) => p.id) } } : undefined,
  });
  res.json({ postes, montants });
});

aoPostesRouter.post("/", async (req, res) => {
  const { sujetCle, reference, libelle, budget } = req.body;
  const maxOrdre = await prisma.aoPoste.aggregate({ where: { sujetCle }, _max: { ordre: true } });
  const poste = await prisma.aoPoste.create({
    data: { sujetCle, reference: reference ?? null, libelle: libelle ?? null, budget: budget ?? null, ordre: (maxOrdre._max.ordre ?? -1) + 1 },
  });
  res.status(201).json(poste);
});

aoPostesRouter.put("/:id", async (req, res) => {
  const { reference, libelle, budget, ordre } = req.body;
  const data: Record<string, unknown> = {};
  if (reference !== undefined) data.reference = reference;
  if (libelle !== undefined) data.libelle = libelle;
  if (budget !== undefined) data.budget = budget;
  if (ordre !== undefined) data.ordre = ordre;
  const poste = await prisma.aoPoste.update({ where: { id: req.params.id }, data });
  res.json(poste);
});

aoPostesRouter.delete("/:id", async (req, res) => {
  await prisma.aoPosteMontant.deleteMany({ where: { posteId: req.params.id } });
  await prisma.aoPoste.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Le montant d'un poste pour un fournisseur (AppelOffre) donné : saisie
// manuelle systématiquement marquée montantAuto=false, pour ne plus être
// écrasée par une future extraction automatique (même logique que
// offreFournisseur/offreMontantAuto sur AppelOffre).
aoPostesRouter.put("/:posteId/montant/:appelOffreId", async (req, res) => {
  const { posteId, appelOffreId } = req.params;
  const { montant } = req.body;
  const row = await prisma.aoPosteMontant.upsert({
    where: { posteId_appelOffreId: { posteId, appelOffreId } },
    update: { montant, montantAuto: false },
    create: { posteId, appelOffreId, montant, montantAuto: false },
  });
  res.json(row);
});
