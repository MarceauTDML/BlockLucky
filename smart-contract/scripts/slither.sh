#!/bin/sh
set -eu

IMAGE="${SLITHER_IMAGE:-ghcr.io/crytic/slither:0.11.6}"
SOURCE_DIR="$(pwd -W 2>/dev/null || pwd)"
export MSYS_NO_PATHCONV=1

docker run --rm -v "$SOURCE_DIR:/src" -w /src --entrypoint /bin/bash "$IMAGE" -c '
set -e
solc-select install 0.8.34 >/dev/null
solc-select use 0.8.34 >/dev/null
for contract in BlockLucky BlockLuckyPOAP; do
  slither "contracts/$contract.sol" --config-file slither.config.json --triage-database slither.db.json --fail-medium
done
'
