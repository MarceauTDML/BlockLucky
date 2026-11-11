import { Wallet, formatEther } from 'ethers';
import prisma from '../config/prisma.config';
import redis from '../config/redis.config';
import { env } from '../config/env.config';
import { decryptText, encryptText } from '../utils/crypto.util';
import { AppError } from '../utils/response.util';
import logger from '../utils/logger.util';
import chainClient from './chain.client';

interface WalletOwner {
  id: string;
  walletAddress: string;
  walletEncryptedKey: string | null;
  welcomeGrantTxHash?: string | null;
}

export interface CustodialWallet {
  address: string;
  encryptedKey: string;
}

const GRANT_LOCK_TTL_SECONDS = 120;
const GRANT_WAIT_MS = 30000;
const GRANT_POLL_MS = 500;

export class WalletService {
  public createCustodialWallet(): CustodialWallet {
    const wallet = Wallet.createRandom();
    return {
      address: wallet.address.toLowerCase(),
      encryptedKey: encryptText(wallet.privateKey),
    };
  }

  public signerFor(owner: Pick<WalletOwner, 'walletEncryptedKey'>): Wallet {
    if (!owner.walletEncryptedKey) {
      throw new AppError("Ce compte n'a pas encore de portefeuille BlockLucky", 409);
    }
    return chainClient.walletSigner(decryptText(owner.walletEncryptedKey));
  }

  public async ensureWallet<T extends WalletOwner>(owner: T): Promise<T> {
    if (owner.walletEncryptedKey) return owner;
    const wallet = this.createCustodialWallet();
    const updated = await prisma.user.update({
      where: { id: owner.id },
      data: { walletAddress: wallet.address, walletEncryptedKey: wallet.encryptedKey },
    });
    logger.info(`Portefeuille intégré créé pour le compte ${owner.id}`);
    return { ...owner, walletAddress: updated.walletAddress, walletEncryptedKey: updated.walletEncryptedKey };
  }

  public async grantWelcomeEthers(owner: WalletOwner): Promise<string | null> {
    if (!chainClient.isOnchain || owner.welcomeGrantTxHash) return owner.welcomeGrantTxHash ?? null;
    const amount = BigInt(env.WELCOME_GRANT_WEI);
    if (amount === 0n) return null;

    const lockKey = `wallet:grant-lock:${owner.id}`;
    if (!(await redis.setIfAbsent(lockKey, '1', GRANT_LOCK_TTL_SECONDS))) {
      return this.waitForPendingGrant(owner.id, lockKey);
    }

    try {
      const tx = await chainClient.operator.sendTransaction({ to: owner.walletAddress, value: amount });
      await tx.wait();
      await prisma.user.update({ where: { id: owner.id }, data: { welcomeGrantTxHash: tx.hash } });
      logger.info(`Dotation de bienvenue de ${formatEther(amount)} ETH versée au compte ${owner.id}`);
      return tx.hash;
    } catch (error) {
      await redis.del(lockKey);
      logger.error(`Dotation de bienvenue impossible pour le compte ${owner.id}`, {
        reason: (error as Error).message,
      });
      return null;
    }
  }

  private async waitForPendingGrant(ownerId: string, lockKey: string): Promise<string | null> {
    const deadline = Date.now() + GRANT_WAIT_MS;
    while (Date.now() < deadline) {
      const current = await prisma.user.findUnique({ where: { id: ownerId }, select: { welcomeGrantTxHash: true } });
      if (current?.welcomeGrantTxHash) return current.welcomeGrantTxHash;
      if ((await redis.get(lockKey)) === null) return null;
      await new Promise((resolve) => setTimeout(resolve, GRANT_POLL_MS));
    }
    return null;
  }

  public async balanceOf(address: string): Promise<bigint | null> {
    if (!chainClient.isOnchain) return null;
    try {
      return await chainClient.provider.getBalance(address);
    } catch {
      return null;
    }
  }
}

export const walletService = new WalletService();
export default walletService;
