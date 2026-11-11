import { network } from "hardhat";

export const { ethers, networkHelpers } = await network.create();

export const TICKET_PRICE = ethers.parseEther("0.01");
export const ROUND_DURATION = 48n * 60n * 60n;
export const DRAW_TIMEOUT = 24n * 60n * 60n;
export const KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";

export const RoundStatus = { Open: 0n, Drawing: 1n, Completed: 2n, Cancelled: 3n } as const;

export interface RoundConfigInput {
  ticketPrice: bigint;
  maxTickets: number;
  minTicketsToDraw: number;
  maxTicketsPerPlayer: number;
  duration: bigint;
  feeBps: number;
}

export const defaultRoundConfig = (overrides: Partial<RoundConfigInput> = {}): RoundConfigInput => ({
  ticketPrice: TICKET_PRICE,
  maxTickets: 20,
  minTicketsToDraw: 2,
  maxTicketsPerPlayer: 10,
  duration: ROUND_DURATION,
  feeBps: 1000,
  ...overrides,
});

export const defaultVrfConfig = (subscriptionId: bigint) => ({
  keyHash: KEY_HASH,
  subscriptionId,
  callbackGasLimit: 500000,
  requestConfirmations: 3,
  nativePayment: false,
  drawTimeout: DRAW_TIMEOUT,
});

export async function deployLotteryFixture() {
  const [deployer, admin, treasury, alice, bob, carol, outsider] = await ethers.getSigners();

  const coordinator = await ethers.deployContract("VRFCoordinatorV2_5Mock", [
    ethers.parseEther("0.1"),
    1000000000n,
    4000000000000000n,
  ]);
  const createTx = await coordinator.createSubscription();
  const receipt = await createTx.wait();
  const created = receipt!.logs
    .map((log) => {
      try {
        return coordinator.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed?.name === "SubscriptionCreated");
  const subscriptionId = created!.args.subId as bigint;
  await coordinator.fundSubscription(subscriptionId, ethers.parseEther("1000"));

  const lottery = await ethers.deployContract("BlockLucky", [
    await coordinator.getAddress(),
    admin.address,
    treasury.address,
    defaultRoundConfig(),
    defaultVrfConfig(subscriptionId),
  ]);
  await coordinator.addConsumer(subscriptionId, await lottery.getAddress());

  return { lottery, coordinator, subscriptionId, deployer, admin, treasury, alice, bob, carol, outsider };
}

export async function deployPoapFixture() {
  const [admin, alice, bob, outsider] = await ethers.getSigners();
  const poap = await ethers.deployContract("BlockLuckyPOAP", [admin.address, "https://poap.etherbay.fr/rounds/"]);
  return { poap, admin, alice, bob, outsider };
}
