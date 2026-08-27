-- CreateTable
CREATE TABLE "AoPoste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sujetCle" TEXT NOT NULL,
    "reference" TEXT,
    "libelle" TEXT,
    "budget" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AoPosteMontant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "posteId" TEXT NOT NULL,
    "appelOffreId" TEXT NOT NULL,
    "montant" TEXT,
    "montantAuto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AoPosteMontant_posteId_appelOffreId_key" ON "AoPosteMontant"("posteId", "appelOffreId");
