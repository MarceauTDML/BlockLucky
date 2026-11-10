import { randomUUID } from 'crypto';
import redis from '../config/redis.config';
import { generateOtpCode, hmacSha256, safeEqual } from '../utils/crypto.util';
import { AppError } from '../utils/response.util';

export type ChallengePurpose = 'LOGIN' | 'SIGNUP' | 'SETUP';

export interface PendingSignup {
  walletAddress: string;
  email: string;
  referrerId?: string | undefined;
  provider: string;
  ageGroup?: string | undefined;
  utmSource?: string | undefined;
}

interface StoredChallenge {
  hash: string;
  purpose: ChallengePurpose;
  attempts: number;
  expiresAt: number;
  signup?: PendingSignup | undefined;
}

export interface VerifiedChallenge {
  purpose: ChallengePurpose;
  signup?: PendingSignup | undefined;
}

const CODE_TTL_SECONDS = 10 * 60;
const MAX_ATTEMPTS_PER_CODE = 5;
const MAX_FAILURES_PER_ACCOUNT = 10;
const FAILURE_WINDOW_SECONDS = 60 * 60;
const TOTP_REPLAY_TTL_SECONDS = 120;

const challengeKey = (subjectId: string) => `auth:otp:${subjectId}`;
const failuresKey = (subjectId: string) => `auth:otp-failures:${subjectId}`;
const totpUsedKey = (userId: string, counter: number) => `auth:totp-used:${userId}:${counter}`;

const hashCode = (subjectId: string, code: string) => hmacSha256(`${subjectId}:${code.trim()}`);

export class OtpChallengeService {
  public newSubjectId(): string {
    return randomUUID();
  }

  public async issue(
    subjectId: string,
    purpose: ChallengePurpose,
    signup?: PendingSignup
  ): Promise<string> {
    const code = generateOtpCode(6);
    const challenge: StoredChallenge = {
      hash: hashCode(subjectId, code),
      purpose,
      attempts: 0,
      expiresAt: Date.now() + CODE_TTL_SECONDS * 1000,
      ...(signup ? { signup } : {}),
    };
    await redis.set(challengeKey(subjectId), JSON.stringify(challenge), CODE_TTL_SECONDS);
    return code;
  }

  public async hasPending(subjectId: string): Promise<boolean> {
    const raw = await redis.get(challengeKey(subjectId));
    if (!raw) return false;
    const challenge = JSON.parse(raw) as StoredChallenge;
    return challenge.expiresAt > Date.now();
  }

  public async assertNotLocked(subjectId: string): Promise<void> {
    const failures = Number((await redis.get(failuresKey(subjectId))) ?? 0);
    if (failures >= MAX_FAILURES_PER_ACCOUNT) {
      throw new AppError(
        'Trop de codes erronés. La vérification est bloquée pendant une heure pour ce compte.',
        429
      );
    }
  }

  public async recordFailure(subjectId: string): Promise<void> {
    const failures = Number((await redis.get(failuresKey(subjectId))) ?? 0) + 1;
    await redis.set(failuresKey(subjectId), String(failures), FAILURE_WINDOW_SECONDS);
  }

  public async clearFailures(subjectId: string): Promise<void> {
    await redis.del(failuresKey(subjectId));
  }

  public async consume(subjectId: string, code: string): Promise<VerifiedChallenge | null> {
    const key = challengeKey(subjectId);
    const raw = await redis.get(key);
    if (!raw) return null;
    const challenge = JSON.parse(raw) as StoredChallenge;

    if (challenge.expiresAt <= Date.now() || challenge.attempts >= MAX_ATTEMPTS_PER_CODE) {
      await redis.del(key);
      return null;
    }

    if (!safeEqual(challenge.hash, hashCode(subjectId, code))) {
      const attempts = challenge.attempts + 1;
      if (attempts >= MAX_ATTEMPTS_PER_CODE) {
        await redis.del(key);
      } else {
        const remaining = Math.max(1, Math.ceil((challenge.expiresAt - Date.now()) / 1000));
        await redis.set(key, JSON.stringify({ ...challenge, attempts }), remaining);
      }
      return null;
    }

    await redis.del(key);
    return { purpose: challenge.purpose, signup: challenge.signup };
  }

  public async markTotpUsed(userId: string, counter: number): Promise<boolean> {
    return redis.setIfAbsent(totpUsedKey(userId, counter), '1', TOTP_REPLAY_TTL_SECONDS);
  }
}

export const otpChallengeService = new OtpChallengeService();
export default otpChallengeService;
