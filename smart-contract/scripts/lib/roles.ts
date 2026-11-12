import { ZeroAddress, getAddress, id, isAddress, type BaseContract, type ContractTransactionResponse } from "ethers";

export const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const OPERATOR_ROLE = id("OPERATOR_ROLE");
export const PAUSER_ROLE = id("PAUSER_ROLE");
export const MINTER_ROLE = id("MINTER_ROLE");

export interface RoleInput {
  deployer: string;
  admin?: string;
  treasury?: string;
  operator?: string;
  pauser?: string;
  vrfOwner?: string;
  allowSharedRoles?: boolean;
  extraAdmins?: string[];
}

export interface RolePlan {
  deployer: string;
  admin: string;
  treasury: string;
  operator: string;
  pauser: string;
  vrfOwner: string;
  allowSharedRoles: boolean;
  extraAdmins: string[];
}

export interface RoleHolders {
  lottery: {
    admin: boolean;
    operator: boolean;
    pauser: boolean;
    treasury: string;
    vrfOwner: string;
    deployerAdmin: boolean;
    deployerOperator: boolean;
    deployerPauser: boolean;
  };
  poap: {
    admin: boolean;
    minter: boolean;
    deployerAdmin: boolean;
    deployerMinter: boolean;
  };
}

const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

const requiredAddress = (label: string, value: string | undefined): string => {
  if (!value || !value.trim()) throw new Error(`Adresse ${label} manquante`);
  if (!isAddress(value.trim())) throw new Error(`Adresse ${label} invalide : ${value}`);
  const address = getAddress(value.trim());
  if (address === ZeroAddress) throw new Error(`Adresse ${label} nulle refusée`);
  return address;
};

const optionalAddress = (label: string, value: string | undefined, fallback: string): string =>
  value && value.trim() ? requiredAddress(label, value) : fallback;

export const planRoles = (input: RoleInput): RolePlan => {
  const deployer = requiredAddress("du déployeur", input.deployer);
  const admin = requiredAddress("MAIRIE_ADMIN_ADDRESS", input.admin);
  const treasury = requiredAddress("MAIRIE_TREASURY_ADDRESS", input.treasury);
  const operator = requiredAddress("OPERATOR_ADDRESS", input.operator);
  const pauser = optionalAddress("PAUSER_ADDRESS", input.pauser, operator);
  const vrfOwner = optionalAddress("VRF_OWNER_ADDRESS", input.vrfOwner, admin);
  const allowSharedRoles = input.allowSharedRoles ?? false;
  const extraAdmins = (input.extraAdmins ?? [])
    .map((value) => requiredAddress("administrateur additionnel", value))
    .filter((value, index, list) => !same(value, admin) && list.findIndex((other) => same(other, value)) === index);

  if (!allowSharedRoles) {
    if (same(admin, operator)) {
      throw new Error("L'administrateur et l'opérateur doivent être distincts (ALLOW_SHARED_ROLES=true pour forcer)");
    }
    if (extraAdmins.some((value) => same(value, operator))) {
      throw new Error("L'opérateur ne peut pas être administrateur (ALLOW_SHARED_ROLES=true pour forcer)");
    }
  }

  return { deployer, admin, treasury, operator, pauser, vrfOwner, allowSharedRoles, extraAdmins };
};

export const roleInputFromEnv = (deployer: string, env: NodeJS.ProcessEnv = process.env): RoleInput => ({
  deployer,
  admin: env.MAIRIE_ADMIN_ADDRESS,
  treasury: env.MAIRIE_TREASURY_ADDRESS,
  operator: env.OPERATOR_ADDRESS,
  pauser: env.PAUSER_ADDRESS,
  vrfOwner: env.VRF_OWNER_ADDRESS,
  allowSharedRoles: env.ALLOW_SHARED_ROLES === "true",
});

export const deployerKeepsAdmin = (plan: RolePlan): boolean =>
  same(plan.deployer, plan.admin) || plan.extraAdmins.some((value) => same(value, plan.deployer));

type Sender = (...args: unknown[]) => Promise<ContractTransactionResponse>;
type Reader = (...args: unknown[]) => Promise<unknown>;

const send = async (contract: BaseContract, name: string, ...args: unknown[]): Promise<void> => {
  const tx = await (contract.getFunction(name) as unknown as Sender)(...args);
  await tx.wait();
};

