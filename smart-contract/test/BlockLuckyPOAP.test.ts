import { expect } from "chai";
import { deployPoapFixture, ethers, networkHelpers } from "./fixtures.js";

const { loadFixture } = networkHelpers;

describe("BlockLuckyPOAP", function () {
  it("délivre un badge par participant et par tour", async function () {
    const { poap, admin, alice } = await loadFixture(deployPoapFixture);
    await expect(poap.connect(admin).mintBadge(alice.address, 1n))
      .to.emit(poap, "BadgeMinted")
      .withArgs(1n, 1n, alice.address);
    expect(await poap.ownerOf(1n)).to.equal(alice.address);
    expect(await poap.badgeOf(1n, alice.address)).to.equal(1n);
    expect(await poap.tokenURI(1n)).to.equal("https://poap.etherbay.fr/rounds/1.json");

    await expect(poap.connect(admin).mintBadge(alice.address, 1n))
      .to.be.revertedWithCustomError(poap, "BadgeAlreadyMinted")
      .withArgs(1n, alice.address);
    await poap.connect(admin).mintBadge(alice.address, 2n);
    expect(await poap.balanceOf(alice.address)).to.equal(2n);
  });

  it("réserve la création de badges au rôle MINTER", async function () {
    const { poap, alice, outsider } = await loadFixture(deployPoapFixture);
    await expect(poap.connect(outsider).mintBadge(alice.address, 1n)).to.be.revertedWithCustomError(
      poap,
      "AccessControlUnauthorizedAccount",
    );
  });

  it("rend les badges non transférables", async function () {
    const { poap, admin, alice, bob } = await loadFixture(deployPoapFixture);
    await poap.connect(admin).mintBadge(alice.address, 1n);
    await expect(poap.connect(alice).transferFrom(alice.address, bob.address, 1n))
      .to.be.revertedWithCustomError(poap, "SoulboundToken")
      .withArgs(1n);
  });

  it("refuse l'adresse nulle et un badge inexistant", async function () {
    const { poap, admin } = await loadFixture(deployPoapFixture);
    const factory = await ethers.getContractFactory("BlockLuckyPOAP");
    await expect(factory.deploy(ethers.ZeroAddress, "ipfs://x/")).to.be.revertedWithCustomError(
      factory,
      "ZeroAddressNotAllowed",
    );
    await expect(poap.connect(admin).mintBadge("0x0000000000000000000000000000000000000000", 1n)).to.be.revertedWithCustomError(
      poap,
      "ZeroAddressNotAllowed",
    );
    await expect(poap.tokenURI(99n)).to.be.revertedWithCustomError(poap, "ERC721NonexistentToken");
  });

  it("permet à la Mairie de changer l'adresse des métadonnées", async function () {
    const { poap, admin, alice, outsider } = await loadFixture(deployPoapFixture);
    await poap.connect(admin).mintBadge(alice.address, 3n);
    await expect(poap.connect(outsider).setBaseUri("ipfs://autre/")).to.be.revertedWithCustomError(
      poap,
      "AccessControlUnauthorizedAccount",
    );
    await expect(poap.connect(admin).setBaseUri("ipfs://badges/")).to.emit(poap, "BaseUriUpdated");
    expect(await poap.tokenURI(1n)).to.equal("ipfs://badges/3.json");
    expect(await poap.supportsInterface("0x80ac58cd")).to.equal(true);
  });
});
