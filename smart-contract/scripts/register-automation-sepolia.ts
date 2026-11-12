import { network } from "hardhat";
import { findEventArg, readDeployment, writeDeployment } from "./lib/deployment.js";
import {
  DEFAULT_SEPOLIA_AUTOMATION_REGISTRAR,
  DEFAULT_SEPOLIA_LINK_TOKEN,
  SEPOLIA_CHAIN_ID,
  automationRegistrarAbi,
  linkTokenAbi,
} from "./lib/sepolia.js";

const { ethers } = await network.create();

const GAS_LIMIT = Number(process.env.AUTOMATION_GAS_LIMIT ?? 500000);
const CONDITIONAL_TRIGGER = 0;

const [deployer] = await ethers.getSigners();
if (!deployer) throw new Error("Aucun compte configuré : renseigner SEPOLIA_PRIVATE_KEY dans le keystore Hardhat");
const chain = await ethers.provider.getNetwork();
if (chain.chainId !== SEPOLIA_CHAIN_ID) {
  throw new Error(`Réseau inattendu (chainId ${chain.chainId}), ce script cible Sepolia`);
}

const deployment = readDeployment("sepolia");
if (deployment.automation && process.env.AUTOMATION_FORCE !== "true") {
  throw new Error(
    `Upkeep déjà enregistré (${deployment.automation.upkeepId}) pour ${deployment.contracts.lottery} : AUTOMATION_FORCE=true pour en créer un autre`,
  );
}

const registrarAddress = process.env.SEPOLIA_AUTOMATION_REGISTRAR ?? DEFAULT_SEPOLIA_AUTOMATION_REGISTRAR;
const linkAddress = process.env.SEPOLIA_LINK_TOKEN ?? DEFAULT_SEPOLIA_LINK_TOKEN;
const amount = ethers.parseEther(process.env.AUTOMATION_LINK_AMOUNT ?? "5");
const upkeepAdmin = ethers.getAddress(process.env.AUTOMATION_ADMIN_ADDRESS ?? deployment.admin);
const upkeepName = process.env.AUTOMATION_UPKEEP_NAME ?? "BlockLucky EtherBay";

const registrar = new ethers.Contract(registrarAddress, automationRegistrarAbi, deployer);
const link = new ethers.Contract(linkAddress, linkTokenAbi, deployer);

const [registry, minLinkJuels] = (await registrar.getFunction("getConfig")()) as [string, bigint];
if (amount < minLinkJuels) {
  throw new Error(`AUTOMATION_LINK_AMOUNT trop faible : minimum ${ethers.formatEther(minLinkJuels)} LINK`);
}
const linkBalance = (await link.getFunction("balanceOf")(deployer.address)) as bigint;
if (linkBalance < amount) {
  throw new Error(
    `Solde LINK insuffisant : ${ethers.formatEther(linkBalance)} LINK sur ${deployer.address}, ${ethers.formatEther(amount)} requis (faucets.chain.link)`,
  );
}

const allowance = (await link.getFunction("allowance")(deployer.address, registrarAddress)) as bigint;
if (allowance < amount) {
  await (await link.getFunction("approve")(registrarAddress, amount)).wait();
  console.log(`${ethers.formatEther(amount)} LINK autorisés pour le registrar ${registrarAddress}`);
}

const tx = await registrar.getFunction("registerUpkeep")({
  name: upkeepName,
  encryptedEmail: "0x",
  upkeepContract: deployment.contracts.lottery,
  gasLimit: GAS_LIMIT,
  adminAddress: upkeepAdmin,
  triggerType: CONDITIONAL_TRIGGER,
  checkData: "0x",
  triggerConfig: "0x",
  offchainConfig: "0x",
  amount,
});
const receipt = await tx.wait();
let upkeepId: bigint;
try {
  upkeepId = findEventArg<bigint>(registrar, receipt!.logs, "RegistrationApproved", "upkeepId");
} catch {
  const hash = findEventArg<string>(registrar, receipt!.logs, "RegistrationRequested", "hash");
  throw new Error(`Inscription en attente d'approbation manuelle par Chainlink (hash ${hash}, transaction ${tx.hash})`);
}

deployment.automation = {
  registrar: registrarAddress,
  registry,
  linkToken: linkAddress,
  upkeepId: upkeepId.toString(),
  upkeepAdmin,
  gasLimit: GAS_LIMIT,
  fundedLinkJuels: amount.toString(),
  registeredAt: new Date().toISOString(),
  transactionHash: tx.hash,
};
const file = writeDeployment(deployment);

console.log(`Upkeep ${upkeepId} enregistré pour ${deployment.contracts.lottery} (registre ${registry})`);
console.log(`Administrateur de l'upkeep : ${upkeepAdmin}`);
console.log(`Suivi : https://automation.chain.link/sepolia/${upkeepId}`);
console.log(`Déploiement mis à jour dans ${file}`);
