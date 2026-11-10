SET lock_timeout = '5s';

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN "ownerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "twoFactorBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Partner_ownerId_idx" ON "Partner"("ownerId");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
ALTER TABLE "Partner" VALIDATE CONSTRAINT "Partner_ownerId_fkey";
