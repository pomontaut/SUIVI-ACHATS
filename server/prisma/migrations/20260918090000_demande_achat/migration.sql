-- CreateTable
CREATE TABLE "DemandeAchat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT,
    "dem" TEXT,
    "ent" TEXT,
    "chant" TEXT,
    "nom" TEXT,
    "objet" TEXT,
    "justification" TEXT,
    "montantEstime" TEXT,
    "fournisseur" TEXT,
    "urgence" TEXT,
    "statut" TEXT DEFAULT 'En attente',
    "rem" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

