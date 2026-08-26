import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma.js";
import { uploadsDir } from "../lib/uploads.js";

export const offreFichierRouter = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(uploadsDir(), "appels-offres", req.params.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, path.basename(file.originalname)),
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo
});

// Joint le document d'offre (devis/PDF/scan) envoyé par un fournisseur à
// une ligne d'appel d'offres. Remplace le fichier précédent s'il y en avait un.
offreFichierRouter.post("/:id/offre-fichier", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "fichier requis" });
    return;
  }
  const previous = await prisma.appelOffre.findUnique({ where: { id: req.params.id } });
  if (previous?.offreFichierUrl) {
    const oldPath = path.join(uploadsDir(), previous.offreFichierUrl.replace(/^\/uploads\//, ""));
    await rm(oldPath, { force: true });
  }
  const url = `/uploads/appels-offres/${req.params.id}/${encodeURIComponent(req.file.filename)}`;
  const row = await prisma.appelOffre.update({
    where: { id: req.params.id },
    data: { offreFichierNom: req.file.originalname, offreFichierUrl: url },
  });
  res.json(row);
});

offreFichierRouter.delete("/:id/offre-fichier", async (req, res) => {
  const existing = await prisma.appelOffre.findUnique({ where: { id: req.params.id } });
  if (existing?.offreFichierUrl) {
    const filePath = path.join(uploadsDir(), existing.offreFichierUrl.replace(/^\/uploads\//, ""));
    await rm(filePath, { force: true });
  }
  const row = await prisma.appelOffre.update({
    where: { id: req.params.id },
    data: { offreFichierNom: null, offreFichierUrl: null },
  });
  res.json(row);
});
