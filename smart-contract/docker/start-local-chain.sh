#!/bin/sh
set -eu

npx hardhat node --hostname 0.0.0.0 --port 8545 &
NODE_PID=$!

until node -e "fetch('http://127.0.0.1:8545',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]})}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; do
  sleep 1
done

npx hardhat run scripts/deploy-local.ts --network localhost
touch /tmp/blockchain-ready

npx hardhat run scripts/local-vrf-responder.ts --network localhost &
RESPONDER_PID=$!

trap 'kill "$RESPONDER_PID" "$NODE_PID" 2>/dev/null' INT TERM
wait "$NODE_PID"
