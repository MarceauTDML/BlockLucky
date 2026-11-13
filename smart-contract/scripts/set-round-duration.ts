import { network } from "hardhat";
import { readDeployment } from "./lib/deployment.js";

const { ethers } = await network.create();

const seconds = Number(process.env.ROUND_DURATION_SECONDS);
if (!Number.isInteger(seconds) || seconds < 60) {
  throw new Error("ROUND_DURATION_SECONDS doit être un nombre entier de secondes, au moins 60");
}

const deployment = readDeployment(process.env.DEPLOYMENT_NETWORK ?? "localhost");
const signer = process.env.OPERATOR_PRIVATE_KEY
  ? new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, ethers.provider)
  : (await ethers.getSigners())[0]!;

const lottery = await ethers.getContractAt("BlockLucky", deployment.contracts.lottery, signer);
const current = await lottery.roundConfig();

const next = {
  ticketPrice: current.ticketPrice,
  maxTickets: current.maxTickets,
  minTicketsToDraw: current.minTicketsToDraw,
  maxTicketsPerPlayer: current.maxTicketsPerPlayer,
  duration: BigInt(seconds),
  feeBps: current.feeBps,
};

await (await lottery.setRoundConfig(next)).wait();

console.log(`Durée des prochains tours : ${current.duration} s -> ${seconds} s`);
console.log(`Tour en cours : ${await lottery.currentRoundId()} (sa fin reste inchangée)`);
