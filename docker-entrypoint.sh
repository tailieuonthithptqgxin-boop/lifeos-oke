#!/bin/sh
set -e

echo "==> LifeOS Production Starting <=="

# Deploy database migrations cleanly without data loss
if [ -n "$DATABASE_URL" ]; then
  echo "==> Deploying Prisma migrations..."
  npx prisma migrate deploy || {
    echo "WARNING: prisma migrate deploy encountered an error. Attempting safe status check..."
    npx prisma migrate status || true
  }
fi

echo "==> Launching LifeOS Server on Port ${PORT:-3000}..."
exec "$@"
