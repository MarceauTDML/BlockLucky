SET lock_timeout = '5s';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "walletEncryptedKey" TEXT,
ADD COLUMN "welcomeGrantTxHash" TEXT;

-- AlterTable
ALTER TABLE "LotteryRound" ADD COLUMN "drawRequestedAt" TIMESTAMPTZ(3),
ADD COLUMN "endsAt" TIMESTAMPTZ(3),
ADD COLUMN "prizeClaimedAt" TIMESTAMPTZ(3),
ADD COLUMN "prizeWei" TEXT,
ADD COLUMN "ticketPriceWei" TEXT,
ADD COLUMN "winningTicket" INTEGER;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "payerWallet" TEXT,
ADD COLUMN "ticketIndex" INTEGER;

-- CreateTable
CREATE TABLE "ChainCursor" (
    "id" TEXT NOT NULL,
    "lastBlock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ChainCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_transactionHash_idx" ON "Ticket"("transactionHash");

-- DropIndex
DROP INDEX "Ticket_transactionHash_key";

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_lotteryId_ticketIndex_key" ON "Ticket"("lotteryId", "ticketIndex");
