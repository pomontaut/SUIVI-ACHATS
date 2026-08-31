-- CreateTable
CREATE TABLE "CahierDesCharges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupeMarchandise" TEXT,
    "fourniture" TEXT,
    "precision" TEXT,
    "question" TEXT,
    "reponseAttendue" TEXT,
    "obligatoire" TEXT DEFAULT 'Non',
    "rem" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
