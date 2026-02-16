-- AlterTable
ALTER TABLE "User" ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationLatitude" DOUBLE PRECISION,
ADD COLUMN     "locationLongitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "altitude_min" INTEGER NOT NULL,
    "altitude_max" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "num_slopes" INTEGER NOT NULL,
    "num_lifts" INTEGER NOT NULL,
    "km_slopes" INTEGER NOT NULL,
    "slopes_detail" JSONB NOT NULL,
    "snow_cannons" INTEGER NOT NULL,
    "ski_area" TEXT NOT NULL,
    "level" TEXT[],
    "passes" JSONB NOT NULL,
    "avg_accommodation_price" DOUBLE PRECISION NOT NULL,
    "website" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "access" JSONB NOT NULL,
    "season" JSONB NOT NULL,
    "services" TEXT[],
    "activities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "stationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "participants" TEXT[],
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Station_region_idx" ON "Station"("region");

-- CreateIndex
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");

-- CreateIndex
CREATE INDEX "Trip_stationId_idx" ON "Trip"("stationId");

-- CreateIndex
CREATE INDEX "Trip_startDate_idx" ON "Trip"("startDate");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
