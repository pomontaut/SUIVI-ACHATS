-- DropIndex
DROP INDEX "AppelOffre_operationId_fournisseur_key";

-- AlterTable
ALTER TABLE "AppelOffre" ADD COLUMN "consultTag" TEXT;

-- Backfill : pour les lignes deja auto-synchronisees, le fournisseur actuel
-- correspond encore au tag de consultation d'origine (aucune modification
-- manuelle n'a encore pu s'appuyer sur consultTag). Fixe l'identite avant
-- de rendre l'unicite dependante de ce champ.
UPDATE "AppelOffre" SET "consultTag" = "fournisseur" WHERE "operationId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AppelOffre_operationId_consultTag_key" ON "AppelOffre"("operationId", "consultTag");
