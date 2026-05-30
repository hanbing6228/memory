#!/usr/bin/env bash
set -euo pipefail

# Free Postgres may need a moment to accept connections on cold start.
attempt=1
max=15
until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max" ]; then
    echo "prisma migrate deploy failed after ${max} attempts"
    exit 1
  fi
  echo "Database not ready (attempt ${attempt}/${max}), retrying in 5s..."
  sleep 5
  attempt=$((attempt + 1))
done

npm run seed
exec npm start
