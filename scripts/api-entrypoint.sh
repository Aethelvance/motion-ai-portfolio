#!/bin/sh
set -e
mkdir -p /data/uploads /data/threads
chown -R node:node /data/uploads /data/threads
exec su node -c 'cd /app && exec node api/app.mjs'
