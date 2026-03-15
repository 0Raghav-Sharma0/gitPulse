-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Backfill first-publish timestamp for existing published rows
UPDATE "BlogPost"
SET "publishedAt" = "createdAt"
WHERE "published" = true
  AND "publishedAt" IS NULL;

-- CreateIndex
CREATE INDEX "BlogPost_published_publishedAt_idx" ON "BlogPost"("published", "publishedAt" DESC);
