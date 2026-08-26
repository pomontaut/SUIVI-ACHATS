-- AlterTable
ALTER TABLE "AppelOffre" ADD COLUMN "comparatifTechnique" TEXT;
ALTER TABLE "AppelOffre" ADD COLUMN "offreFournisseur" TEXT;

-- CreateTable
CREATE TABLE "Chantier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "nom" TEXT,
    "npa" TEXT,
    "ville" TEXT,
    "manuel" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Fournisseur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "npa" TEXT,
    "ville" TEXT,
    "pays" TEXT,
    "manuel" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Fournisseur" ("id", "nom") SELECT "id", "nom" FROM "Fournisseur";
DROP TABLE "Fournisseur";
ALTER TABLE "new_Fournisseur" RENAME TO "Fournisseur";
CREATE UNIQUE INDEX "Fournisseur_nom_key" ON "Fournisseur"("nom");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Chantier_numero_key" ON "Chantier"("numero");

