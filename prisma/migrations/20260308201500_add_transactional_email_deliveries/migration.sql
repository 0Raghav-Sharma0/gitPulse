-- CreateEnum
CREATE TYPE "TransactionalEmailTemplate" AS ENUM ('WELCOME');

-- CreateEnum
CREATE TYPE "TransactionalEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "TransactionalEmailDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "template" "TransactionalEmailTemplate" NOT NULL,
    "status" "TransactionalEmailStatus" NOT NULL DEFAULT 'PENDING',
    "toEmail" TEXT NOT NULL,
    "templateData" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "providerEventType" TEXT,
    "providerPayload" JSONB,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionalEmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionalEmailDelivery_userId_template_key" ON "TransactionalEmailDelivery"("userId", "template");

-- CreateIndex
CREATE INDEX "TransactionalEmailDelivery_status_nextRetryAt_idx" ON "TransactionalEmailDelivery"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "TransactionalEmailDelivery_providerMessageId_idx" ON "TransactionalEmailDelivery"("providerMessageId");

-- AddForeignKey
ALTER TABLE "TransactionalEmailDelivery" ADD CONSTRAINT "TransactionalEmailDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
