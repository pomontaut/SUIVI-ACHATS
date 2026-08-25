-- AlterTable
ALTER TABLE "Livraison" ADD COLUMN "operationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Livraison_operationId_key" ON "Livraison"("operationId");
