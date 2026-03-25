-- CreateTable ski_area
CREATE TABLE "ski_area" (
  "id"      TEXT NOT NULL,
  "name"    TEXT NOT NULL,
  "region"  TEXT,
  "website" TEXT,
  CONSTRAINT "ski_area_pkey" PRIMARY KEY ("id")
);

-- AlterTable Station: drop old ski_area string, add ski_area_id FK
ALTER TABLE "Station" DROP COLUMN IF EXISTS "ski_area";
ALTER TABLE "Station" ADD COLUMN "ski_area_id" TEXT;
ALTER TABLE "Station" ADD CONSTRAINT "Station_ski_area_id_fkey"
  FOREIGN KEY ("ski_area_id") REFERENCES "ski_area"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
