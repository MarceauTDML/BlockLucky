import { network } from "hardhat";
import { findEventArg, roundConfigFromEnv, serializeRoundConfig, writeDeployment } from "./lib/deployment.js";

const { ethers } = await network.create();

const LOCAL_KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";

const [mairie, treasury] = await ethers.getSigners();
const chain = await ethers.provider.getNetwork();
const roundConfig = roundConfigFromEnv({ durationSeconds: 30 * 60 });

const coordinator = await ethers.deployContract("VRFCoordinatorV2_5Mock", [
  ethers.parseEther("0.1"),
  1000000000n,
  4000000000000000n,
]);
await coordinator.waitForDeployment();
const deploymentBlock = await ethers.provider.getBlockNumber();

const subscriptionTx = await coordinator.createSubscription();
const subscriptionReceipt = await subscriptionTx.wait();
const subscriptionId = findEventArg<bigint>(coordinator, subscriptionReceipt!.logs, "SubscriptionCreated", "subId");
await (await coordinator.fundSubscription(subscriptionId, ethers.parseEther("10000"))).wait();

const lottery = await ethers.deployContract("BlockLucky", [
  await coordinator.getAddress(),
  mairie.address,
  treasury.address,
  roundConfig,
  {
    keyHash: LOCAL_KEY_HASH,
    subscriptionId,
    callbackGasLimit: 500000,
    requestConfirmations: 1,
    nativePayment: false,
    drawTimeout: 10n * 60n,
  },
]);
await lottery.waitForDeployment();
await (await coordinator.addConsumer(subscriptionId, await lottery.getAddress())).wait();

const poap = await ethers.deployContract("BlockLuckyPOAP", [
  mairie.address,
  process.env.POAP_BASE_URI ?? "http://localhost:2053/api/v1/lottery/poap/",
]);
await poap.waitForDeployment();

const operatorAddress =
  process.env.OPERATOR_ADDRESS ||
  (process.env.OPERATOR_PRIVATE_KEY ? new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY).address : "");
if (operatorAddress && operatorAddress.toLowerCase() !== mairie.address.toLowerCase()) {
  await (await lottery.grantRole(await lottery.OPERATOR_ROLE(), operatorAddress)).wait();
  await (await lottery.grantRole(await lottery.PAUSER_ROLE(), operatorAddress)).wait();
  await (await poap.grantRole(await poap.MINTER_ROLE(), operatorAddress)).wait();
  await (
    await mairie.sendTransaction({
      to: operatorAddress,
      value: ethers.parseEther(process.env.OPERATOR_FUNDING_ETH ?? "1000"),
    })
  ).wait();
  console.log(`Opérateur backend ${operatorAddress} habilité et approvisionné`);
}

const file = writeDeployment({
  network: "localhost",
  chainId: Number(chain.chainId),
  deployedAt: new Date().toISOString(),
  deploymentBlock,
  admin: mairie.address,
  ...(operatorAddress ? { operator: operatorAddress } : {}),
  treasury: treasury.address,
  contracts: {
    lottery: await lottery.getAddress(),
    poap: await poap.getAddress(),
    vrfCoordinator: await coordinator.getAddress(),
  },
  vrf: { keyHash: LOCAL_KEY_HASH, subscriptionId: subscriptionId.toString(), mock: true },
  roundConfig: serializeRoundConfig(roundConfig),
});

console.log(`BlockLucky déployé sur ${await lottery.getAddress()}`);
console.log(`BlockLuckyPOAP déployé sur ${await poap.getAddress()}`);
console.log(`Coordinateur VRF simulé sur ${await coordinator.getAddress()} (abonnement ${subscriptionId})`);
console.log(`Déploiement enregistré dans ${file}`);
