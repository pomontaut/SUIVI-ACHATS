-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Operation" (
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
    "vuDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Operation" ("budget", "chant", "comment", "consult", "createdAt", "date", "dateCmd", "dateLivraison", "dateLivraisonReelle", "dem", "ent", "etape", "fourn", "fournisseur", "gain", "id", "impl", "launch", "montant", "nom", "numCmd", "prec", "prio", "rem", "retour", "retourMax", "statutAo", "tco", "type", "typeActionAchat", "typeBudget", "updatedAt") SELECT "budget", "chant", "comment", "consult", "createdAt", "date", "dateCmd", "dateLivraison", "dateLivraisonReelle", "dem", "ent", "etape", "fourn", "fournisseur", "gain", "id", "impl", "launch", "montant", "nom", "numCmd", "prec", "prio", "rem", "retour", "retourMax", "statutAo", "tco", "type", "typeActionAchat", "typeBudget", "updatedAt" FROM "Operation";
DROP TABLE "Operation";
ALTER TABLE "new_Operation" RENAME TO "Operation";
CREATE TABLE "new_Todo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prio" TEXT DEFAULT 'P2',
    "statut" TEXT DEFAULT 'Actif',
    "qui" TEXT,
    "quoi" TEXT,
    "deadline" TEXT,
    "action" TEXT,
    "deadlineAction" TEXT,
    "vuDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Todo" ("action", "createdAt", "deadline", "deadlineAction", "id", "prio", "qui", "quoi", "statut", "updatedAt") SELECT "action", "createdAt", "deadline", "deadlineAction", "id", "prio", "qui", "quoi", "statut", "updatedAt" FROM "Todo";
DROP TABLE "Todo";
ALTER TABLE "new_Todo" RENAME TO "Todo";
CREATE TABLE "new_Transverse" (
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
    "vuDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Transverse" ("action", "budget", "createdAt", "date", "dem", "ent", "id", "nom", "prec", "prio", "rem", "retour", "statut", "type", "updatedAt") SELECT "action", "budget", "createdAt", "date", "dem", "ent", "id", "nom", "prec", "prio", "rem", "retour", "statut", "type", "updatedAt" FROM "Transverse";
DROP TABLE "Transverse";
ALTER TABLE "new_Transverse" RENAME TO "Transverse";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

