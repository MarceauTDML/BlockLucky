SET lock_timeout = '5s';
-- CreateEnum
CREATE TYPE "AgeVerificationStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ageVerificationNote" TEXT,
ADD COLUMN     "ageVerificationStatus" "AgeVerificationStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "ageVerifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "IdentityDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AgeVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "frontEncrypted" BYTEA,
    "backEncrypted" BYTEA,
    "mimeType" TEXT NOT NULL,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewerId" TEXT,

    CONSTRAINT "IdentityDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentityDocument_userId_key" ON "IdentityDocument"("userId");

-- CreateIndex
CREATE INDEX "IdentityDocument_status_submittedAt_idx" ON "IdentityDocument"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "IdentityDocument_reviewerId_idx" ON "IdentityDocument"("reviewerId");

-- AddForeignKey
ALTER TABLE "IdentityDocument" ADD CONSTRAINT "IdentityDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityDocument" ADD CONSTRAINT "IdentityDocument_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

