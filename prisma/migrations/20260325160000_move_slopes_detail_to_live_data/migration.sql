-- AlterTable Station: drop slopes_detail
ALTER TABLE "Station" DROP COLUMN IF EXISTS "slopes_detail";

-- AlterTable StationLiveData: add slopes_detail and slopes_open
ALTER TABLE "station_live_data" ADD COLUMN IF NOT EXISTS "slopes_detail" JSONB;
ALTER TABLE "station_live_data" ADD COLUMN IF NOT EXISTS "slopes_open" JSONB;
