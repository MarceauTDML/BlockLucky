import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

const compiler = {
  version: "0.8.34",
  settings: {
    evmVersion: "prague",
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: compiler,
      production: compiler,
    },
    npmFilesToBuild: ["@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol"],
  },
  networks: {
    localhost: {
      type: "http",
      chainType: "l1",
      url: process.env.LOCAL_RPC_URL ?? "http://127.0.0.1:8545",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
