-- CreateEnum
CREATE TYPE "ReportFalsePositiveStatus" AS ENUM ('PENDING', 'CONFIRMED_FALSE_POSITIVE', 'REJECTED');

-- CreateTable
CREATE TABLE "ReportFalsePositive" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "findingFingerprint" TEXT NOT NULL,
    "findingIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "line" INTEGER,
    "confidence" TEXT,
    "isSharedView" BOOLEAN NOT NULL DEFAULT false,
    "submittedByUserId" TEXT,
    "status" "ReportFalsePositiveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportFalsePositive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportFalsePositive_scanId_createdAt_idx" ON "ReportFalsePositive"("scanId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ReportFalsePositive_status_createdAt_idx" ON "ReportFalsePositive"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ReportFalsePositive_submittedByUserId_createdAt_idx" ON "ReportFalsePositive"("submittedByUserId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ReportFalsePositive" ADD CONSTRAINT "ReportFalsePositive_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "RepoScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFalsePositive" ADD CONSTRAINT "ReportFalsePositive_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFalsePositive" ADD CONSTRAINT "ReportFalsePositive_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
