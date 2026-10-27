#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
export NODE_OPTIONS="--disable-wasm-trap-handler --max-old-space-size=1024 --v8-pool-size=1"
export GOMAXPROCS=2 UV_THREADPOOL_SIZE=2 TOKIO_WORKER_THREADS=2 RAYON_NUM_THREADS=2
commit="$(git rev-parse HEAD)"
release_root="/home/mombasam/nanifrys-releases/$commit"
npm ci --prefix client --include=dev --ignore-scripts
npm ci --prefix server --include=dev --ignore-scripts
npm --prefix server run db:generate
npm --prefix server run build
npm --prefix client run build
npm test
mkdir -p "$release_root/server" "$release_root/client" /home/mombasam/nanifrys-runtime
cp -R server/dist server/prisma server/node_modules "$release_root/server/"
cp server/package.json server/package-lock.json "$release_root/server/"
cp -R client/dist "$release_root/client/"
# The upgrade script first creates a private backup and never resets business tables.
DOTENV_CONFIG_PATH=/home/mombasam/nanifrys-runtime/.env node ops/upgrade-database.cjs
node ops/update-public-routing.cjs
cp ops/passenger.cjs /home/mombasam/nanifrys-runtime/app.js
printf '%s\n' "$commit" > "$release_root/READY"
# The Passenger application is mounted at /api; Apache serves the website from
# this separate document root. Retain its hosting-managed .htaccess and old
# hashed assets, then publish the new index only after its assets are present.
web_root="/home/mombasam/nanifrys"
if [ -f "$web_root/index.html" ]; then
  cp -p "$web_root/index.html" "$release_root/previous-index.html"
fi
for file in client/dist/*; do
  if [ -d "$file" ]; then
    mkdir -p "$web_root/$(basename "$file")"
    cp -R "$file"/. "$web_root/$(basename "$file")/"
  elif [ -f "$file" ] && [ "$(basename "$file")" != "index.html" ]; then
    cp "$file" "$web_root/"
  fi
done
cp client/dist/index.html "$web_root/index.html.new"
mv "$web_root/index.html.new" "$web_root/index.html"
# Atomic release pointer; retain the previous release for rollback.
if [ -f /home/mombasam/nanifrys-runtime/current-release ]; then
  cp /home/mombasam/nanifrys-runtime/current-release /home/mombasam/nanifrys-runtime/previous-release
fi
printf '%s\n' "$commit" > /home/mombasam/nanifrys-runtime/current-release.new
mv /home/mombasam/nanifrys-runtime/current-release.new /home/mombasam/nanifrys-runtime/current-release
mkdir -p /home/mombasam/nanifrys-runtime/tmp
touch /home/mombasam/nanifrys-runtime/tmp/restart.txt
echo "Activated reviewed release $commit. Verify /api/health and the paired shop before deleting older releases."
