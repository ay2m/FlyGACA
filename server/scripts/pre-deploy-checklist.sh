#!/bin/bash
# Pre-deployment checklist for the Express backend.
# Run this before attempting to deploy to Cloud Run.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed=0
check_failed=0

function pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((check_passed++))
}

function fail() {
  echo -e "${RED}✗${NC} $1"
  ((check_failed++))
}

function warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

echo "=== Fly GACA Express Backend Pre-Deployment Checklist ==="
echo ""

# Check 1: Node.js version
echo "1. Node.js version..."
if command -v node &> /dev/null; then
  node_version=$(node -v)
  if node -e "const v = parseInt(process.version.split('.')[0].slice(1)); process.exit(v >= 18 ? 0 : 1)"; then
    pass "Node.js $node_version (18+ required)"
  else
    fail "Node.js $node_version (need 18+)"
  fi
else
  fail "Node.js not found"
fi

# Check 2: Dependencies installed
echo ""
echo "2. Dependencies..."
if [ -d "node_modules" ]; then
  pass "node_modules exists"
else
  fail "node_modules not found — run 'npm ci' first"
fi

# Check 3: Build succeeds
echo ""
echo "3. TypeScript build..."
if npm run build >/dev/null 2>&1; then
  pass "TypeScript builds successfully"
else
  fail "TypeScript build failed"
fi

# Check 4: Linting passes
echo ""
echo "4. Code quality (ESLint)..."
if npm run lint >/dev/null 2>&1; then
  pass "ESLint passes"
else
  warn "ESLint has issues (fix before deploying)"
fi

# Check 5: Environment variables
echo ""
echo "5. Environment variables..."
if [ -n "$DATABASE_URL" ]; then
  pass "DATABASE_URL is set"
else
  fail "DATABASE_URL is not set"
fi

if [ -n "$SESSION_SECRET" ]; then
  session_len=${#SESSION_SECRET}
  if [ $session_len -ge 32 ]; then
    pass "SESSION_SECRET is set (length: $session_len)"
  else
    fail "SESSION_SECRET is too short (need 32+, have $session_len)"
  fi
else
  fail "SESSION_SECRET is not set"
fi

# Check 6: Database connectivity
echo ""
echo "6. Database connectivity..."
if command -v psql &> /dev/null; then
  if psql "$DATABASE_URL" -c "SELECT version();" >/dev/null 2>&1; then
    pass "PostgreSQL connection successful"
  else
    fail "PostgreSQL connection failed"
  fi
else
  warn "psql not found — cannot test database connection"
fi

# Check 7: Database schema (if DB is accessible)
echo ""
echo "7. Database schema..."
if command -v psql &> /dev/null; then
  if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='users';" >/dev/null 2>&1; then
    pass "users table exists"
  else
    warn "users table not found — run migrations after deploy"
  fi
else
  warn "Cannot check database schema (psql not available)"
fi

# Check 8: Docker (if planning to deploy)
echo ""
echo "8. Docker setup..."
if command -v docker &> /dev/null; then
  pass "docker is installed"

  # Check if Dockerfile exists
  if [ -f "Dockerfile" ]; then
    pass "Dockerfile exists"
  else
    fail "Dockerfile not found in server/"
  fi
else
  warn "docker not found (required for Cloud Run deployment)"
fi

# Check 9: gcloud CLI
echo ""
echo "9. Google Cloud setup..."
if command -v gcloud &> /dev/null; then
  pass "gcloud CLI is installed"

  # Check if project is set
  project=$(gcloud config get-value project 2>/dev/null)
  if [ -n "$project" ] && [ "$project" != "(unset)" ]; then
    pass "Active gcloud project: $project"
  else
    fail "No active gcloud project (run 'gcloud config set project PROJECT_ID')"
  fi
else
  warn "gcloud CLI not found (required for Cloud Run deployment)"
fi

# Check 10: OAuth credentials
echo ""
echo "10. OAuth credentials..."
if [ -n "$GOOGLE_OAUTH_CLIENT_ID" ]; then
  pass "GOOGLE_OAUTH_CLIENT_ID is set"
else
  warn "GOOGLE_OAUTH_CLIENT_ID not set (Google Sign-in will not work)"
fi

if [ -n "$GOOGLE_OAUTH_CLIENT_SECRET" ]; then
  pass "GOOGLE_OAUTH_CLIENT_SECRET is set"
else
  warn "GOOGLE_OAUTH_CLIENT_SECRET not set"
fi

if [ -n "$APPLE_OAUTH_CLIENT_ID" ]; then
  pass "APPLE_OAUTH_CLIENT_ID is set"
else
  warn "APPLE_OAUTH_CLIENT_ID not set (Apple Sign-in will not work)"
fi

# Check 11: Payment credentials
echo ""
echo "11. Payment provider (Moyasar)..."
if [ -n "$MOYASAR_SECRET_KEY" ]; then
  pass "MOYASAR_SECRET_KEY is set"
else
  warn "MOYASAR_SECRET_KEY not set (payments will not work)"
fi

if [ -n "$MOYASAR_WEBHOOK_SECRET" ]; then
  pass "MOYASAR_WEBHOOK_SECRET is set"
else
  warn "MOYASAR_WEBHOOK_SECRET not set (webhooks will fail)"
fi

# Check 12: Email service
echo ""
echo "12. Email service..."
if [ -n "$MAIL_API_KEY" ]; then
  pass "MAIL_API_KEY is set"
else
  warn "MAIL_API_KEY not set (emails will be logged only)"
fi

# Check 13: Model provider
echo ""
echo "13. Model provider (Captain Adel)..."
if [ -n "$MODEL_BASE_URL" ]; then
  pass "MODEL_BASE_URL is set"
else
  warn "MODEL_BASE_URL not set (Captain Adel will be disabled)"
fi

if [ -n "$MODEL_API_KEY" ]; then
  pass "MODEL_API_KEY is set"
else
  warn "MODEL_API_KEY not set (Captain Adel will not work)"
fi

# Check 14: Cron secret (for renewal job)
echo ""
echo "14. Cron secret (renewal job)..."
if [ -n "$CRON_SECRET" ]; then
  cron_len=${#CRON_SECRET}
  if [ $cron_len -ge 32 ]; then
    pass "CRON_SECRET is set (length: $cron_len)"
  else
    warn "CRON_SECRET is too short (should be 32+)"
  fi
else
  warn "CRON_SECRET not set (Cloud Scheduler renewal job will fail)"
fi

# Summary
echo ""
echo "=== Summary ==="
echo -e "Passed: ${GREEN}$check_passed${NC}"
echo -e "Failed: ${RED}$check_failed${NC}"
echo "Warnings: $(($check_failed + $(grep -c "⚠" <<< "$(history)" 2>/dev/null || echo 0)))"

if [ $check_failed -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Ready to deploy!${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}✗ Please fix the failures above before deploying.${NC}"
  exit 1
fi
