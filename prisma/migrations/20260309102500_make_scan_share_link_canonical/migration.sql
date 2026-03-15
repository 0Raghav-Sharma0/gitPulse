-- Canonicalize share links to one record per scan.
UPDATE "RepoScanShareLink"
SET "revokedAt" = NULL
WHERE "revokedAt" IS NOT NULL;

WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "scanId"
            ORDER BY "createdAt" ASC
        ) AS rn
    FROM "RepoScanShareLink"
)
DELETE FROM "RepoScanShareLink"
WHERE "id" IN (
    SELECT "id" FROM ranked WHERE rn > 1
);

CREATE UNIQUE INDEX "RepoScanShareLink_scanId_key" ON "RepoScanShareLink"("scanId");
