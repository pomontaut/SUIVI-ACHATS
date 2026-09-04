-- CreateTable
CREATE TABLE "AoCritereTech" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sujetCle" TEXT NOT NULL,
    "libelle" TEXT,
    "remarque" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AoCritereTechValeur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "critereId" TEXT NOT NULL,
    "appelOffreId" TEXT NOT NULL,
    "valeur" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AoCritereTechValeur_critereId_appelOffreId_key" ON "AoCritereTechValeur"("critereId", "appelOffreId");
