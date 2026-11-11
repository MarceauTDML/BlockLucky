import { expect } from "chai";
import {
  DRAW_TIMEOUT,
  ROUND_DURATION,
  RoundStatus,
  TICKET_PRICE,
  defaultRoundConfig,
  defaultVrfConfig,
  deployLotteryFixture,
  ethers,
  networkHelpers,
} from "./fixtures.js";

const { loadFixture, time } = networkHelpers;

async function readyToDrawFixture() {
  const context = await loadFixture(deployLotteryFixture);
  const { lottery, alice, bob, carol } = context;
  await lottery.connect(alice).buyTickets(3, { value: TICKET_PRICE * 3n });
  await lottery.connect(bob).buyTickets(5, { value: TICKET_PRICE * 5n });
  await lottery.connect(carol).buyTickets(2, { value: TICKET_PRICE * 2n });
  await time.increase(ROUND_DURATION);
  return context;
}

async function requestDraw(lottery: Awaited<ReturnType<typeof deployLotteryFixture>>["lottery"]) {
  const tx = await lottery.requestDraw();
  const receipt = await tx.wait();
  const event = receipt!.logs
    .map((log) => {
      try {
        return lottery.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed?.name === "DrawRequested");
  return event!.args.requestId as bigint;
}

describe("BlockLucky", function () {
  describe("Déploiement", function () {
    it("ouvre le premier tour avec la configuration fournie", async function () {
      const { lottery } = await loadFixture(deployLotteryFixture);
      const round = await lottery.getRound(1n);
      expect(await lottery.currentRoundId()).to.equal(1n);
      expect(round.status).to.equal(RoundStatus.Open);
      expect(round.ticketPrice).to.equal(TICKET_PRICE);
      expect(round.maxTickets).to.equal(20n);
      expect(round.endTime - round.startTime).to.equal(ROUND_DURATION);
    });

    it("attribue les rôles d'administration à la Mairie", async function () {
      const { lottery, admin } = await loadFixture(deployLotteryFixture);
      expect(await lottery.hasRole(await lottery.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
      expect(await lottery.hasRole(await lottery.OPERATOR_ROLE(), admin.address)).to.equal(true);
      expect(await lottery.hasRole(await lottery.PAUSER_ROLE(), admin.address)).to.equal(true);
    });

    it("refuse une configuration incohérente ou une adresse nulle", async function () {
      const { coordinator, subscriptionId, admin, treasury } = await loadFixture(deployLotteryFixture);
      const factory = await ethers.getContractFactory("BlockLucky");
      const coordinatorAddress = await coordinator.getAddress();

      await expect(
        factory.deploy(coordinatorAddress, ethers.ZeroAddress, treasury.address, defaultRoundConfig(), defaultVrfConfig(subscriptionId)),
      ).to.be.revertedWithCustomError(factory, "ZeroAddressNotAllowed");

      for (const invalid of [
        { ticketPrice: 0n },
        { minTicketsToDraw: 0 },
        { minTicketsToDraw: 21 },
        { maxTicketsPerPlayer: 21 },
        { feeBps: 2001 },
        { duration: 0n },
      ]) {
        await expect(
          factory.deploy(coordinatorAddress, admin.address, treasury.address, defaultRoundConfig(invalid), defaultVrfConfig(subscriptionId)),
        ).to.be.revertedWithCustomError(factory, "InvalidConfiguration");
      }

      await expect(
        factory.deploy(coordinatorAddress, admin.address, treasury.address, defaultRoundConfig(), {
          ...defaultVrfConfig(subscriptionId),
          callbackGasLimit: 50000,
        }),
      ).to.be.revertedWithCustomError(factory, "InvalidConfiguration");
    });
  });

  describe("Achat de tickets", function () {
    it("enregistre l'achat, la contribution et émet TicketsPurchased", async function () {
      const { lottery, alice } = await loadFixture(deployLotteryFixture);
      await expect(lottery.connect(alice).buyTickets(3, { value: TICKET_PRICE * 3n }))
        .to.emit(lottery, "TicketsPurchased")
        .withArgs(1n, alice.address, alice.address, 3n, 0n, 3n, TICKET_PRICE * 3n);

      expect(await lottery.ticketsOf(1n, alice.address)).to.equal(3n);
      expect(await lottery.contributionOf(1n, alice.address)).to.equal(TICKET_PRICE * 3n);
      expect(await lottery.ticketOwner(1n, 2n)).to.equal(alice.address);
      expect((await lottery.getRound(1n)).totalCollected).to.equal(TICKET_PRICE * 3n);
      expect(await ethers.provider.getBalance(await lottery.getAddress())).to.equal(TICKET_PRICE * 3n);
    });

    it("permet d'offrir des tickets : le bénéficiaire les détient, le payeur est remboursable", async function () {
      const { lottery, admin, alice, bob } = await loadFixture(deployLotteryFixture);
      await expect(lottery.connect(alice).buyTicketsFor(bob.address, 2, { value: TICKET_PRICE * 2n }))
        .to.emit(lottery, "TicketsPurchased")
        .withArgs(1n, bob.address, alice.address, 2n, 0n, 2n, TICKET_PRICE * 2n);
      expect(await lottery.ticketsOf(1n, bob.address)).to.equal(2n);
      expect(await lottery.ticketsOf(1n, alice.address)).to.equal(0n);
      expect(await lottery.ticketOwner(1n, 1n)).to.equal(bob.address);

      await expect(
        lottery.connect(alice).buyTicketsFor(ethers.ZeroAddress, 1, { value: TICKET_PRICE }),
      ).to.be.revertedWithCustomError(lottery, "ZeroAddressNotAllowed");

      await lottery.connect(admin).cancelRound();
      await expect(lottery.connect(alice).claimRefund(1n)).to.changeEtherBalance(ethers, alice, TICKET_PRICE * 2n);
      await expect(lottery.connect(bob).claimRefund(1n)).to.be.revertedWithCustomError(lottery, "NothingToRefund");
    });

    it("refuse un montant inexact ou une quantité nulle", async function () {
      const { lottery, alice } = await loadFixture(deployLotteryFixture);
      await expect(lottery.connect(alice).buyTickets(2, { value: TICKET_PRICE }))
        .to.be.revertedWithCustomError(lottery, "IncorrectPayment")
        .withArgs(TICKET_PRICE * 2n, TICKET_PRICE);
      await expect(lottery.connect(alice).buyTickets(1, { value: TICKET_PRICE * 2n })).to.be.revertedWithCustomError(
        lottery,
        "IncorrectPayment",
      );
      await expect(lottery.connect(alice).buyTickets(0)).to.be.revertedWithCustomError(lottery, "InvalidQuantity");
    });

    it("applique la limite de tickets par joueur", async function () {
      const { lottery, alice } = await loadFixture(deployLotteryFixture);
      await lottery.connect(alice).buyTickets(8, { value: TICKET_PRICE * 8n });
      await expect(lottery.connect(alice).buyTickets(3, { value: TICKET_PRICE * 3n }))
        .to.be.revertedWithCustomError(lottery, "PlayerLimitReached")
        .withArgs(8n, 10n);
    });

    it("refuse les achats au-delà du nombre maximal de tickets", async function () {
      const { lottery, alice, bob, carol } = await loadFixture(deployLotteryFixture);
      await lottery.connect(alice).buyTickets(10, { value: TICKET_PRICE * 10n });
      await lottery.connect(bob).buyTickets(9, { value: TICKET_PRICE * 9n });
      await expect(lottery.connect(carol).buyTickets(2, { value: TICKET_PRICE * 2n }))
        .to.be.revertedWithCustomError(lottery, "RoundSoldOut")
        .withArgs(1n, 1n);
    });

    it("refuse les achats après la fin du tour", async function () {
      const { lottery, alice } = await loadFixture(deployLotteryFixture);
      await time.increase(ROUND_DURATION);
      await expect(lottery.connect(alice).buyTickets(1, { value: TICKET_PRICE })).to.be.revertedWithCustomError(
        lottery,
        "RoundExpired",
      );
    });

    it("refuse tout envoi direct d'ethers hors achat", async function () {
      const { lottery, alice } = await loadFixture(deployLotteryFixture);
      await expect(alice.sendTransaction({ to: await lottery.getAddress(), value: TICKET_PRICE })).to.revert(ethers);
    });
  });

  describe("Tirage au sort", function () {
    it("n'est pas déclenchable avant la fin du tour ni sous le minimum de participants", async function () {
      const { lottery, alice } = await loadFixture(deployLotteryFixture);
      await lottery.connect(alice).buyTickets(1, { value: TICKET_PRICE });
      await expect(lottery.requestDraw()).to.be.revertedWithCustomError(lottery, "DrawNotReady");
      await time.increase(ROUND_DURATION);
      expect(await lottery.isDrawReady()).to.equal(false);
      await expect(lottery.requestDraw()).to.be.revertedWithCustomError(lottery, "DrawNotReady");
    });

    it("devient possible dès que tous les tickets sont vendus, avant la fin de la durée", async function () {
      const { lottery, alice, bob } = await loadFixture(deployLotteryFixture);
      await lottery.connect(alice).buyTickets(10, { value: TICKET_PRICE * 10n });
      expect(await lottery.isDrawReady()).to.equal(false);
      await lottery.connect(bob).buyTickets(10, { value: TICKET_PRICE * 10n });
      expect(await lottery.isDrawReady()).to.equal(true);
    });

    it("est ouvert à tous une fois les conditions remplies et verrouille le tour", async function () {
      const { lottery, outsider, alice } = await loadFixture(readyToDrawFixture);
      await expect(lottery.connect(outsider).requestDraw()).to.emit(lottery, "DrawRequested");
      expect((await lottery.getRound(1n)).status).to.equal(RoundStatus.Drawing);
      await expect(lottery.connect(alice).buyTickets(1, { value: TICKET_PRICE }))
        .to.be.revertedWithCustomError(lottery, "RoundNotOpen")
        .withArgs(1n);
      await expect(lottery.requestDraw()).to.be.revertedWithCustomError(lottery, "DrawNotReady");
    });

    it("désigne le gagnant à partir de l'aléa Chainlink VRF et ouvre le tour suivant", async function () {
      const { lottery, coordinator, bob } = await loadFixture(readyToDrawFixture);
      const requestId = await requestDraw(lottery);
      const collected = TICKET_PRICE * 10n;
      const fee = (collected * 1000n) / 10000n;

      await expect(coordinator.fulfillRandomWordsWithOverride(requestId, await lottery.getAddress(), [5n]))
        .to.emit(lottery, "WinnerPicked")
        .withArgs(1n, bob.address, 5n, collected - fee, fee, requestId);

      const round = await lottery.getRound(1n);
      expect(round.status).to.equal(RoundStatus.Completed);
      expect(round.winner).to.equal(bob.address);
      expect(round.prize).to.equal(collected - fee);
      expect(await lottery.accruedFees()).to.equal(fee);
      expect(await lottery.currentRoundId()).to.equal(2n);
      expect((await lottery.getRound(2n)).status).to.equal(RoundStatus.Open);
    });

    it("tire le gagnant parmi les tickets vendus quel que soit l'aléa", async function () {
      const { lottery, coordinator } = await loadFixture(readyToDrawFixture);
      const requestId = await requestDraw(lottery);
      await coordinator.fulfillRandomWordsWithOverride(requestId, await lottery.getAddress(), [ethers.MaxUint256]);
      const round = await lottery.getRound(1n);
      expect(round.winningTicket).to.equal(ethers.MaxUint256 % 10n);
      expect(round.winner).to.equal(await lottery.ticketOwner(1n, round.winningTicket));
    });

    it("ignore une réponse VRF inconnue sans bloquer le tour", async function () {
      const { lottery, coordinator } = await loadFixture(readyToDrawFixture);
      const requestId = await requestDraw(lottery);
      await lottery.connect((await ethers.getSigners())[1]).cancelRound();
      await coordinator.fulfillRandomWordsWithOverride(requestId, await lottery.getAddress(), [1n]);
      expect((await lottery.getRound(1n)).status).to.equal(RoundStatus.Cancelled);
      expect((await lottery.getRound(1n)).winner).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Versement de la cagnotte", function () {
    async function completedFixture() {
      const context = await loadFixture(readyToDrawFixture);
      const requestId = await requestDraw(context.lottery);
      await context.coordinator.fulfillRandomWordsWithOverride(requestId, await context.lottery.getAddress(), [5n]);
      return context;
    }

    it("verse la cagnotte nette au gagnant qui la réclame", async function () {
      const { lottery, bob } = await loadFixture(completedFixture);
      const prize = (await lottery.getRound(1n)).prize;
      await expect(lottery.connect(bob).claimPrize(1n)).to.changeEtherBalance(ethers, bob, prize);
      expect((await lottery.getRound(1n)).prizeClaimed).to.equal(true);
    });

    it("refuse un second retrait et tout retrait par un autre joueur", async function () {
      const { lottery, alice, bob } = await loadFixture(completedFixture);
      await expect(lottery.connect(alice).claimPrize(1n))
        .to.be.revertedWithCustomError(lottery, "NotWinner")
        .withArgs(alice.address);
      await lottery.connect(bob).claimPrize(1n);
      await expect(lottery.connect(bob).claimPrize(1n)).to.be.revertedWithCustomError(lottery, "PrizeAlreadyClaimed");
    });

    it("refuse un retrait sur un tour non terminé", async function () {
      const { lottery, alice } = await loadFixture(deployLotteryFixture);
      await expect(lottery.connect(alice).claimPrize(1n)).to.be.revertedWithCustomError(lottery, "RoundNotCompleted");
    });

    it("verse la commission de la Mairie uniquement sur l'adresse de trésorerie", async function () {
      const { lottery, admin, treasury, outsider } = await loadFixture(completedFixture);
      const fee = await lottery.accruedFees();
      await expect(lottery.connect(outsider).withdrawFees()).to.be.revertedWithCustomError(
        lottery,
        "AccessControlUnauthorizedAccount",
      );
      await expect(lottery.connect(admin).withdrawFees()).to.changeEtherBalance(ethers, treasury, fee);
      await expect(lottery.connect(admin).withdrawFees()).to.be.revertedWithCustomError(lottery, "NothingToWithdraw");
    });

    it("garde les fonds du gagnant disponibles même quand le contrat est en pause", async function () {
      const { lottery, admin, bob } = await loadFixture(completedFixture);
      await lottery.connect(admin).pause();
      const prize = (await lottery.getRound(1n)).prize;
      await expect(lottery.connect(bob).claimPrize(1n)).to.changeEtherBalance(ethers, bob, prize);
    });
  });

  describe("Annulation et remboursement", function () {
    it("annule un tour expiré sans assez de participants et rembourse chaque mise", async function () {
      const { lottery, alice, outsider } = await loadFixture(deployLotteryFixture);
      await lottery.connect(alice).buyTickets(1, { value: TICKET_PRICE });
      await expect(lottery.connect(outsider).closeExpiredRound()).to.be.revertedWithCustomError(
        lottery,
        "RoundNotCancellable",
      );
      await time.increase(ROUND_DURATION);
      await expect(lottery.connect(outsider).closeExpiredRound()).to.emit(lottery, "RoundCancelled").withArgs(1n, 1n, TICKET_PRICE);

      await expect(lottery.connect(alice).claimRefund(1n)).to.changeEtherBalance(ethers, alice, TICKET_PRICE);
      await expect(lottery.connect(alice).claimRefund(1n)).to.be.revertedWithCustomError(lottery, "NothingToRefund");
      await expect(lottery.connect(outsider).claimRefund(1n)).to.be.revertedWithCustomError(lottery, "NothingToRefund");
      expect(await lottery.currentRoundId()).to.equal(2n);
    });

    it("permet à la Mairie d'annuler un tour en urgence, y compris pendant le tirage", async function () {
      const { lottery, admin, bob, outsider } = await loadFixture(readyToDrawFixture);
      await requestDraw(lottery);
      await expect(lottery.connect(outsider).cancelRound()).to.be.revertedWithCustomError(
        lottery,
        "AccessControlUnauthorizedAccount",
      );
      await expect(lottery.connect(admin).cancelRound()).to.emit(lottery, "RoundCancelled");
      await expect(lottery.connect(bob).claimRefund(1n)).to.changeEtherBalance(ethers, bob, TICKET_PRICE * 5n);
    });

    it("refuse un remboursement sur un tour qui n'est pas annulé", async function () {
      const { lottery, alice } = await loadFixture(readyToDrawFixture);
      await expect(lottery.connect(alice).claimRefund(1n)).to.be.revertedWithCustomError(lottery, "RoundNotCancelled");
    });
  });

  describe("Relance du tirage", function () {
    it("autorise une nouvelle demande VRF après le délai d'attente et ignore l'ancienne réponse", async function () {
      const { lottery, coordinator, admin } = await loadFixture(readyToDrawFixture);
      const firstRequest = await requestDraw(lottery);
      await expect(lottery.connect(admin).retryDraw()).to.be.revertedWithCustomError(lottery, "DrawNotStale");

      await time.increase(DRAW_TIMEOUT);
      await expect(lottery.connect(admin).retryDraw()).to.emit(lottery, "DrawRequested");
      const secondRequest = (await lottery.getRound(1n)).vrfRequestId;
      expect(secondRequest).to.not.equal(firstRequest);

      await coordinator.fulfillRandomWordsWithOverride(firstRequest, await lottery.getAddress(), [1n]);
      expect((await lottery.getRound(1n)).status).to.equal(RoundStatus.Drawing);

      await coordinator.fulfillRandomWordsWithOverride(secondRequest, await lottery.getAddress(), [1n]);
      expect((await lottery.getRound(1n)).status).to.equal(RoundStatus.Completed);
    });
  });

  describe("Cas limites", function () {
    it("refuse une relance du tirage quand aucun tirage n'est en cours", async function () {
      const { lottery, admin } = await loadFixture(deployLotteryFixture);
      await expect(lottery.connect(admin).retryDraw()).to.be.revertedWithCustomError(lottery, "DrawNotReady");
    });

    it("annule le versement si le gagnant refuse les ethers, sans perdre la cagnotte", async function () {
      const { lottery, coordinator, alice } = await loadFixture(deployLotteryFixture);
      const rejecting = await ethers.deployContract("RejectingPlayer", [await lottery.getAddress()]);
      await rejecting.buy(1, { value: TICKET_PRICE });
      await lottery.connect(alice).buyTickets(1, { value: TICKET_PRICE });
      await time.increase(ROUND_DURATION);
      const requestId = await requestDraw(lottery);
      await coordinator.fulfillRandomWordsWithOverride(requestId, await lottery.getAddress(), [0n]);

      await expect(rejecting.claimPrize(1n)).to.be.revertedWithCustomError(lottery, "TransferFailed");
      expect((await lottery.getRound(1n)).prizeClaimed).to.equal(false);
    });

    it("annule le remboursement si le joueur refuse les ethers, sans perdre sa mise", async function () {
      const { lottery, admin } = await loadFixture(deployLotteryFixture);
      const rejecting = await ethers.deployContract("RejectingPlayer", [await lottery.getAddress()]);
      await rejecting.buy(2, { value: TICKET_PRICE * 2n });
      await lottery.connect(admin).cancelRound();
      await expect(rejecting.claimRefund(1n)).to.be.revertedWithCustomError(lottery, "TransferFailed");
      expect(await lottery.contributionOf(1n, await rejecting.getAddress())).to.equal(TICKET_PRICE * 2n);
    });

    it("conserve la commission si la trésorerie refuse les ethers", async function () {
      const { lottery, coordinator, admin } = await loadFixture(readyToDrawFixture);
      const requestId = await requestDraw(lottery);
      await coordinator.fulfillRandomWordsWithOverride(requestId, await lottery.getAddress(), [1n]);
      const rejecting = await ethers.deployContract("RejectingPlayer", [await lottery.getAddress()]);
      await lottery.connect(admin).setTreasury(await rejecting.getAddress());
      const fee = await lottery.accruedFees();
      await expect(lottery.connect(admin).withdrawFees()).to.be.revertedWithCustomError(lottery, "TransferFailed");
      expect(await lottery.accruedFees()).to.equal(fee);
    });

    it("déclare les interfaces standard prises en charge", async function () {
      const { lottery } = await loadFixture(deployLotteryFixture);
      expect(await lottery.supportsInterface("0x7965db0b")).to.equal(true);
      expect(await lottery.supportsInterface("0xffffffff")).to.equal(false);
    });
  });

  describe("Attaques par réentrance", function () {
    it("bloque la réentrance lors du versement de la cagnotte", async function () {
      const { lottery, coordinator, alice } = await loadFixture(deployLotteryFixture);
      const attacker = await ethers.deployContract("ReentrantPlayer", [await lottery.getAddress()]);
      await attacker.buy(1, { value: TICKET_PRICE });
      await lottery.connect(alice).buyTickets(1, { value: TICKET_PRICE });
      await time.increase(ROUND_DURATION);
      const requestId = await requestDraw(lottery);
      await coordinator.fulfillRandomWordsWithOverride(requestId, await lottery.getAddress(), [0n]);
      expect((await lottery.getRound(1n)).winner).to.equal(await attacker.getAddress());

      await attacker.arm(1, 1n);
      const prize = (await lottery.getRound(1n)).prize;
      await expect(attacker.claimPrize(1n)).to.changeEtherBalance(ethers, attacker, prize);
      expect(await attacker.reentryAttempts()).to.equal(1n);
      expect(await attacker.reentrySucceeded()).to.equal(false);
    });

    it("bloque la réentrance lors d'un remboursement", async function () {
      const { lottery, alice } = await loadFixture(deployLotteryFixture);
      const attacker = await ethers.deployContract("ReentrantPlayer", [await lottery.getAddress()]);
      await attacker.buy(1, { value: TICKET_PRICE });
      await time.increase(ROUND_DURATION);
      await lottery.connect(alice).closeExpiredRound();

      await attacker.arm(2, 1n);
      await expect(attacker.claimRefund(1n)).to.changeEtherBalance(ethers, attacker, TICKET_PRICE);
      expect(await attacker.reentrySucceeded()).to.equal(false);
      expect(await ethers.provider.getBalance(await lottery.getAddress())).to.equal(0n);
    });
  });

  describe("Pause d'urgence", function () {
    it("suspend les achats et le tirage, réservée au rôle PAUSER", async function () {
      const { lottery, admin, alice, outsider } = await loadFixture(deployLotteryFixture);
      await expect(lottery.connect(outsider).pause()).to.be.revertedWithCustomError(
        lottery,
        "AccessControlUnauthorizedAccount",
      );
      await lottery.connect(admin).pause();
      await expect(lottery.connect(alice).buyTickets(1, { value: TICKET_PRICE })).to.be.revertedWithCustomError(
        lottery,
        "EnforcedPause",
      );
      await lottery.connect(admin).unpause();
      await expect(lottery.connect(alice).buyTickets(1, { value: TICKET_PRICE })).to.emit(lottery, "TicketsPurchased");
    });
  });

  describe("Administration", function () {
    it("applique une nouvelle configuration au tour suivant seulement", async function () {
      const { lottery, admin, outsider } = await loadFixture(deployLotteryFixture);
      const nextConfig = defaultRoundConfig({ ticketPrice: TICKET_PRICE * 2n });
      await expect(lottery.connect(outsider).setRoundConfig(nextConfig)).to.be.revertedWithCustomError(
        lottery,
        "AccessControlUnauthorizedAccount",
      );
      await expect(lottery.connect(admin).setRoundConfig(nextConfig)).to.emit(lottery, "RoundConfigUpdated");
      expect((await lottery.getRound(1n)).ticketPrice).to.equal(TICKET_PRICE);

      await time.increase(ROUND_DURATION);
      await lottery.closeExpiredRound();
      expect((await lottery.getRound(2n)).ticketPrice).to.equal(TICKET_PRICE * 2n);
    });

    it("change la trésorerie et la configuration VRF, refuse les valeurs invalides", async function () {
      const { lottery, admin, outsider, subscriptionId } = await loadFixture(deployLotteryFixture);
      await expect(lottery.connect(admin).setTreasury(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        lottery,
        "ZeroAddressNotAllowed",
      );
      await expect(lottery.connect(admin).setTreasury(outsider.address)).to.emit(lottery, "TreasuryUpdated");
      expect(await lottery.treasury()).to.equal(outsider.address);

      await expect(lottery.connect(outsider).setVrfConfig(defaultVrfConfig(subscriptionId))).to.be.revertedWithCustomError(
        lottery,
        "AccessControlUnauthorizedAccount",
      );
      await expect(lottery.connect(admin).setVrfConfig(defaultVrfConfig(subscriptionId))).to.emit(lottery, "VrfConfigUpdated");
      await expect(
        lottery.connect(admin).setVrfConfig({ ...defaultVrfConfig(subscriptionId), requestConfirmations: 0 }),
      ).to.be.revertedWithCustomError(lottery, "InvalidConfiguration");
    });
  });

  describe("Chainlink Automation", function () {
    it("signale un tirage à lancer puis l'exécute", async function () {
      const { lottery } = await loadFixture(readyToDrawFixture);
      const [needed] = await lottery.checkUpkeep("0x");
      expect(needed).to.equal(true);
      await expect(lottery.performUpkeep("0x")).to.emit(lottery, "DrawRequested");
      const [neededAfter] = await lottery.checkUpkeep("0x");
      expect(neededAfter).to.equal(false);
    });

    it("signale et clôture un tour expiré sans assez de participants", async function () {
      const { lottery } = await loadFixture(deployLotteryFixture);
      await time.increase(ROUND_DURATION);
      const [needed] = await lottery.checkUpkeep("0x");
      expect(needed).to.equal(true);
      await expect(lottery.performUpkeep("0x")).to.emit(lottery, "RoundCancelled");
    });

    it("ne fait rien quand aucune action n'est nécessaire ou en pause", async function () {
      const { lottery, admin } = await loadFixture(readyToDrawFixture);
      await lottery.connect(admin).pause();
      const [needed] = await lottery.checkUpkeep("0x");
      expect(needed).to.equal(false);
      await expect(lottery.performUpkeep("0x")).to.be.revertedWithCustomError(lottery, "DrawNotReady");
    });
  });
});
