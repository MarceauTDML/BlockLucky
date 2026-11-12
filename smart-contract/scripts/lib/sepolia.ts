import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { deploymentPath } from "./deployment.js";

export const SEPOLIA_CHAIN_ID = 11155111n;
export const DEFAULT_SEPOLIA_COORDINATOR = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
export const DEFAULT_SEPOLIA_KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";
export const DEFAULT_SEPOLIA_LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
export const DEFAULT_SEPOLIA_AUTOMATION_REGISTRAR = "0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976";
export const DEFAULT_SEPOLIA_AUTOMATION_REGISTRY = "0x86EFBD0b6736Bed994962f9797049422A3A8E8Ad";

export const vrfCoordinatorAbi = [
  "event SubscriptionCreated(uint256 indexed subId, address owner)",
  "function createSubscription() returns (uint256 subId)",
  "function fundSubscriptionWithNative(uint256 subId) payable",
  "function s_provingKeys(bytes32) view returns (bool exists, uint64 maxGas)",
  "function getSubscription(uint256 subId) view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address subOwner, address[] consumers)",
  "function addConsumer(uint256 subId, address consumer)",
];

export const linkTokenAbi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export const automationRegistrarAbi = [
  "event RegistrationRequested(bytes32 indexed hash, string name, bytes encryptedEmail, address indexed upkeepContract, uint32 gasLimit, address adminAddress, uint8 triggerType, bytes triggerConfig, bytes offchainConfig, bytes checkData, uint96 amount)",
  "event RegistrationApproved(bytes32 indexed hash, string displayName, uint256 indexed upkeepId)",
  "function getConfig() view returns (address keeperRegistry, uint256 minLINKJuels)",
  "function registerUpkeep((string name, bytes encryptedEmail, address upkeepContract, uint32 gasLimit, address adminAddress, uint8 triggerType, bytes checkData, bytes triggerConfig, bytes offchainConfig, uint96 amount) requestParams) returns (uint256)",
];

export interface VrfSubscriptionRecord {
  coordinator: string;
  subscriptionId: string;
  owner: string;
  nativeBalanceWei: string;
  linkBalanceJuels: string;
  updatedAt: string;
}

export const vrfSubscriptionPath = (): string => deploymentPath("sepolia-vrf");

export const readVrfSubscription = (): VrfSubscriptionRecord | null => {
  const source = vrfSubscriptionPath();
  if (!existsSync(source)) return null;
  return JSON.parse(readFileSync(source, "utf8")) as VrfSubscriptionRecord;
};

export const writeVrfSubscription = (record: VrfSubscriptionRecord): string => {
  const target = vrfSubscriptionPath();
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return target;
};

export const resolveSubscriptionId = (coordinator: string): bigint | null => {
  if (process.env.SEPOLIA_VRF_SUBSCRIPTION_ID) return BigInt(process.env.SEPOLIA_VRF_SUBSCRIPTION_ID);
  const stored = readVrfSubscription();
  if (stored && stored.coordinator.toLowerCase() === coordinator.toLowerCase()) return BigInt(stored.subscriptionId);
  return null;
};
