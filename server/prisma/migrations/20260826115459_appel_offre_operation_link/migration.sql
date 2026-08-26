-- AlterTable
ALTER TABLE "AppelOffre" ADD COLUMN "operationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AppelOffre_operationId_fournisseur_key" ON "AppelOffre"("operationId", "fournisseur");