const read = async <T>(contract: BaseContract, name: string, ...args: unknown[]): Promise<T> =>
  (await (contract.getFunction(name) as unknown as Reader)(...args)) as T;

const hasRole = (contract: BaseContract, role: string, account: string): Promise<boolean> =>
  read<boolean>(contract, "hasRole", role, account);

export interface ApplyRolesResult {
  actions: string[];
  vrfOwnershipPending: boolean;
  deployerRenouncedAdmin: boolean;
}

export const applyRoles = async (
  contracts: { lottery: BaseContract; poap: BaseContract },
  plan: RolePlan,
  log: (message: string) => void = () => undefined,
): Promise<ApplyRolesResult> => {
  const { lottery, poap } = contracts;
  const actions: string[] = [];
  const record = (message: string) => {
    actions.push(message);
    log(message);
  };

  const grant = async (contract: BaseContract, label: string, role: string, roleName: string, account: string) => {
    if (await hasRole(contract, role, account)) return;
    await send(contract, "grantRole", role, account);
    record(`${label} : ${roleName} accordé à ${account}`);
  };

  const revoke = async (contract: BaseContract, label: string, role: string, roleName: string, account: string) => {
    if (!(await hasRole(contract, role, account))) return;
    await send(contract, "revokeRole", role, account);
    record(`${label} : ${roleName} retiré à ${account}`);
  };

  const admins = [plan.admin, ...plan.extraAdmins];
  for (const account of admins) {
    await grant(lottery, "BlockLucky", DEFAULT_ADMIN_ROLE, "DEFAULT_ADMIN_ROLE", account);
    await grant(poap, "BlockLuckyPOAP", DEFAULT_ADMIN_ROLE, "DEFAULT_ADMIN_ROLE", account);
  }
  await grant(lottery, "BlockLucky", OPERATOR_ROLE, "OPERATOR_ROLE", plan.operator);
  await grant(lottery, "BlockLucky", PAUSER_ROLE, "PAUSER_ROLE", plan.pauser);
  await grant(poap, "BlockLuckyPOAP", MINTER_ROLE, "MINTER_ROLE", plan.operator);

  const currentTreasury = await read<string>(lottery, "treasury");
  if (!same(currentTreasury, plan.treasury)) {
    await send(lottery, "setTreasury", plan.treasury);
    record(`BlockLucky : trésorerie positionnée sur ${plan.treasury}`);
  }

  if (!same(plan.deployer, plan.operator)) {
    await revoke(lottery, "BlockLucky", OPERATOR_ROLE, "OPERATOR_ROLE", plan.deployer);
    await revoke(poap, "BlockLuckyPOAP", MINTER_ROLE, "MINTER_ROLE", plan.deployer);
  }
  if (!same(plan.deployer, plan.pauser)) {
    await revoke(lottery, "BlockLucky", PAUSER_ROLE, "PAUSER_ROLE", plan.deployer);
  }

  let vrfOwnershipPending = false;
  const currentOwner = await read<string>(lottery, "owner");
  if (!same(currentOwner, plan.vrfOwner)) {
    await send(lottery, "transferOwnership", plan.vrfOwner);
    vrfOwnershipPending = true;
    record(`BlockLucky : propriété VRF proposée à ${plan.vrfOwner} (acceptOwnership requis)`);
  }

  let deployerRenouncedAdmin = false;
  if (!deployerKeepsAdmin(plan)) {
    for (const [label, contract] of [["BlockLucky", lottery], ["BlockLuckyPOAP", poap]] as const) {
      if (await hasRole(contract, DEFAULT_ADMIN_ROLE, plan.deployer)) {
        await send(contract, "renounceRole", DEFAULT_ADMIN_ROLE, plan.deployer);
        record(`${label} : DEFAULT_ADMIN_ROLE renoncé par le déployeur ${plan.deployer}`);
      }
    }
    deployerRenouncedAdmin = true;
  }

  return { actions, vrfOwnershipPending, deployerRenouncedAdmin };
};

