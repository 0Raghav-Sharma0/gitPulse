-- DropIndex
DROP INDEX "RepoScan_expiresAt_idx";

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" TEXT,
    "author" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_published_createdAt_idx" ON "BlogPost"("published", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- RenameIndex
ALTER INDEX "ScanFindingVerification_owner_repo_findingFingerprint_createdAt" RENAME TO "ScanFindingVerification_owner_repo_findingFingerprint_creat_idx";

-- RenameIndex
ALTER INDEX "ScanFindingVerification_scanId_findingFingerprint_findingIndex_" RENAME TO "ScanFindingVerification_scanId_findingFingerprint_findingIn_key";
