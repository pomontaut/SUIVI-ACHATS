-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT,
    "dem" TEXT,
    "ent" TEXT,
    "chant" TEXT,
    "nom" TEXT,
    "type" TEXT,
    "impl" TEXT,
    "fourn" TEXT,
    "prec" TEXT,
    "etape" TEXT,
    "consult" TEXT,
    "rem" TEXT,
    "launch" TEXT,
    "retour" TEXT,
    "retourMax" TEXT,
    "dateCmd" TEXT,
    "dateLivraison" TEXT,
    "dateLivraisonReelle" TEXT,
    "numCmd" TEXT,
    "budget" TEXT,
    "typeBudget" TEXT,
    "montant" TEXT,
    "gain" TEXT,
    "tco" TEXT,
    "fournisseur" TEXT,
    "typeActionAchat" TEXT,
    "comment" TEXT,
    "statutAo" TEXT,
    "prio" TEXT DEFAULT 'P2',
    "vu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Transverse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT,
    "dem" TEXT,
    "ent" TEXT,
    "nom" TEXT,
    "type" TEXT,
    "prec" TEXT,
    "budget" TEXT,
    "rem" TEXT,
    "action" TEXT,
    "retour" TEXT,
    "prio" TEXT DEFAULT 'P2',
    "statut" TEXT DEFAULT 'Actif',
    "vu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prio" TEXT DEFAULT 'P2',
    "statut" TEXT DEFAULT 'Actif',
    "qui" TEXT,
    "quoi" TEXT,
    "deadline" TEXT,
    "action" TEXT,
    "deadlineAction" TEXT,
    "vu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NonConformite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT,
    "fournisseur" TEXT,
    "ent" TEXT,
    "chant" TEXT,
    "nom" TEXT,
    "ctx" TEXT,
    "montantCmd" TEXT,
    "catNC" TEXT,
    "typeNC" TEXT,
    "statut" TEXT,
    "statutNC" TEXT DEFAULT 'En cours',
    "montantNC" TEXT,
    "noteCredit" TEXT,
    "rem" TEXT,
    "livraisonId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Livraison" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chant" TEXT,
    "nom" TEXT,
    "numCmd" TEXT,
    "ent" TEXT,
    "dem" TEXT,
    "fournisseur" TEXT,
    "prec" TEXT,
    "montant" TEXT,
    "dateCmd" TEXT,
    "dateConfirm" TEXT,
    "dateLivraison" TEXT,
    "dateLivraisonReelle" TEXT,
    "remLiv" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AppelOffre" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Fournisseur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Fournisseur_nom_key" ON "Fournisseur"("nom");
