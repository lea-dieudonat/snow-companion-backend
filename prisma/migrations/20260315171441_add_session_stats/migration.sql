-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "maxSpeed" DOUBLE PRECISION,
ADD COLUMN     "runCount" INTEGER,
ADD COLUMN     "totalDistance" DOUBLE PRECISION,
ADD COLUMN     "verticalDrop" INTEGER;
