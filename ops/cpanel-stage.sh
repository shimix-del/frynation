#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
# Node's default Wasm optimization reserves a 10 GB virtual address cage,
# exceeding this shared hosting account's limit during Prisma generation.
export NODE_OPTIONS="--disable-wasm-trap-handler --max-old-space-size=1024 --v8-pool-size=1"
# esbuild otherwise sizes its Go thread pool to the shared server's CPU count.
export GOMAXPROCS=2
export UV_THREADPOOL_SIZE=2
export TOKIO_WORKER_THREADS=2
export RAYON_NUM_THREADS=2
node -e 'if (Number(process.versions.node.split(".")[0]) !== 22) throw new Error("Node.js 22 is required")'
commit="$(git rev-parse HEAD)"
release_root="/home/mombasam/nanifrys-releases/$commit"
if [ -e "$release_root/READY" ]; then
  echo "Release already staged: $release_root"
  exit 0
fi
# Build from lockfiles. No database seed, push, reset, or data migration runs here.
npm ci --prefix client --include=dev --ignore-scripts
npm ci --prefix server --include=dev --ignore-scripts
npm --prefix server run db:generate
npm --prefix server run build
npm --prefix client run build
node tests/api-production.test.mjs
node tests/checkout-transaction.test.mjs
mkdir -p "$release_root/server" "$release_root/client"
cp -R server/dist server/prisma server/node_modules "$release_root/server/"
cp server/package.json server/package-lock.json "$release_root/server/"
npm prune --prefix "$release_root/server" --omit=dev --omit=peer --ignore-scripts
node -e 'if (typeof require(process.argv[1]).PrismaClient !== "function") process.exit(1)' "$release_root/server/node_modules/@prisma/client"
cp -R client/dist "$release_root/client/"
mkdir -p /home/mombasam/nanifrys-runtime
cp ops/passenger.cjs /home/mombasam/nanifrys-runtime/app.js
# This helper only exports records already on the visitor's own browser.
# Staging does not replace the working POS or change its data source.
cp client/public/backup-local-data.html /home/mombasam/nanifrys/backup-local-data.html
printf '%s\n' "$commit" > "$release_root/READY"
echo "Staged release: $release_root"
echo "Configure the Node app and reconcile browser backups before production cutover."
