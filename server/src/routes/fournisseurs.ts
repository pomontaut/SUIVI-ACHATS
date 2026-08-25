import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const fournisseursRouter = Router();

// Recherche dans le référentiel (~9300 fournisseurs importés d'Abacus).
// On limite les résultats car un select complet serait inutilisable côté UI.
fournisseursRouter.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const rows = await prisma.fournisseur.findMany({
    where: q ? { nom: { contains: q } } : undefined,
    orderBy: { nom: "asc" },
    take: 50,
  });
  res.json(rows);
});

// Permet d'ajouter un fournisseur qui n'existe pas encore dans le
// référentiel Abacus (nouveau fournisseur ponctuel saisi par un utilisateur).
fournisseursRouter.post("/", async (req, res) => {
  const nom = String(req.body?.nom ?? "").trim();
  if (!nom) {
    res.status(400).json({ error: "nom requis" });
    return;
  }
  const row = await prisma.fournisseur.upsert({
    where: { nom },
    update: {},
    create: { nom },
  });
  res.status(201).json(row);
});
