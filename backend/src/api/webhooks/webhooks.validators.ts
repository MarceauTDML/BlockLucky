import { z } from 'zod';

const txHash = z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Hash de transaction invalide');
const wallet = z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Adresse de portefeuille invalide');
const roundId = z.coerce.number().int().min(1).max(1000000);

export const blockchainWebhookSchema = z.object({
  body: z.discriminatedUnion('eventType', [
    z.object({
      eventType: z.literal('TICKET_PURCHASED'),
      payload: z.object({
        transactionHash: txHash,
        blockNumber: z.coerce.number().int().min(0),
        walletAddress: wallet,
        contractRoundId: roundId,
        ticketPriceEth: z.coerce.number().positive().max(10).optional(),
      }),
    }),
    z.object({
      eventType: z.literal('WINNER_PICKED'),
      payload: z.object({
        contractRoundId: roundId,
        winnerWallet: wallet,
        chainlinkRequestId: z.string().max(128).optional(),
      }),
    }),
    z.object({
      eventType: z.literal('RPC_FALLBACK_SWITCH'),
      payload: z.object({ active: z.boolean() }),
    }),
  ]),
});
