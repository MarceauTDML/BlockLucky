ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE}
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false HARDHAT_DISABLE_TELEMETRY=true
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY hardhat.config.ts tsconfig.json ./
COPY contracts ./contracts
COPY scripts ./scripts
COPY docker/start-local-chain.sh ./start-local-chain.sh
RUN npx hardhat build && chmod +x start-local-chain.sh && mkdir -p deployments && chown -R node:node /app
USER node
EXPOSE 8545
HEALTHCHECK --interval=5s --timeout=3s --start-period=60s --retries=20 CMD ["test", "-f", "/tmp/blockchain-ready"]
CMD ["./start-local-chain.sh"]
