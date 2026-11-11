import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { network } from "hardhat";
import { roundConfigFromEnv, serializeRoundConfig, writeDeployment } from "./lib/deployment.js";

const { ethers } = await network.create();

const SEPOLIA_CHAIN_ID = 11155111n;
const DEFAULT_COORDINATOR = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
const DEFAULT_KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";

const coordinatorAbi = [
  "function s_provingKeys(bytes32) view returns (bool exists, uint64 maxGas)",
  "function getSubscription(uint256 subId) view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address subOwner, address[] consumers)",
  "function addConsumer(uint256 subId, address consumer)",
];

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Variable ${name} manquante`);
  return value;
};

const [deployer] = await ethers.getSigners();
const chain = await ethers.provider.getNetwork();
if (chain.chainId !== SEPOLIA_CHAIN_ID) {
  throw new Error(`Réseau inattendu (chainId ${chain.chainId}), ce script cible Sepolia`);
}

const coordinatorAddress = process.env.SEPOLIA_VRF_COORDINATOR ?? DEFAULT_COORDINATOR;
const keyHash = process.env.SEPOLIA_VRF_KEY_HASH ?? DEFAULT_KEY_HASH;
const subscriptionId = BigInt(required("SEPOLIA_VRF_SUBSCRIPTION_ID"));
const admin = process.env.MAIRIE_ADMIN_ADDRESS ?? deployer.address;
const treasury = process.env.MAIRIE_TREASURY_ADDRESS ?? deployer.address;
const roundConfig = roundConfigFromEnv({ durationSeconds: 48 * 60 * 60 });

const coordinator = new ethers.Contract(coordinatorAddress, coordinatorAbi, deployer);
const provingKey = await coordinator.s_provingKeys(keyHash);
if (!provingKey.exists) {
  throw new Error(`La key hash ${keyHash} n'est pas enregistrée sur le coordinateur ${coordinatorAddress}`);
}
const subscription = await coordinator.getSubscription(subscriptionId);
if (subscription.balance === 0n && subscription.nativeBalance === 0n) {
  throw new Error(`L'abonnement VRF ${subscriptionId} n'est pas financé (LINK ou ETH Sepolia)`);
}

console.log(`Déploiement par ${deployer.address}, administrateur ${admin}, trésorerie ${treasury}`);

const lottery = await ethers.deployContract("BlockLucky", [
  coordinatorAddress,
  admin,
  treasury,
  roundConfig,
  {
    keyHash,
    subscriptionId,
    callbackGasLimit: 500000,
    requestConfirmations: 3,
    nativePayment: subscription.balance === 0n,
    drawTimeout: 24n * 60n * 60n,
  },
]);
await lottery.waitForDeployment();
const deploymentBlock = await ethers.provider.getBlockNumber();
const lotteryAddress = await lottery.getAddress();

const poapBaseUri = required("POAP_BASE_URI");
const poap = await ethers.deployContract("BlockLuckyPOAP", [admin, poapBaseUri]);
await poap.waitForDeployment();
const poapAddress = await poap.getAddress();

if (subscription.subOwner.toLowerCase() === deployer.address.toLowerCase()) {
  await (await coordinator.addConsumer(subscriptionId, lotteryAddress)).wait();
  console.log(`Contrat ajouté comme consommateur de l'abonnement VRF ${subscriptionId}`);
} else {
  console.log(
    `À faire par ${subscription.subOwner} dans le Subscription Manager Chainlink : ajouter ${lotteryAddress} comme consommateur de l'abonnement ${subscriptionId}`,
  );
}

const operatorAddress = process.env.OPERATOR_ADDRESS ?? "";
if (operatorAddress && operatorAddress.toLowerCase() !== admin.toLowerCase()) {
  if (admin.toLowerCase() === deployer.address.toLowerCase()) {
    await (await lottery.grantRole(await lottery.OPERATOR_ROLE(), operatorAddress)).wait();
    await (await lottery.grantRole(await lottery.PAUSER_ROLE(), operatorAddress)).wait();
    await (await poap.grantRole(await poap.MINTER_ROLE(), operatorAddress)).wait();
    console.log(`Opérateur backend ${operatorAddress} habilité (OPERATOR_ROLE, PAUSER_ROLE, MINTER_ROLE)`);
  } else {
    console.log(
      `À faire par l'administrateur ${admin} : accorder OPERATOR_ROLE et PAUSER_ROLE sur ${lotteryAddress} et MINTER_ROLE sur ${poapAddress} à ${operatorAddress}`,
    );
  }
}

const file = writeDeployment({
  network: "sepolia",
  chainId: Number(chain.chainId),
  deployedAt: new Date().toISOString(),
  deploymentBlock,
  admin,
  ...(operatorAddress ? { operator: operatorAddress } : {}),
  treasury,
  contracts: { lottery: lotteryAddress, poap: poapAddress, vrfCoordinator: coordinatorAddress },
  vrf: { keyHash, subscriptionId: subscriptionId.toString(), mock: false },
  roundConfig: serializeRoundConfig(roundConfig),
});

const argsFile = resolve(dirname(file), "sepolia-blocklucky-args.ts");
writeFileSync(
  argsFile,
  `export default ${JSON.stringify(
    [
      coordinatorAddress,
      admin,
      treasury,
      {
        ticketPrice: roundConfig.ticketPrice.toString(),
        maxTickets: roundConfig.maxTickets,
        minTicketsToDraw: roundConfig.minTicketsToDraw,
        maxTicketsPerPlayer: roundConfig.maxTicketsPerPlayer,
        duration: roundConfig.duration.toString(),
        feeBps: roundConfig.feeBps,
      },
      {
        keyHash,
        subscriptionId: subscriptionId.toString(),
        callbackGasLimit: 500000,
        requestConfirmations: 3,
        nativePayment: subscription.balance === 0n,
        drawTimeout: (24 * 60 * 60).toString(),
      },
    ],
    null,
    2,
  )};\n`,
  "utf8",
);

console.log(`BlockLucky : ${lotteryAddress}`);
console.log(`BlockLuckyPOAP : ${poapAddress}`);
console.log(`Déploiement enregistré dans ${file}`);
console.log(`Vérification Etherscan de BlockLucky : npx hardhat verify --network sepolia --constructor-args-path ${argsFile} ${lotteryAddress}`);
console.log(`Vérification Etherscan de BlockLuckyPOAP : npx hardhat verify --network sepolia ${poapAddress} ${admin} "${poapBaseUri}"`);
