import { readFileSync } from "node:fs";
import { network } from "hardhat";
import { deploymentPath, type DeploymentRecord } from "./lib/deployment.js";

const { ethers } = await network.create();

const deployment = JSON.parse(readFileSync(deploymentPath("localhost"), "utf8")) as DeploymentRecord;
const signers = await ethers.getSigners();
const oracle = signers[Number(process.env.VRF_ORACLE_ACCOUNT_INDEX ?? 9)] ?? signers[0]!;
const coordinator = await ethers.getContractAt("VRFCoordinatorV2_5Mock", deployment.contracts.vrfCoordinator, oracle);
const pollIntervalMs = Number(process.env.VRF_POLL_INTERVAL_MS ?? 2000);
const fulfilled = new Set<string>();
let fromBlock = deployment.deploymentBlock;

console.log(`Oracle VRF local actif sur ${deployment.contracts.vrfCoordinator} (signataire ${oracle.address})`);

const fulfillPending = async () => {
  const latest = await ethers.provider.getBlockNumber();
  if (latest < fromBlock) return;
  const events = await coordinator.queryFilter(coordinator.filters.RandomWordsRequested(), fromBlock, latest);
  fromBlock = latest + 1;

  for (const event of events) {
    const requestId = event.args.requestId.toString();
    if (fulfilled.has(requestId)) continue;
    fulfilled.add(requestId);
    const tx = await coordinator.fulfillRandomWords(event.args.requestId, event.args.sender);
    await tx.wait();
    console.log(`Aléa fourni pour la requête ${requestId} (consommateur ${event.args.sender})`);
  }
};

for (;;) {
  try {
    await fulfillPending();
  } catch (error) {
    console.error(`Oracle VRF local : ${(error as Error).message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
}
