import { network } from "hardhat";
import { findEventArg } from "./lib/deployment.js";
import {
  DEFAULT_SEPOLIA_COORDINATOR,
  SEPOLIA_CHAIN_ID,
  resolveSubscriptionId,
  vrfCoordinatorAbi,
  writeVrfSubscription,
} from "./lib/sepolia.js";

const { ethers } = await network.create();

const [deployer] = await ethers.getSigners();
if (!deployer) throw new Error("Aucun compte configuré : renseigner SEPOLIA_PRIVATE_KEY dans le keystore Hardhat");
const chain = await ethers.provider.getNetwork();
if (chain.chainId !== SEPOLIA_CHAIN_ID) {
  throw new Error(`Réseau inattendu (chainId ${chain.chainId}), ce script cible Sepolia`);
}

const coordinatorAddress = process.env.SEPOLIA_VRF_COORDINATOR ?? DEFAULT_SEPOLIA_COORDINATOR;
const fundAmount = ethers.parseEther(process.env.VRF_FUND_ETH ?? "0.5");
const coordinator = new ethers.Contract(coordinatorAddress, vrfCoordinatorAbi, deployer);

const balance = await ethers.provider.getBalance(deployer.address);
if (balance <= fundAmount) {
  throw new Error(
    `Solde insuffisant : ${ethers.formatEther(balance)} ETH sur ${deployer.address}, ${ethers.formatEther(fundAmount)} ETH à verser plus le gaz`,
  );
}

const existing = process.env.VRF_NEW_SUBSCRIPTION === "true" ? null : resolveSubscriptionId(coordinatorAddress);
let subscriptionId: bigint;
if (existing !== null) {
  subscriptionId = existing;
  console.log(`Abonnement VRF existant ${subscriptionId} : rechargement uniquement`);
} else {
  const receipt = await (await coordinator.getFunction("createSubscription")()).wait();
  subscriptionId = findEventArg<bigint>(coordinator, receipt!.logs, "SubscriptionCreated", "subId");
  console.log(`Abonnement VRF créé : ${subscriptionId}`);
}

if (fundAmount > 0n) {
  await (await coordinator.getFunction("fundSubscriptionWithNative")(subscriptionId, { value: fundAmount })).wait();
  console.log(`Abonnement ${subscriptionId} financé avec ${ethers.formatEther(fundAmount)} ETH Sepolia`);
}

const subscription = await coordinator.getFunction("getSubscription")(subscriptionId);
const file = writeVrfSubscription({
  coordinator: coordinatorAddress,
  subscriptionId: subscriptionId.toString(),
  owner: subscription.subOwner as string,
  nativeBalanceWei: (subscription.nativeBalance as bigint).toString(),
  linkBalanceJuels: (subscription.balance as bigint).toString(),
  updatedAt: new Date().toISOString(),
});

console.log(`Solde natif de l'abonnement : ${ethers.formatEther(subscription.nativeBalance as bigint)} ETH`);
console.log(`Abonnement enregistré dans ${file}`);
console.log(`SEPOLIA_VRF_SUBSCRIPTION_ID=${subscriptionId}`);
