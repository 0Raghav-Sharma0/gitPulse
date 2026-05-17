#!/usr/bin/env bash
# Quick checklist before signing in on production.
set -euo pipefail

APP_URL="${APP_URL:-https://git-pulse-bice.vercel.app}"

echo "== GitPulse production auth checklist =="
echo "Production URL: $APP_URL"
echo ""
echo "1. Vercel → Project → Settings → Environment Variables → Production"
echo "   Required:"
echo "     APP_URL, AUTH_URL, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL = $APP_URL"
echo "     AUTH_GITHUB_ID     = OAuth Client ID (Ov23… or Iv1…, NOT numeric App ID)"
echo "     AUTH_GITHUB_SECRET = OAuth client secret"
echo "     AUTH_SECRET        = openssl rand -base64 32"
echo "     DATABASE_URL       = Neon POOLED URL (host contains -pooler)"
echo "     DIRECT_URL         = Neon DIRECT URL (no -pooler)"
echo "   Remove channel_binding=require from both DB URLs if present."
echo ""
echo "2. GitHub OAuth App → Authorization callback URL:"
echo "     ${APP_URL}/api/auth/callback/github"
echo ""
echo "3. Sign in ONLY at: ${APP_URL}/login"
echo "   (Do not use preview URLs like git-pulse-*-projects.vercel.app)"
echo ""
echo "4. After saving env vars: Vercel → Deployments → Redeploy (Production)"
echo ""
echo "5. Verify (after deploy finishes):"
echo "     curl -s ${APP_URL}/api/health | jq ."
echo "   Expect: status ok, database.ok true, authSecret.ok true"
echo ""

if command -v curl >/dev/null 2>&1; then
  echo "== Live check =="
  if command -v jq >/dev/null 2>&1; then
    curl -fsS "${APP_URL}/api/health" | jq . || echo "Health endpoint not ready (404 = old deploy still live; redeploy needed)"
  else
    curl -fsS "${APP_URL}/api/health" || echo "Health endpoint not ready (404 = redeploy needed)"
  fi
fi
