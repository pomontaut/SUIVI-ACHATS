-- AlterTable
ALTER TABLE "SuiviAdministratif" ADD COLUMN "blFichierNom" TEXT;
ALTER TABLE "SuiviAdministratif" ADD COLUMN "blFichierUrl" TEXT;
ALTER TABLE "SuiviAdministratif" ADD COLUMN "confirmationFichierNom" TEXT;
ALTER TABLE "SuiviAdministratif" ADD COLUMN "confirmationFichierUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppelOffre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operationId" TEXT,
    "date" TEXT,
    "chant" TEXT,
    "nom" TEXT,
    "ent" TEXT,
    "dem" TEXT,
    "fournisseur" TEXT,
    "prec" TEXT,
    "statut" TEXT DEFAULT 'En cours',
    "dateEnvoi" TEXT,
    "dateRetour" TEXT,
    "rem" TEXT,
    "offreFournisseur" TEXT,
    "offreFichierNom" TEXT,
    "offreFichierUrl" TEXT,
    "offreMontantAuto" BOOLEAN NOT NULL DEFAULT false,
    "offreExtractionNote" TEXT,
    "comparatifTechnique" TEXT,
    "validation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppelOffre" ("chant", "comparatifTechnique", "createdAt", "date", "dateEnvoi", "dateRetour", "dem", "ent", "fournisseur", "id", "nom", "offreFichierNom", "offreFichierUrl", "offreFournisseur", "operationId", "prec", "rem", "statut", "updatedAt", "validation") SELECT "chant", "comparatifTechnique", "createdAt", "date", "dateEnvoi", "dateRetour", "dem", "ent", "fournisseur", "id", "nom", "offreFichierNom", "offreFichierUrl", "offreFournisseur", "operationId", "prec", "rem", "statut", "updatedAt", "validation" FROM "AppelOffre";
DROP TABLE "AppelOffre";
ALTER TABLE "new_AppelOffre" RENAME TO "AppelOffre";
CREATE UNIQUE INDEX "AppelOffre_operationId_fournisseur_key" ON "AppelOffre"("operationId", "fournisseur");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

