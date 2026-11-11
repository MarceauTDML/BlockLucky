process.env.BLOCKCHAIN_MODE = 'onchain';
process.env.LOGIN_EMAIL_CODE_REQUIRED = 'false';
process.env.ADMIN_MFA_REQUIRED = 'false';
process.env.LOTTERY_CONTRACT_ADDRESS = process.env.LOTTERY_CONTRACT_ADDRESS ?? '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
process.env.POAP_CONTRACT_ADDRESS = process.env.POAP_CONTRACT_ADDRESS ?? '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
process.env.NODE_ENV = 'development';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'warn';
