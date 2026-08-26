-- AlterTable
ALTER TABLE "AppelOffre" ADD COLUMN "validation" TEXT;

-- CreateTable
CREATE TABLE "AoSujet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cle" TEXT NOT NULL,
    "statutCommande" TEXT DEFAULT 'En cours',
    "numCmd" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SuiviAdministratif" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operationId" TEXT,
    "date" TEXT,
    "chant" TEXT,
    "nom" TEXT,
    "ent" TEXT,
    "dem" TEXT,
    "fournisseur" TEXT,
    "prec" TEXT,
    "fourn" TEXT,
    "numCmd" TEXT,
    "dateCmd" TEXT,
    "confirmation" TEXT,
    "bl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AoSujet_cle_key" ON "AoSujet"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "SuiviAdministratif_operationId_key" ON "SuiviAdministratif"("operationId");

