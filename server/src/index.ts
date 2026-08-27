import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./lib/prisma.js";
import { crudRouter } from "./routes/crud.js";
import { optionsRouter } from "./routes/options.js";
import { fournisseursRouter } from "./routes/fournisseurs.js";
import { chantiersRouter } from "./routes/chantiers.js";
import { diagnosticRouter } from "./routes/diagnostic.js";
import { offreFichierRouter } from "./routes/offreFichier.js";
import { aoSujetsRouter } from "./routes/aoSujets.js";
import { aoPostesRouter } from "./routes/aoPostes.js";
import { fichierRouter } from "./lib/fichierRoutes.js";
import { syncLivraisonsFromOperations } from "./lib/syncLivraisons.js";
import { syncAppelsOffresFromOperations } from "./lib/syncAppelsOffres.js";
import { syncSuiviAdministratifFromOperations } from "./lib/syncSuiviAdministratif.js";
import { uploadsDir } from "./lib/uploads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/operations", crudRouter(prisma.operation));
app.use("/api/transverses", crudRouter(prisma.transverse));
app.use("/api/todos", crudRouter(prisma.todo));
app.use("/api/non-conformites", crudRouter(prisma.nonConformite));
app.use("/api/livraisons", crudRouter(prisma.livraison, { beforeList: syncLivraisonsFromOperations }));
app.use("/api/appels-offres", offreFichierRouter);
app.use("/api/appels-offres", crudRouter(prisma.appelOffre, { beforeList: syncAppelsOffresFromOperations }));
app.use("/api/ao-sujets", aoSujetsRouter);
app.use("/api/ao-postes", aoPostesRouter);
app.use("/api/suivi-administratif", fichierRouter(prisma.suiviAdministratif, {
  routeSuffix: "/confirmation-fichier",
  nomField: "confirmationFichierNom",
  urlField: "confirmationFichierUrl",
  dossier: "suivi-administratif/confirmation",
}));
app.use("/api/suivi-administratif", fichierRouter(prisma.suiviAdministratif, {
  routeSuffix: "/bl-fichier",
  nomField: "blFichierNom",
  urlField: "blFichierUrl",
  dossier: "suivi-administratif/bl",
}));
app.use("/api/suivi-administratif", crudRouter(prisma.suiviAdministratif, { beforeList: syncSuiviAdministratifFromOperations }));
app.use("/api/fournisseurs", fournisseursRouter);
app.use("/api/chantiers", chantiersRouter);
app.use("/api/options", optionsRouter);
app.use("/api/diagnostic", diagnosticRouter);
app.use("/uploads", express.static(uploadsDir()));

// En production, l'API sert aussi les fichiers statiques du client buildé
// (un seul service à déployer, cf. client/dist copié à côté de ce fichier).
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`Suivi Achats API démarrée sur le port ${port}`);
});
