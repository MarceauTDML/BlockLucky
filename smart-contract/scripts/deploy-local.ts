import { network } from "hardhat";
import {
  findEventArg,
  roundConfigFromEnv,
  serializeConstructorArgs,
  serializeRoundConfig,
  writeDeployment,
} from "./lib/deployment.js";
import { applyRoles, planRoles, readRoleHolders, roleProblems, roleSummaryRows } from "./lib/roles.js";

const { ethers } = await network.create();

const LOCAL_KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";

const signers = await ethers.getSigners();
const signerAt = (name: string, fallback: number) => {
  const index = Number(process.env[name] ?? fallback);
  const signer = signers[index];
  if (!signer) throw new Error(`${name} : aucun compte Hardhat à l'index ${index}`);
  return signer;
};
const deployer = signers[0]!;
const treasury = signerAt("LOCAL_TREASURY_ACCOUNT_INDEX", 1);
const mairieAdmin = signerAt("LOCAL_ADMIN_ACCOUNT_INDEX", 2);
const chain = await ethers.provider.getNetwork();
const roundConfig = roundConfigFromEnv({ durationSeconds: 30 * 60 });

const operatorAddress =
  process.env.OPERATOR_ADDRESS ||
  (process.env.OPERATOR_PRIVATE_KEY ? new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY).address : deployer.address);
const strictRoles = process.env.LOCAL_STRICT_ROLES === "true";

const plan = planRoles({
  deployer: deployer.address,
  admin: mairieAdmin.address,
  treasury: treasury.address,
  operator: operatorAddress,
  pauser: process.env.PAUSER_ADDRESS,
  vrfOwner: mairieAdmin.address,
  allowSharedRoles: !strictRoles,
  extraAdmins: strictRoles ? [] : [operatorAddress],
});

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

const vrfConfig = {
  keyHash: LOCAL_KEY_HASH,
  subscriptionId,
  callbackGasLimit: 500000,
  requestConfirmations: 1,
  nativePayment: false,
  drawTimeout: 10n * 60n,
};
const lotteryArgs = [await coordinator.getAddress(), deployer.address, plan.treasury, roundConfig, vrfConfig];
const lottery = await ethers.deployContract("BlockLucky", lotteryArgs);
await lottery.waitForDeployment();
await (await coordinator.addConsumer(subscriptionId, await lottery.getAddress())).wait();

const poapArgs = [deployer.address, process.env.POAP_BASE_URI ?? "http://localhost:2053/api/v1/lottery/poap/"];
const poap = await ethers.deployContract("BlockLuckyPOAP", poapArgs);
await poap.waitForDeployment();

const applied = await applyRoles({ lottery, poap }, plan, (message) => console.log(message));
if (applied.vrfOwnershipPending) {
  await (await lottery.connect(mairieAdmin).acceptOwnership()).wait();
  console.log(`BlockLucky : propriété VRF acceptée par ${mairieAdmin.address}`);
}

const problems = roleProblems(await readRoleHolders({ lottery, poap }, plan), plan, { vrfOwnershipAccepted: true });
if (problems.length > 0) throw new Error(`Rôles incohérents :\n${problems.join("\n")}`);

if (operatorAddress.toLowerCase() !== deployer.address.toLowerCase()) {
  await (
    await deployer.sendTransaction({
      to: operatorAddress,
      value: ethers.parseEther(process.env.OPERATOR_FUNDING_ETH ?? "1000"),
    })
  ).wait();
  console.log(`Opérateur backend ${operatorAddress} approvisionné`);
}

const lotteryAddress = await lottery.getAddress();
const poapAddress = await poap.getAddress();

const file = writeDeployment({
  network: "localhost",
  chainId: Number(chain.chainId),
  deployedAt: new Date().toISOString(),
  deploymentBlock,
  admin: plan.admin,
  operator: plan.operator,
  treasury: plan.treasury,
  contracts: {
    lottery: lotteryAddress,
    poap: poapAddress,
    vrfCoordinator: await coordinator.getAddress(),
  },
  vrf: {
    keyHash: LOCAL_KEY_HASH,
    subscriptionId: subscriptionId.toString(),
    mock: true,
    nativePayment: false,
    subscriptionOwner: deployer.address,
    consumerAdded: true,
  },
  roles: {
    ...plan,
    deployerRenouncedAdmin: applied.deployerRenouncedAdmin,
    vrfOwnershipPending: false,
  },
  constructorArgs: {
    lottery: serializeConstructorArgs(lotteryArgs),
    poap: serializeConstructorArgs(poapArgs),
  },
  roundConfig: serializeRoundConfig(roundConfig),
});

console.table(roleSummaryRows(plan, { lottery: lotteryAddress, poap: poapAddress }));
if (!strictRoles) {
  console.log(
    `L'opérateur backend conserve DEFAULT_ADMIN_ROLE en local pour setTreasury (LOCAL_STRICT_ROLES=true pour séparer strictement)`,
  );
}
console.log(`BlockLucky déployé sur ${lotteryAddress}`);
console.log(`BlockLuckyPOAP déployé sur ${poapAddress}`);
console.log(`Coordinateur VRF simulé sur ${await coordinator.getAddress()} (abonnement ${subscriptionId})`);
console.log(`Déploiement enregistré dans ${file}`);
