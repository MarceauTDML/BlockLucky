import { expect } from "chai";
import { ZeroAddress } from "ethers";
import { serializeConstructorArgs } from "../scripts/lib/deployment.js";
import {
  DEFAULT_ADMIN_ROLE,
  MINTER_ROLE,
  OPERATOR_ROLE,
  PAUSER_ROLE,
  applyRoles,
  planRoles,
  readRoleHolders,
  roleInputFromEnv,
  roleProblems,
} from "../scripts/lib/roles.js";
import { defaultRoundConfig, defaultVrfConfig, ethers, networkHelpers } from "./fixtures.js";

async function deployWithDeployerAsAdminFixture() {
  const [deployer, mairie, treasury, operator, pauser, vrfOwner, outsider] = await ethers.getSigners();
  const coordinator = await ethers.deployContract("VRFCoordinatorV2_5Mock", [
    ethers.parseEther("0.1"),
    1000000000n,
    4000000000000000n,
  ]);
  const lotteryArgs = [
    await coordinator.getAddress(),
    deployer.address,
    treasury.address,
    defaultRoundConfig(),
    defaultVrfConfig(1n),
  ];
  const lottery = await ethers.deployContract("BlockLucky", lotteryArgs);
  const poap = await ethers.deployContract("BlockLuckyPOAP", [deployer.address, "https://poap.etherbay.fr/rounds/"]);
  return { lottery, poap, lotteryArgs, deployer, mairie, treasury, operator, pauser, vrfOwner, outsider };
}

