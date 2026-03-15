-- Add report-level expiration to RepoScan (7-day lifecycle)
ALTER TABLE "RepoScan" ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "RepoScan"
SET "expiresAt" = to_timestamp(("timestamp" / 1000.0)) + INTERVAL '7 days'
WHERE "expiresAt" IS NULL;

ALTER TABLE "RepoScan" ALTER COLUMN "expiresAt" SET NOT NULL;
CREATE INDEX "RepoScan_expiresAt_idx" ON "RepoScan"("expiresAt");