export const readRoleHolders = async (
  contracts: { lottery: BaseContract; poap: BaseContract },
  plan: RolePlan,
): Promise<RoleHolders> => {
  const { lottery, poap } = contracts;
  return {
    lottery: {
      admin: await hasRole(lottery, DEFAULT_ADMIN_ROLE, plan.admin),
      operator: await hasRole(lottery, OPERATOR_ROLE, plan.operator),
      pauser: await hasRole(lottery, PAUSER_ROLE, plan.pauser),
      treasury: await read<string>(lottery, "treasury"),
      vrfOwner: await read<string>(lottery, "owner"),
      deployerAdmin: await hasRole(lottery, DEFAULT_ADMIN_ROLE, plan.deployer),
      deployerOperator: await hasRole(lottery, OPERATOR_ROLE, plan.deployer),
      deployerPauser: await hasRole(lottery, PAUSER_ROLE, plan.deployer),
    },
    poap: {
      admin: await hasRole(poap, DEFAULT_ADMIN_ROLE, plan.admin),
      minter: await hasRole(poap, MINTER_ROLE, plan.operator),
      deployerAdmin: await hasRole(poap, DEFAULT_ADMIN_ROLE, plan.deployer),
      deployerMinter: await hasRole(poap, MINTER_ROLE, plan.deployer),
    },
  };
};

export const roleProblems = (holders: RoleHolders, plan: RolePlan, options: { vrfOwnershipAccepted: boolean }): string[] => {
  const problems: string[] = [];
  if (!holders.lottery.admin) problems.push("BlockLucky : l'administrateur n'a pas DEFAULT_ADMIN_ROLE");
  if (!holders.poap.admin) problems.push("BlockLuckyPOAP : l'administrateur n'a pas DEFAULT_ADMIN_ROLE");
  if (!holders.lottery.operator) problems.push("BlockLucky : l'opérateur n'a pas OPERATOR_ROLE");
  if (!holders.lottery.pauser) problems.push("BlockLucky : le pauser n'a pas PAUSER_ROLE");
  if (!holders.poap.minter) problems.push("BlockLuckyPOAP : l'opérateur n'a pas MINTER_ROLE");
  if (!same(holders.lottery.treasury, plan.treasury)) problems.push("BlockLucky : trésorerie inattendue");
  if (options.vrfOwnershipAccepted && !same(holders.lottery.vrfOwner, plan.vrfOwner)) {
    problems.push("BlockLucky : propriétaire VRF inattendu");
  }
  if (!deployerKeepsAdmin(plan)) {
    if (holders.lottery.deployerAdmin) problems.push("BlockLucky : le déployeur a conservé DEFAULT_ADMIN_ROLE");
    if (holders.poap.deployerAdmin) problems.push("BlockLuckyPOAP : le déployeur a conservé DEFAULT_ADMIN_ROLE");
  }
  if (!same(plan.deployer, plan.operator)) {
    if (holders.lottery.deployerOperator) problems.push("BlockLucky : le déployeur a conservé OPERATOR_ROLE");
    if (holders.poap.deployerMinter) problems.push("BlockLuckyPOAP : le déployeur a conservé MINTER_ROLE");
  }
  if (!same(plan.deployer, plan.pauser) && holders.lottery.deployerPauser) {
    problems.push("BlockLucky : le déployeur a conservé PAUSER_ROLE");
  }
  return problems;
};

export const roleSummaryRows = (plan: RolePlan, contracts: { lottery: string; poap: string }) => [
  { rôle: "DEFAULT_ADMIN_ROLE", contrat: "BlockLucky + BlockLuckyPOAP", titulaire: plan.admin },
  ...plan.extraAdmins.map((account) => ({
    rôle: "DEFAULT_ADMIN_ROLE (additionnel)",
    contrat: "BlockLucky + BlockLuckyPOAP",
    titulaire: account,
  })),
  { rôle: "OPERATOR_ROLE", contrat: "BlockLucky", titulaire: plan.operator },
  { rôle: "PAUSER_ROLE", contrat: "BlockLucky", titulaire: plan.pauser },
  { rôle: "MINTER_ROLE", contrat: "BlockLuckyPOAP", titulaire: plan.operator },
  { rôle: "Trésorerie", contrat: "BlockLucky", titulaire: plan.treasury },
  { rôle: "Propriétaire VRF", contrat: "BlockLucky", titulaire: plan.vrfOwner },
  { rôle: "Déployeur", contrat: "-", titulaire: plan.deployer },
  { rôle: "Adresse", contrat: "BlockLucky", titulaire: contracts.lottery },
  { rôle: "Adresse", contrat: "BlockLuckyPOAP", titulaire: contracts.poap },
];
