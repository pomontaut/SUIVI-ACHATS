import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const fournisseursRouter = Router();

// Recherche dans le référentiel (~9300 fournisseurs importés d'Abacus + ajouts manuels).
// On limite les résultats car un select complet serait inutilisable côté UI,
// sauf pour ?manuel=true (liste des nouveaux fournisseurs pour le KPI dédié,
// naturellement restreinte donc pas besoin de plafond).
fournisseursRouter.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const manuelOnly = req.query.manuel === "true";
  const rows = await prisma.fournisseur.findMany({
    where: {
      ...(q ? { nom: { contains: q } } : {}),
      ...(manuelOnly ? { manuel: true } : {}),
    },
    orderBy: { nom: "asc" },
    take: manuelOnly ? undefined : 50,
  });
  res.json(rows);
});

// Ajoute un fournisseur qui n'existe pas encore dans le référentiel (saisie
// manuelle via le popup Nom/CP/Ville/Pays) - marqué manuel=true pour le
// suivi KPI des nouveaux fournisseurs. Si le nom existe déjà, ne l'écrase
// pas (l'utilisateur cherchait juste à le retrouver).
fournisseursRouter.post("/", async (req, res) => {
  const nom = String(req.body?.nom ?? "").trim();
  if (!nom) {
    res.status(400).json({ error: "nom requis" });
    return;
  }
  const npa = req.body?.npa ? String(req.body.npa).trim() : null;
  const ville = req.body?.ville ? String(req.body.ville).trim() : null;
  const pays = req.body?.pays ? String(req.body.pays).trim() : null;
  const row = await prisma.fournisseur.upsert({
    where: { nom },
    update: {},
    create: { nom, npa, ville, pays, manuel: true },
  });
  res.status(201).json(row);
});
