import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "./uploads.js";

interface FichierDelegate {
  findUnique(args: { where: { id: string } }): Promise<Record<string, unknown> | null>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
}

/**
 * Fabrique de routes POST/DELETE /:id{routeSuffix} pour joindre un fichier
 * (devis, confirmation, BL...) à une ligne d'un modèle Prisma quelconque -
 * généralise offreFichier.ts pour éviter de dupliquer cette logique à
 * chaque nouveau champ "pièce jointe" (cf. Suivi Administratif).
 */
export function fichierRouter(
  delegate: FichierDelegate,
  opts: { routeSuffix: string; nomField: string; urlField: string; dossier: string },
): Router {
  const router = Router();
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, _file, cb) => {
        const dir = path.join(uploadsDir(), opts.dossier, req.params.id);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => cb(null, path.basename(file.originalname)),
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo
  });

  router.post(`/:id${opts.routeSuffix}`, upload.single("file"), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "fichier requis" });
      return;
    }
    const previous = await delegate.findUnique({ where: { id: req.params.id } });
    const previousUrl = previous?.[opts.urlField] as string | undefined;
    const url = `/uploads/${opts.dossier}/${req.params.id}/${encodeURIComponent(req.file.filename)}`;
    // Si le nouveau fichier a le même nom que l'ancien, multer a déjà
    // écrasé l'ancien fichier au même chemin en l'écrivant - ne pas le supprimer.
    if (previousUrl && previousUrl !== url) {
      const oldPath = path.join(uploadsDir(), previousUrl.replace(/^\/uploads\//, ""));
      await rm(oldPath, { force: true });
    }
    const row = await delegate.update({
      where: { id: req.params.id },
      data: { [opts.nomField]: req.file.originalname, [opts.urlField]: url },
    });
    res.json(row);
  });

  router.delete(`/:id${opts.routeSuffix}`, async (req, res) => {
    const existing = await delegate.findUnique({ where: { id: req.params.id } });
    const existingUrl = existing?.[opts.urlField] as string | undefined;
    if (existingUrl) {
      const filePath = path.join(uploadsDir(), existingUrl.replace(/^\/uploads\//, ""));
      await rm(filePath, { force: true });
    }
    const row = await delegate.update({
      where: { id: req.params.id },
      data: { [opts.nomField]: null, [opts.urlField]: null },
    });
    res.json(row);
  });

  return router;
}
