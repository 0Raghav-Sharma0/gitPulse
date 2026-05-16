#!/usr/bin/env bash
# Run once locally after adding Neon URLs to .env.local (or export them):
#   DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"
#   DIRECT_URL="postgresql://.../neondb?sslmode=require"
#   ./scripts/vercel-neon-setup.sh

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" || -z "${DIRECT_URL:-}" ]]; then
  echo "Set DATABASE_URL (pooled) and DIRECT_URL (direct) first."
  exit 1
fi

echo "Running Prisma migrations against Neon..."
npx prisma migrate deploy

echo "Done. Redeploy Vercel after env vars are saved."
