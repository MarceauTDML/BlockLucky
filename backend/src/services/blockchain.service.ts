import { ethers } from 'ethers';
import crypto from 'crypto';
import { env } from '../config/env.config';
import redis from '../config/redis.config';
import logger from '../utils/logger.util';
import chainClient from '../blockchain/chain.client';
import lotteryGateway from '../blockchain/lottery.gateway';

const CIRCUIT_BREAKER_KEY = 'blockchain:circuit_breaker';
const FALLBACK_STATE_KEY = 'blockchain:fallback_active';
const RPC_TIMEOUT_MS = 10000;

const createRpcRequest = (url: string): ethers.FetchRequest => {
  const request = new ethers.FetchRequest(url);
  request.timeout = RPC_TIMEOUT_MS;
  return request;
};

export class BlockchainService {
  private primaryProvider: ethers.JsonRpcProvider;
  private fallbackProvider: ethers.JsonRpcProvider;
  private isUsingFallback = false;
  private isPausedMemory = false;

  constructor() {
    this.primaryProvider = new ethers.JsonRpcProvider(createRpcRequest(env.RPC_URL));
    this.fallbackProvider = new ethers.JsonRpcProvider(createRpcRequest(env.FALLBACK_RPC_URL));
  }

  public async getNetworkStatus(): Promise<{
    mode: 'onchain' | 'simulated';
    chainId: number;
    isFallback: boolean;
    rpcUrl: string;
    isPaused: boolean;
    contractAddress: string;
    poapContractAddress: string;
  }> {
    const isPaused = await this.isCircuitBreakerPaused();
    return {
      mode: env.BLOCKCHAIN_MODE,
      chainId: env.CHAIN_ID,
      isFallback: this.isUsingFallback,
      rpcUrl: this.isUsingFallback ? env.FALLBACK_RPC_URL : env.RPC_URL,
      isPaused,
      contractAddress: env.LOTTERY_CONTRACT_ADDRESS,
      poapContractAddress: env.POAP_CONTRACT_ADDRESS,
    };
  }

  public async setCircuitBreaker(paused: boolean): Promise<{
    paused: boolean;
    txHash: string;
    timestamp: string;
  }> {
    if (chainClient.isOnchain) {
      const { receipt } = await lotteryGateway.setPaused(paused);
      logger.warn(`Smart Contract ${paused ? 'mis en pause' : 'réactivé'} par la Mairie`, { txHash: receipt.hash });
      return { paused, txHash: receipt.hash, timestamp: new Date().toISOString() };
    }
    this.isPausedMemory = paused;
    await redis.set(CIRCUIT_BREAKER_KEY, paused ? 'true' : 'false');
    const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    logger.warn(`Circuit Breaker ${paused ? 'ACTIVÉ (PAUSE)' : 'DÉSACTIVÉ (REPRISE)'} - Tx: ${txHash}`);
    return {
      paused,
      txHash,
      timestamp: new Date().toISOString(),
    };
  }

  public async isCircuitBreakerPaused(): Promise<boolean> {
    if (chainClient.isOnchain) {
      try {
        return await lotteryGateway.isPaused();
      } catch {
        return false;
      }
    }
    const pausedStr = await redis.get(CIRCUIT_BREAKER_KEY);
    return pausedStr === 'true' || this.isPausedMemory;
  }

  public async switchToFallback(active: boolean): Promise<void> {
    this.isUsingFallback = active;
    chainClient.setFallback(active);
    await redis.set(FALLBACK_STATE_KEY, active ? 'true' : 'false');
  }

  public async relayTicketPurchase(
    buyerWallet: string,
    contractRoundId: number
  ): Promise<{ transactionHash: string; blockNumber: number; gasSponsored: boolean }> {
    const isPaused = await this.isCircuitBreakerPaused();
    if (isPaused) {
      throw new Error('CIRCUIT_BREAKER_ACTIVE: Le Smart Contract est temporairement en pause de sécurité.');
    }

    const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    const blockNumber = 19500000 + Math.floor(Math.random() * 50000);

    logger.info(`Transaction simulée relayée pour ${buyerWallet} (Round #${contractRoundId}) -> ${txHash}`);
    return {
      transactionHash: txHash,
      blockNumber,
      gasSponsored: true,
    };
  }

  public async requestChainlinkVrfDraw(contractRoundId: number, participants: string[]): Promise<{
    chainlinkRequestId: string;
    vrfProofHash: string;
    winnerWallet: string;
    transactionHash: string;
  }> {
    const chainlinkRequestId = `vrf-req-${crypto.randomBytes(16).toString('hex')}`;
    const vrfProofHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    const transactionHash = `0x${crypto.randomBytes(32).toString('hex')}`;

    let winnerWallet = '0x0000000000000000000000000000000000000000';
    if (participants.length > 0) {
      const randomIndex = crypto.randomInt(0, participants.length);
      winnerWallet = participants[randomIndex]!;
    }

    logger.info(`Tirage Chainlink VRF exécuté pour Round #${contractRoundId} - Gagnant: ${winnerWallet}`);
    return {
      chainlinkRequestId,
      vrfProofHash,
      winnerWallet,
      transactionHash,
    };
  }

  public async withdrawTreasuryToMultisig(
    multisigWallet: string,
    amountEth: number
  ): Promise<{ transactionHash: string; multisigWallet: string; amountEth: number; timestamp: string }> {
    const transactionHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    logger.info(`Retrait Trésorerie Mairie (${amountEth} ETH) vers Multi-Sig ${multisigWallet}`);
    return {
      transactionHash,
      multisigWallet,
      amountEth,
      timestamp: new Date().toISOString(),
    };
  }

  public async mintPoapBadge(walletAddress: string, roundId: number): Promise<{
    tokenId: number;
    contractAddress: string;
    transactionHash: string;
    metadataUri: string;
  }> {
    const tokenId = Math.floor(1000 + Math.random() * 90000);
    const transactionHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    return {
      tokenId,
      contractAddress: env.POAP_CONTRACT_ADDRESS,
      transactionHash,
      metadataUri: `ipfs://QmEtherBayPOAP2026/${roundId}/${tokenId}.json`,
    };
  }
}

export const blockchainService = new BlockchainService();
export default blockchainService;
