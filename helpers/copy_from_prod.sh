#!/usr/bin/env bash
#
# migrate-prod-to-staging.sh
# Copies data from PROD (read-only) into STAGING.
# PROD is only ever read from. All writes/drops target STAGING.
#
set -Eeuo pipefail

# ── Connection strings come from the environment, never hardcoded ──
# PROD_URL="postgresql://user:pass@prod-host:5432/dbname"
# STAGING_URL="postgresql://user:pass@staging-host:5432/dbname"
: "${PROD_URL:?Set PROD_URL to the prod connection string}"
: "${STAGING_URL:?Set STAGING_URL to the staging connection string}"

DUMP_FILE="prod_dump_$(date +%Y%m%d_%H%M%S).dump"

# ── Hard guard: refuse to run if the two URLs point at the same host+db ──
if [[ "$PROD_URL" == "$STAGING_URL" ]]; then
  echo "ERROR: PROD_URL and STAGING_URL are identical. Aborting." >&2
  exit 1
fi

echo ">> Confirm target STAGING database (this will be OVERWRITTEN):"
echo "   $(echo "$STAGING_URL" | sed -E 's#://[^@]+@#://***@#')"
read -r -p "Type 'yes' to proceed: " CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "Aborted."; exit 1; }

# ── 1. Dump from PROD (read-only) ──
echo ">> Dumping from prod..."
pg_dump "$PROD_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="$DUMP_FILE"

# ── 2. Restore into STAGING (drops & recreates objects in staging only) ──
echo ">> Restoring into staging..."
pg_restore \
  --dbname="$STAGING_URL" \
  --clean --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --verbose \
  "$DUMP_FILE"

echo ">> Done. Dump saved at: $DUMP_FILE"