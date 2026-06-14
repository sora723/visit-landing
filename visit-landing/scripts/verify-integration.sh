#!/usr/bin/env bash
# Day 3 integration smoke test
# Usage: ./scripts/verify-integration.sh [BASE_URL]
# Example: ./scripts/verify-integration.sh http://localhost:3000

set -euo pipefail

BASE="${1:-http://localhost:3000}"
PHONE="010$(date +%s | tail -c 9)"
NAME="Day3테스트"

echo "=== visit-landing Day 3 Integration Test ==="
echo "Base URL: $BASE"
echo "Test phone: $PHONE"
echo ""

echo "1. Submit via API proxy..."
RES=$(curl -s -X POST "$BASE/api/submit" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$NAME\",
    \"phone\": \"$PHONE\",
    \"sourceUrl\": \"$BASE/?utm_source=verify-script\",
    \"referer\": \"https://google.com\",
    \"device\": \"desktop\",
    \"utmSource\": \"verify-script\",
    \"utmMedium\": \"automated\",
    \"utmCampaign\": \"day3\"
  }")

echo "$RES" | python3 -m json.tool 2>/dev/null || echo "$RES"

if echo "$RES" | grep -q '"success":true'; then
  echo "✓ Submit OK"
else
  echo "✗ Submit FAILED"
  exit 1
fi

echo ""
echo "2. Duplicate block test..."
DUP=$(curl -s -X POST "$BASE/api/submit" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"phone\":\"$PHONE\"}")

if echo "$DUP" | grep -q 'DUPLICATE_SUBMISSION\|이미 접수'; then
  echo "✓ Duplicate block OK"
else
  echo "✗ Duplicate block FAILED (expected rejection)"
  echo "$DUP"
fi

echo ""
echo "3. Reservations recent..."
REC=$(curl -s "$BASE/api/reservations?limit=5")
echo "$REC" | python3 -m json.tool 2>/dev/null || echo "$REC"

if echo "$REC" | grep -q '"success":true'; then
  echo "✓ Reservations OK"
else
  echo "✗ Reservations FAILED"
fi

echo ""
echo "=== Done. Check Google Sheet 접수관리 for row with utm_source=verify-script ==="
