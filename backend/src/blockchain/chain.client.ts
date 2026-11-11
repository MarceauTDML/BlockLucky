import { Contract, FetchRequest, JsonRpcProvider, NonceManager, Wallet } from 'ethers';
import { env } from '../config/env.config';
import lotteryAbi from './abi/BlockLucky.json';
import poapAbi from './abi/BlockLuckyPOAP.json';

const RPC_TIMEOUT_MS = 15000;

const createProvider = (url: string): JsonRpcProvider => {
  const request = new FetchRequest(url);
  request.timeout = RPC_TIMEOUT_MS;
  return new JsonRpcProvider(request, env.CHAIN_ID, { staticNetwork: true, cacheTimeout: -1 });
};

class ChainClient {
  private primary: JsonRpcProvider | null = null;
  private fallback: JsonRpcProvider | null = null;
  private useFallback = false;
  private operatorSigner: NonceManager | null = null;

  public get isOnchain(): boolean {
    return env.BLOCKCHAIN_MODE === 'onchain';
  }

  public get isUsingFallback(): boolean {
    return this.useFallback;
  }

  public setFallback(active: boolean): void {
    if (this.useFallback === active) return;
    this.useFallback = active;
    this.operatorSigner = null;
  }

  public get provider(): JsonRpcProvider {
    if (this.useFallback) {
      this.fallback ??= createProvider(env.FALLBACK_RPC_URL);
      return this.fallback;
    }
    this.primary ??= createProvider(env.RPC_URL);
    return this.primary;
  }

  public get operator(): NonceManager {
    this.operatorSigner ??= new NonceManager(new Wallet(env.RELAYER_PRIVATE_KEY, this.provider));
    return this.operatorSigner;
  }

  public resetOperatorNonce(): void {
    this.operatorSigner?.reset();
  }

  public lottery(runner: Wallet | NonceManager | JsonRpcProvider = this.provider): Contract {
    return new Contract(env.LOTTERY_CONTRACT_ADDRESS, lotteryAbi, runner);
  }

  public poap(runner: Wallet | NonceManager | JsonRpcProvider = this.provider): Contract {
    return new Contract(env.POAP_CONTRACT_ADDRESS, poapAbi, runner);
  }

  public walletSigner(privateKey: string): Wallet {
    return new Wallet(privateKey, this.provider);
  }

  public explorerTxUrl(transactionHash: string | null | undefined): string | null {
    if (!env.EXPLORER_URL || !transactionHash || !/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) return null;
    return `${env.EXPLORER_URL.replace(/\/$/, '')}/tx/${transactionHash}`;
  }

  public explorerAddressUrl(address: string | null | undefined): string | null {
    if (!env.EXPLORER_URL || !address) return null;
    return `${env.EXPLORER_URL.replace(/\/$/, '')}/address/${address}`;
  }

  public async isContractDeployed(): Promise<boolean> {
    const code = await this.provider.getCode(env.LOTTERY_CONTRACT_ADDRESS);
    return code !== '0x';
  }

  public destroy(): void {
    this.primary?.destroy();
    this.fallback?.destroy();
    this.primary = null;
    this.fallback = null;
    this.operatorSigner = null;
  }
}

export const chainClient = new ChainClient();
export default chainClient;
