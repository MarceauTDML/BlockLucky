import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import { readDeployment } from "./lib/deployment.js";

const deployment = readDeployment("sepolia");
if (!deployment.constructorArgs) {
  throw new Error("Arguments de constructeur absents de deployments/sepolia.json : redéployer avec npm run deploy:sepolia");
}

const targets = [
  {
    label: "BlockLucky",
    address: deployment.contracts.lottery,
    contract: "contracts/BlockLucky.sol:BlockLucky",
    constructorArgs: deployment.constructorArgs.lottery,
  },
  {
    label: "BlockLuckyPOAP",
    address: deployment.contracts.poap,
    contract: "contracts/BlockLuckyPOAP.sol:BlockLuckyPOAP",
    constructorArgs: deployment.constructorArgs.poap,
  },
];

for (const target of targets) {
  console.log(`Vérification de ${target.label} (${target.address})`);
  await verifyContract(
    {
      address: target.address,
      contract: target.contract,
      constructorArgs: target.constructorArgs,
      provider: "etherscan",
    },
    hre,
  );
  console.log(`${target.label} vérifié : https://sepolia.etherscan.io/address/${target.address}#code`);
}
