import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface RoundConfig {
  ticketPrice: bigint;
  maxTickets: number;
  minTicketsToDraw: number;
  maxTicketsPerPlayer: number;
  duration: bigint;
  feeBps: number;
}

export interface VrfConfig {
  keyHash: string;
  subscriptionId: bigint;
  callbackGasLimit: number;
  requestConfirmations: number;
  nativePayment: boolean;
  drawTimeout: bigint;
}

export interface DeploymentRecord {
  network: string;
  chainId: number;
  deployedAt: string;
  deploymentBlock: number;
  admin: string;
  operator?: string;
  treasury: string;
  contracts: {
    lottery: string;
    poap: string;
    vrfCoordinator: string;
  };
  vrf: {
    keyHash: string;
    subscriptionId: string;
    mock: boolean;
  };
  roundConfig: {
    ticketPriceWei: string;
    maxTickets: number;
    minTicketsToDraw: number;
    maxTicketsPerPlayer: number;
    durationSeconds: string;
    feeBps: number;
  };
}

const envNumber = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} doit être un entier positif`);
  return value;
};

export const roundConfigFromEnv = (defaults: { durationSeconds: number }): RoundConfig => ({
  ticketPrice: BigInt(process.env.TICKET_PRICE_WEI ?? "10000000000000000"),
  maxTickets: envNumber("MAX_TICKETS", 10000),
  minTicketsToDraw: envNumber("MIN_TICKETS_TO_DRAW", 2),
  maxTicketsPerPlayer: envNumber("MAX_TICKETS_PER_PLAYER", 1),
  duration: BigInt(envNumber("ROUND_DURATION_SECONDS", defaults.durationSeconds)),
  feeBps: envNumber("MUNICIPALITY_FEE_BPS", 1000),
});

export const findEventArg = <T>(
  contract: { interface: { parseLog: (log: { topics: string[]; data: string }) => { name: string; args: Record<string, unknown> } | null } },
  logs: ReadonlyArray<{ topics: ReadonlyArray<string>; data: string }>,
  eventName: string,
  argName: string,
): T => {
  for (const log of logs) {
    try {
      const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed?.name === eventName) return parsed.args[argName] as T;
    } catch {
      continue;
    }
  }
  throw new Error(`Événement ${eventName} introuvable`);
};

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const deploymentPath = (networkName: string): string =>
  resolve(process.env.DEPLOYMENTS_DIR ?? resolve(projectRoot, "deployments"), `${networkName}.json`);

export const writeDeployment = (record: DeploymentRecord): string => {
  const target = deploymentPath(record.network);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return target;
};

export const serializeRoundConfig = (config: RoundConfig): DeploymentRecord["roundConfig"] => ({
  ticketPriceWei: config.ticketPrice.toString(),
  maxTickets: config.maxTickets,
  minTicketsToDraw: config.minTicketsToDraw,
  maxTicketsPerPlayer: config.maxTicketsPerPlayer,
  durationSeconds: config.duration.toString(),
  feeBps: config.feeBps,
});
