#!/usr/bin/env bash
set -euo pipefail

REQUIRED_ACCOUNT="${AI_CLINIC_GOOGLE_ACCOUNT:-hadi4us@gmail.com}"
CLASP_USER="${AI_CLINIC_CLASP_USER:-hadi4us}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAS_DIR="$PROJECT_DIR/gas"

if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx not found. Install Node/npm before using clasp." >&2
  exit 2
fi

output="$(cd "$GAS_DIR" && npx clasp -u "$CLASP_USER" show-authorized-user 2>&1 || true)"
echo "$output"

if ! printf '%s\n' "$output" | grep -Fq "You are logged in as $REQUIRED_ACCOUNT."; then
  cat >&2 <<MSG

ERROR: ai-clinic Google-side actions must use $REQUIRED_ACCOUNT.
Do not deploy, push, create versions, or mutate Apps Script/Sheets from another Google account.

Fix:
  cd gas
  npx clasp -u "$CLASP_USER" login
Then authenticate with $REQUIRED_ACCOUNT and rerun this check.
MSG
  exit 1
fi

echo "OK: clasp is authenticated as $REQUIRED_ACCOUNT"
