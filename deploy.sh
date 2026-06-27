#!/bin/bash
set -e

REMOTE_HOST="lava"
REMOTE_DIR="/root/msg.client.web"

echo "==> Building project locally..."
rm -rf dist
npm run build

echo "==> Syncing dist/ to server..."
rsync -avz --delete -e ssh dist/ ${REMOTE_HOST}:${REMOTE_DIR}/dist/

echo "==> Fixing nginx proxy_pass..."
ssh ${REMOTE_HOST} "sudo sed -i 's|proxy_pass http://127.0.0.1:8082;|proxy_pass http://127.0.0.1:8082/;|' /etc/nginx/sites-enabled/lavender"

echo "==> Reloading nginx..."
ssh ${REMOTE_HOST} "nginx -t && systemctl reload nginx"

echo "==> Restarting envoy container..."
ssh ${REMOTE_HOST} "
  sudo docker rm -f envoy-grpc-web 2>/dev/null || true
  sudo docker run -d --name envoy-grpc-web --network host \
    -v ${REMOTE_DIR}/envoy.yaml:/etc/envoy/envoy.yaml:ro \
    envoyproxy/envoy:v1.31-latest
  sleep 2
  sudo docker logs envoy-grpc-web --tail 3 2>&1
"

echo "==> Done! https://13.140.25.249/web/"
