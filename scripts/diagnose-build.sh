#!/usr/bin/env bash
# plan 3.4: extracted from Dockerfile.web lines 27-36. Run this on demand
# (or via `make diagnose-build`) when the static build output looks wrong;
# do NOT wire it into the default `docker build` path.
#
# Usage:
#   ./scripts/diagnose-build.sh
#   # or, against a built image:
#   docker run --rm <web-image> /bin/sh -c "$(cat scripts/diagnose-build.sh)"

set -eu

echo "=== pnpm build output ==="
ls -la /app/dist/

echo ""
echo "=== html files ==="
find /app/dist -name "*.html" -type f

echo ""
echo "=== index.html size ==="
if [ -f /app/dist/index.html ]; then
  wc -c /app/dist/index.html
else
  echo "NO index.html"
fi

echo ""
echo "=== end diagnostic ==="
