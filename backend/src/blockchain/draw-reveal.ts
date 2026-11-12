import redis from '../config/redis.config';
import { env } from '../config/env.config';

const READY_AT_TTL_SECONDS = 7 * 24 * 3600;

const readyAtKey = (contractRoundId: number) => `chain:draw-ready-at:${contractRoundId}`;

export const readDrawReadyAt = async (contractRoundId: number): Promise<number | null> => {
  const raw = await redis.get(readyAtKey(contractRoundId));
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const markDrawReady = async (contractRoundId: number, candidateMs: number): Promise<number> => {
  await redis.setIfAbsent(readyAtKey(contractRoundId), String(candidateMs), READY_AT_TTL_SECONDS);
  return (await readDrawReadyAt(contractRoundId)) ?? candidateMs;
};

export const revealAtFrom = (readyAtMs: number): number => readyAtMs + env.DRAW_REVEAL_DELAY_SECONDS * 1000;

export const readyCandidate = (endTime: Date, nowMs = Date.now()): number => Math.min(nowMs, endTime.getTime());
