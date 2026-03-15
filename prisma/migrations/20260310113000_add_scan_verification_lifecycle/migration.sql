CREATE TYPE "FindingLifecycleStatus" AS ENUM (
    'DETECTED',
    'AUTO_VERIFIED_TRUE',
    'AUTO_REJECTED_FALSE',
    'INCONCLUSIVE_HIDDEN',
    'OPEN',
    'CLOSED'
);

CREATE TYPE "FindingGateDecision" AS ENUM (
    'INCLUDE',
    'EXCLUDE'
);

CREATE TYPE "FixVerificationRunStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'PASSED',
    'FAILED'
);

CREATE TABLE "ScanFindingVerification" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "findingFingerprint" TEXT NOT NULL,
    "findingIndex" INTEGER NOT NULL,
    "ruleId" TEXT,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "line" INTEGER,
    "confidence" TEXT,
    "verificationStatus" "FindingLifecycleStatus" NOT NULL,
    "lifecycleStatus" "FindingLifecycleStatus" NOT NULL,
    "gateDecision" "FindingGateDecision" NOT NULL,
    "verificationScore" DOUBLE PRECISION,
    "verificationSignals" JSONB,
    "verificationRationale" TEXT,
    "exploitabilityTag" TEXT,
    "closedAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScanFindingVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FixVerificationRun" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "findingFingerprint" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "changedFiles" JSONB NOT NULL,
    "status" "FixVerificationRunStatus" NOT NULL DEFAULT 'PENDING',
    "regressionTestsPassed" BOOLEAN,
    "regressionSummary" TEXT,
    "targetedRescanPassed" BOOLEAN,
    "targetedRescanFindings" INTEGER,
    "fullRescanTriggered" BOOLEAN NOT NULL DEFAULT false,
    "fullRescanPassed" BOOLEAN,
    "closeReasons" JSONB,
    "finalizedAt" TIMESTAMP(3),
    "autoSignedOffAt" TIMESTAMP(3),
    "requestedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FixVerificationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScanFindingVerification_scanId_createdAt_idx" ON "ScanFindingVerification"("scanId", "createdAt" DESC);
CREATE INDEX "ScanFindingVerification_owner_repo_findingFingerprint_createdAt_idx" ON "ScanFindingVerification"("owner", "repo", "findingFingerprint", "createdAt" DESC);
CREATE INDEX "ScanFindingVerification_lifecycleStatus_createdAt_idx" ON "ScanFindingVerification"("lifecycleStatus", "createdAt" DESC);
CREATE UNIQUE INDEX "ScanFindingVerification_scanId_findingFingerprint_findingIndex_key" ON "ScanFindingVerification"("scanId", "findingFingerprint", "findingIndex");

CREATE INDEX "FixVerificationRun_scanId_createdAt_idx" ON "FixVerificationRun"("scanId", "createdAt" DESC);
CREATE INDEX "FixVerificationRun_owner_repo_findingFingerprint_createdAt_idx" ON "FixVerificationRun"("owner", "repo", "findingFingerprint", "createdAt" DESC);
CREATE INDEX "FixVerificationRun_status_createdAt_idx" ON "FixVerificationRun"("status", "createdAt" DESC);

ALTER TABLE "ScanFindingVerification"
    ADD CONSTRAINT "ScanFindingVerification_scanId_fkey"
    FOREIGN KEY ("scanId") REFERENCES "RepoScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FixVerificationRun"
    ADD CONSTRAINT "FixVerificationRun_scanId_fkey"
    FOREIGN KEY ("scanId") REFERENCES "RepoScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FixVerificationRun"
    ADD CONSTRAINT "FixVerificationRun_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
