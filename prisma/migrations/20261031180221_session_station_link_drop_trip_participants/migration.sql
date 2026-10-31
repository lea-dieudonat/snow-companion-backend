/*
  Warnings:

  - You are about to drop the column `participants` on the `Trip` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "stationId" TEXT;

-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "participants";

-- CreateIndex
CREATE INDEX "Session_stationId_idx" ON "Session"("stationId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rattrapage des données existantes : relie chaque session à la fiche station
-- dont l'identifiant (ex. "val-thorens") ou le nom (ex. "Val Thorens") correspond,
-- casse et espaces ignorés. Les saisies sans correspondance restent à NULL ;
-- le texte saisi est conservé dans la colonne "station".
UPDATE "Session" AS s
SET "stationId" = st."id"
FROM "Station" AS st
WHERE s."stationId" IS NULL
  AND (
    lower(trim(s."station")) = lower(st."id")
    OR lower(trim(s."station")) = lower(trim(st."name"))
  );