describe("Séparation des rôles au déploiement", function () {
  it("refuse une adresse manquante, invalide ou nulle", async function () {
    const [deployer, mairie, treasury, operator] = await ethers.getSigners();
    const base = { deployer: deployer.address, admin: mairie.address, treasury: treasury.address, operator: operator.address };
    expect(() => planRoles({ ...base, admin: undefined })).to.throw("MAIRIE_ADMIN_ADDRESS");
    expect(() => planRoles({ ...base, treasury: ZeroAddress })).to.throw("nulle");
    expect(() => planRoles({ ...base, operator: "0x1234" })).to.throw("invalide");
    expect(() => planRoles({ ...base, pauser: ZeroAddress })).to.throw("PAUSER_ADDRESS");
  });

  it("refuse un administrateur confondu avec l'opérateur sauf ALLOW_SHARED_ROLES", async function () {
    const [deployer, mairie, treasury] = await ethers.getSigners();
    const input = { deployer: deployer.address, admin: mairie.address, treasury: treasury.address, operator: mairie.address };
    expect(() => planRoles(input)).to.throw("distincts");
    expect(planRoles({ ...input, allowSharedRoles: true }).operator).to.equal(mairie.address);
  });

  it("lit les adresses depuis l'environnement avec les valeurs par défaut prévues", async function () {
    const [deployer, mairie, treasury, operator] = await ethers.getSigners();
    const plan = planRoles(
      roleInputFromEnv(deployer.address, {
        MAIRIE_ADMIN_ADDRESS: mairie.address.toLowerCase(),
        MAIRIE_TREASURY_ADDRESS: treasury.address,
        OPERATOR_ADDRESS: operator.address,
      }),
    );
    expect(plan.admin).to.equal(mairie.address);
    expect(plan.pauser).to.equal(operator.address);
    expect(plan.vrfOwner).to.equal(mairie.address);
    expect(plan.allowSharedRoles).to.equal(false);
  });

  it("transfère les rôles et retire tout pouvoir au déployeur", async function () {
    const { lottery, poap, deployer, mairie, treasury, operator, pauser, vrfOwner, outsider } =
      await networkHelpers.loadFixture(deployWithDeployerAsAdminFixture);
    const plan = planRoles({
      deployer: deployer.address,
      admin: mairie.address,
      treasury: treasury.address,
      operator: operator.address,
      pauser: pauser.address,
      vrfOwner: vrfOwner.address,
    });

    const result = await applyRoles({ lottery, poap }, plan);
    expect(result.deployerRenouncedAdmin).to.equal(true);
    expect(result.vrfOwnershipPending).to.equal(true);

    expect(await lottery.hasRole(DEFAULT_ADMIN_ROLE, mairie.address)).to.equal(true);
    expect(await poap.hasRole(DEFAULT_ADMIN_ROLE, mairie.address)).to.equal(true);
    expect(await lottery.hasRole(OPERATOR_ROLE, operator.address)).to.equal(true);
    expect(await lottery.hasRole(PAUSER_ROLE, pauser.address)).to.equal(true);
    expect(await poap.hasRole(MINTER_ROLE, operator.address)).to.equal(true);
    for (const role of [DEFAULT_ADMIN_ROLE, OPERATOR_ROLE, PAUSER_ROLE]) {
      expect(await lottery.hasRole(role, deployer.address)).to.equal(false);
    }
    expect(await poap.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.equal(false);
    expect(await poap.hasRole(MINTER_ROLE, deployer.address)).to.equal(false);
    expect(await lottery.hasRole(OPERATOR_ROLE, mairie.address)).to.equal(false);
    expect(await lottery.treasury()).to.equal(treasury.address);

    expect(await lottery.owner()).to.equal(deployer.address);
    await expect(lottery.connect(outsider).acceptOwnership()).to.be.revertedWith("Must be proposed owner");
    await lottery.connect(vrfOwner).acceptOwnership();
    expect(await lottery.owner()).to.equal(vrfOwner.address);

    const holders = await readRoleHolders({ lottery, poap }, plan);
    expect(roleProblems(holders, plan, { vrfOwnershipAccepted: true })).to.deep.equal([]);
    await expect(lottery.connect(deployer).setTreasury(deployer.address)).to.be.revertedWithCustomError(
      lottery,
      "AccessControlUnauthorizedAccount",
    );
  });

  it("garde les droits du déployeur quand il est aussi l'opérateur et un administrateur additionnel", async function () {
    const { lottery, poap, deployer, mairie, treasury } = await networkHelpers.loadFixture(deployWithDeployerAsAdminFixture);
    const plan = planRoles({
      deployer: deployer.address,
      admin: mairie.address,
      treasury: treasury.address,
      operator: deployer.address,
      vrfOwner: mairie.address,
      allowSharedRoles: true,
      extraAdmins: [deployer.address],
    });

    const result = await applyRoles({ lottery, poap }, plan);
    expect(result.deployerRenouncedAdmin).to.equal(false);
    expect(await lottery.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.equal(true);
    expect(await lottery.hasRole(OPERATOR_ROLE, deployer.address)).to.equal(true);
    expect(await lottery.hasRole(PAUSER_ROLE, deployer.address)).to.equal(true);
    expect(await poap.hasRole(MINTER_ROLE, deployer.address)).to.equal(true);
    expect(await lottery.hasRole(DEFAULT_ADMIN_ROLE, mairie.address)).to.equal(true);
  });

  it("est idempotent et signale un rôle manquant", async function () {
    const { lottery, poap, deployer, mairie, treasury, operator } =
      await networkHelpers.loadFixture(deployWithDeployerAsAdminFixture);
    const plan = planRoles({
      deployer: deployer.address,
      admin: mairie.address,
      treasury: treasury.address,
      operator: operator.address,
      vrfOwner: deployer.address,
    });
    const first = await applyRoles({ lottery, poap }, plan);
    expect(first.vrfOwnershipPending).to.equal(false);

    await lottery.connect(mairie).revokeRole(OPERATOR_ROLE, operator.address);
    const problems = roleProblems(await readRoleHolders({ lottery, poap }, plan), plan, { vrfOwnershipAccepted: true });
    expect(problems).to.deep.equal(["BlockLucky : l'opérateur n'a pas OPERATOR_ROLE"]);
  });

  it("sérialise des arguments de constructeur réutilisables pour la vérification Etherscan", async function () {
    const { lottery, lotteryArgs } = await networkHelpers.loadFixture(deployWithDeployerAsAdminFixture);
    const serialized = serializeConstructorArgs(lotteryArgs);
    const encoded = lottery.interface.encodeDeploy(serialized);
    expect(lottery.deploymentTransaction()!.data.endsWith(encoded.slice(2))).to.equal(true);
  });
});
