SET lock_timeout = '5s';

-- AlterTable
ALTER TABLE "Analytics" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMPTZ(3) USING "timestamp" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "ClaimedReward" ALTER COLUMN "claimedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "claimedAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "LotteryRound" ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "startedAt" AT TIME ZONE 'UTC',
ALTER COLUMN "drawnAt" SET DATA TYPE TIMESTAMPTZ(3) USING "drawnAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Partner" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "PointTransaction" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "RewardCatalog" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "purchasedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "purchasedAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Token" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMPTZ(3) USING "expiresAt" AT TIME ZONE 'UTC',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC',
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "deletedAt" AT TIME ZONE 'UTC';

-- CreateIndex
CREATE INDEX "Analytics_eventType_timestamp_idx" ON "Analytics"("eventType", "timestamp");

-- CreateIndex
CREATE INDEX "Analytics_userId_idx" ON "Analytics"("userId");

-- CreateIndex
CREATE INDEX "ClaimedReward_userId_claimedAt_idx" ON "ClaimedReward"("userId", "claimedAt");

-- CreateIndex
CREATE INDEX "ClaimedReward_rewardId_idx" ON "ClaimedReward"("rewardId");

-- CreateIndex
CREATE INDEX "LotteryRound_status_idx" ON "LotteryRound"("status");

-- CreateIndex
CREATE INDEX "PointTransaction_userId_createdAt_idx" ON "PointTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardCatalog_partnerId_idx" ON "RewardCatalog"("partnerId");

-- CreateIndex
CREATE INDEX "Ticket_userId_purchasedAt_idx" ON "Ticket"("userId", "purchasedAt");

-- CreateIndex
CREATE INDEX "Ticket_lotteryId_idx" ON "Ticket"("lotteryId");

-- CreateIndex
CREATE INDEX "Token_userId_idx" ON "Token"("userId");

-- CreateIndex
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

-- AddCheckConstraint
ALTER TABLE "User" ADD CONSTRAINT "User_pointsBalance_non_negative" CHECK ("pointsBalance" >= 0) NOT VALID;
ALTER TABLE "User" VALIDATE CONSTRAINT "User_pointsBalance_non_negative";

-- AddCheckConstraint
ALTER TABLE "RewardCatalog" ADD CONSTRAINT "RewardCatalog_remainingStock_non_negative" CHECK ("remainingStock" >= 0) NOT VALID;
ALTER TABLE "RewardCatalog" VALIDATE CONSTRAINT "RewardCatalog_remainingStock_non_negative";

-- AddCheckConstraint
ALTER TABLE "RewardCatalog" ADD CONSTRAINT "RewardCatalog_totalStock_non_negative" CHECK ("totalStock" >= 0) NOT VALID;
ALTER TABLE "RewardCatalog" VALIDATE CONSTRAINT "RewardCatalog_totalStock_non_negative";

-- AddCheckConstraint
ALTER TABLE "RewardCatalog" ADD CONSTRAINT "RewardCatalog_costInPoints_positive" CHECK ("costInPoints" > 0) NOT VALID;
ALTER TABLE "RewardCatalog" VALIDATE CONSTRAINT "RewardCatalog_costInPoints_positive";

-- AddCheckConstraint
ALTER TABLE "LotteryRound" ADD CONSTRAINT "LotteryRound_prizePool_non_negative" CHECK ("prizePool" >= 0) NOT VALID;
ALTER TABLE "LotteryRound" VALIDATE CONSTRAINT "LotteryRound_prizePool_non_negative";
