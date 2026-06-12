#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== ai-clinic local verification =="
echo "repo: $ROOT"

if [ "${SKIP_GOOGLE_ACCOUNT_CHECK:-0}" != "1" ]; then
  echo "-- google account guard --"
  ./scripts/check-google-account.sh
else
  echo "-- google account guard skipped (SKIP_GOOGLE_ACCOUNT_CHECK=1) --"
fi

echo "-- node syntax: gas/src --"
find gas/src -name '*.js' -print0 | sort -z | xargs -0 -n1 node --check

echo "-- node syntax: src + tests --"
find src tests -type f \( -name '*.gs' -o -name '*.js' \) -print0 | sort -z | while IFS= read -r -d '' file; do
  tmp="$(mktemp --suffix=.js)"
  cp "$file" "$tmp"
  node --check "$tmp" >/dev/null || {
    echo "syntax failed: $file" >&2
    node --check "$tmp"
    rm -f "$tmp"
    exit 1
  }
  rm -f "$tmp"
done

echo "-- static safety checks --"
node scripts/verify-static.js

echo "-- whitespace diff check --"
git diff --check

echo "OK: local verification passed"
