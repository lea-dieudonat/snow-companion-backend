-- AlterTable: remove num_slopes and num_lifts from Station
-- These fields are redundant with StationLiveData.pistes_total and lifts_total
-- which are sourced from the open-piste API (more reliable than manual data)
ALTER TABLE "Station" DROP COLUMN IF EXISTS "num_slopes";
ALTER TABLE "Station" DROP COLUMN IF EXISTS "num_lifts";
