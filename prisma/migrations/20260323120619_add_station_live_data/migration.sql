-- CreateTable
CREATE TABLE "station_live_data" (
    "station_id" TEXT NOT NULL,
    "lifts_open" INTEGER,
    "lifts_total" INTEGER,
    "pistes_open" INTEGER,
    "pistes_total" INTEGER,
    "base_snow_depth_cm" INTEGER,
    "summit_snow_depth_cm" INTEGER,
    "avalanche_risk" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "station_live_data_pkey" PRIMARY KEY ("station_id")
);

-- AddForeignKey
ALTER TABLE "station_live_data" ADD CONSTRAINT "station_live_data_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
