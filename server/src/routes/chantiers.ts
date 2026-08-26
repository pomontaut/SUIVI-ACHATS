import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const chantiersRouter = Router();

// Recherche dans le référentiel chantiers (numéro ou nom).
chantiersRouter.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const rows = await prisma.chantier.findMany({
    where: q ? { OR: [{ numero: { contains: q } }, { nom: { contains: q } }] } : undefined,
    orderBy: { numero: "asc" },
    take: 50,
  });
  res.json(rows);
});

// Ajoute un chantier absent du référentiel (saisie manuelle via le popup
// Nom/Numéro/CP/Ville) - marqué manuel=true. Si le numéro existe déjà,
// ne l'écrase pas.
chantiersRouter.post("/", async (req, res) => {
  const numero = String(req.body?.numero ?? "").trim();
  if (!numero) {
    res.status(400).json({ error: "numero requis" });
    return;
  }
  const nom = req.body?.nom ? String(req.body.nom).trim() : null;
  const npa = req.body?.npa ? String(req.body.npa).trim() : null;
  const ville = req.body?.ville ? String(req.body.ville).trim() : null;
  const row = await prisma.chantier.upsert({
    where: { numero },
    update: {},
    create: { numero, nom, npa, ville, manuel: true },
  });
  res.status(201).json(row);
});
