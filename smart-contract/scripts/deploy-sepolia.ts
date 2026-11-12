import { network } from "hardhat";
import { roundConfigFromEnv, serializeConstructorArgs, serializeRoundConfig, writeDeployment } from "./lib/deployment.js";
import {
  applyRoles,
  planRoles,
  readRoleHolders,
  roleInputFromEnv,
  roleProblems,
  roleSummaryRows,
} from "./lib/roles.js";
import {
  DEFAULT_SEPOLIA_COORDINATOR,
  DEFAULT_SEPOLIA_KEY_HASH,
  SEPOLIA_CHAIN_ID,
  resolveSubscriptionId,
  vrfCoordinatorAbi,
} from "./lib/sepolia.js";

const { ethers } = await network.create();

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Variable ${name} manquante`);
  return value;
};

const [deployer] = await ethers.getSigners();
if (!deployer) throw new Error("Aucun compte configuré : renseigner SEPOLIA_PRIVATE_KEY dans le keystore Hardhat");
const chain = await ethers.provider.getNetwork();
if (chain.chainId !== SEPOLIA_CHAIN_ID) {
  throw new Error(`Réseau inattendu (chainId ${chain.chainId}), ce script cible Sepolia`);
}

const plan = planRoles(roleInputFromEnv(deployer.address));
const coordinatorAddress = process.env.SEPOLIA_VRF_COORDINATOR ?? DEFAULT_SEPOLIA_COORDINATOR;
const keyHash = process.env.SEPOLIA_VRF_KEY_HASH ?? DEFAULT_SEPOLIA_KEY_HASH;
const subscriptionId = resolveSubscriptionId(coordinatorAddress);
if (subscriptionId === null) {
  throw new Error("Abonnement VRF introuvable : lancer npm run vrf:sepolia ou renseigner SEPOLIA_VRF_SUBSCRIPTION_ID");
}
const poapBaseUri = required("POAP_BASE_URI");
const roundConfig = roundConfigFromEnv({ durationSeconds: 48 * 60 * 60 });

const coordinator = new ethers.Contract(coordinatorAddress, vrfCoordinatorAbi, deployer);
const provingKey = await coordinator.getFunction("s_provingKeys")(keyHash);
if (!provingKey.exists) {
  throw new Error(`La key hash ${keyHash} n'est pas enregistrée sur le coordinateur ${coordinatorAddress}`);
}
const subscription = await coordinator.getFunction("getSubscription")(subscriptionId);
const linkBalance = subscription.balance as bigint;
const nativeBalance = subscription.nativeBalance as bigint;
if (linkBalance === 0n && nativeBalance === 0n) {
  throw new Error(`L'abonnement VRF ${subscriptionId} n'est pas financé (LINK ou ETH Sepolia)`);
}
const nativePayment = process.env.VRF_NATIVE_PAYMENT
  ? process.env.VRF_NATIVE_PAYMENT === "true"
  : nativeBalance > 0n;
const subscriptionOwner = subscription.subOwner as string;
const ownsSubscription = subscriptionOwner.toLowerCase() === deployer.address.toLowerCase();

console.log(`Déploiement par ${deployer.address} sur Sepolia`);
console.log(`Abonnement VRF ${subscriptionId} (paiement ${nativePayment ? "en ETH natif" : "en LINK"})`);

const vrfConfig = {
  keyHash,
  subscriptionId,
  callbackGasLimit: 500000,
  requestConfirmations: 3,
  nativePayment,
  drawTimeout: 24n * 60n * 60n,
};
const lotteryArgs = [coordinatorAddress, deployer.address, plan.treasury, roundConfig, vrfConfig];
const lottery = await ethers.deployContract("BlockLucky", lotteryArgs);
await lottery.waitForDeployment();
const deploymentReceipt = await lottery.deploymentTransaction()?.wait();
const deploymentBlock = deploymentReceipt?.blockNumber ?? (await ethers.provider.getBlockNumber());
const lotteryAddress = await lottery.getAddress();
console.log(`BlockLucky déployé sur ${lotteryAddress}`);

const poapArgs = [deployer.address, poapBaseUri];
const poap = await ethers.deployContract("BlockLuckyPOAP", poapArgs);
await poap.waitForDeployment();
const poapAddress = await poap.getAddress();
console.log(`BlockLuckyPOAP déployé sur ${poapAddress}`);

let consumerAdded = false;
if (ownsSubscription) {
  await (await coordinator.getFunction("addConsumer")(subscriptionId, lotteryAddress)).wait();
  consumerAdded = true;
  console.log(`Contrat ajouté comme consommateur de l'abonnement VRF ${subscriptionId}`);
}

const applied = await applyRoles({ lottery, poap }, plan, (message) => console.log(message));
const problems = roleProblems(await readRoleHolders({ lottery, poap }, plan), plan, { vrfOwnershipAccepted: false });
if (problems.length > 0) throw new Error(`Rôles incohérents :\n${problems.join("\n")}`);

const file = writeDeployment({
  network: "sepolia",
  chainId: Number(chain.chainId),
  deployedAt: new Date().toISOString(),
  deploymentBlock,
  admin: plan.admin,
  operator: plan.operator,
  treasury: plan.treasury,
  contracts: { lottery: lotteryAddress, poap: poapAddress, vrfCoordinator: coordinatorAddress },
  vrf: {
    keyHash,
    subscriptionId: subscriptionId.toString(),
    mock: false,
    nativePayment,
    subscriptionOwner,
    consumerAdded,
  },
  roles: {
    ...plan,
    deployerRenouncedAdmin: applied.deployerRenouncedAdmin,
    vrfOwnershipPending: applied.vrfOwnershipPending,
  },
  constructorArgs: {
    lottery: serializeConstructorArgs(lotteryArgs),
    poap: serializeConstructorArgs(poapArgs),
  },
  roundConfig: serializeRoundConfig(roundConfig),
});

console.table(roleSummaryRows(plan, { lottery: lotteryAddress, poap: poapAddress }));
console.log(`Déploiement enregistré dans ${file}`);
console.log(`Bloc de déploiement (CHAIN_START_BLOCK) : ${deploymentBlock}`);

const pending: string[] = [];
if (!consumerAdded) {
  pending.push(
    `${subscriptionOwner} : ajouter ${lotteryAddress} comme consommateur de l'abonnement ${subscriptionId} sur vrf.chain.link (addConsumer)`,
  );
}
if (applied.vrfOwnershipPending) {
  pending.push(
    `${plan.vrfOwner} : appeler acceptOwnership() sur ${lotteryAddress} pour devenir propriétaire VRF (transaction du multisig, onglet Write Contract d'Etherscan ou Transaction Builder Safe)`,
  );
}
if (applied.deployerRenouncedAdmin) {
  console.log(`Le déployeur ${deployer.address} ne détient plus aucun rôle d'administration`);
}
if (pending.length > 0) {
  console.log("Actions restantes :");
  for (const step of pending) console.log(`- ${step}`);
}
console.log("Étapes suivantes : npm run automation:sepolia puis npm run verify:sepolia");
