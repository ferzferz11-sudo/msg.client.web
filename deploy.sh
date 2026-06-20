#!/bin/bash
set -e

REMOTE_HOST="lava"
REMOTE_DIR="/root/msg.client.web"

echo "==> Building project locally..."
rm -rf dist
npm run build

echo "==> Syncing dist/ to server..."
rsync -avz --delete -e ssh dist/ ${REMOTE_HOST}:${REMOTE_DIR}/dist/

echo "==> Reloading nginx..."
ssh ${REMOTE_HOST} "nginx -t && systemctl reload nginx"

echo "==> Starting envoy container..."
ssh ${REMOTE_HOST} "docker start envoy-grpc-web 2>/dev/null || echo 'envoy container not found, skipping'"

echo "==> Done! https://13.140.25.249/web/"
