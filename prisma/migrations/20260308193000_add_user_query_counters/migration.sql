-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastQueryAt" TIMESTAMP(3),
ADD COLUMN     "queryCount" INTEGER NOT NULL DEFAULT 0;
