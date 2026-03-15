-- CreateTable
CREATE TABLE "RepoScanShareLink" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RepoScanShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepoScanShareLink_tokenHash_key" ON "RepoScanShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "RepoScanShareLink_scanId_createdAt_idx" ON "RepoScanShareLink"("scanId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RepoScanShareLink_createdByUserId_createdAt_idx" ON "RepoScanShareLink"("createdByUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RepoScanShareLink_expiresAt_idx" ON "RepoScanShareLink"("expiresAt");

-- AddForeignKey
ALTER TABLE "RepoScanShareLink" ADD CONSTRAINT "RepoScanShareLink_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "RepoScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoScanShareLink" ADD CONSTRAINT "RepoScanShareLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
