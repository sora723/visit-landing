#!/usr/bin/env bash
# Production QA — live submit test (requires APPS_SCRIPT_URL in .env.local)
# Usage: ./scripts/verify-final.sh [BASE_URL] [COUNT]

set -uo pipefail

BASE="${1:-http://localhost:3000}"
COUNT="${2:-5}"
PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "============================================"
echo " visit-landing Final QA (live submit x${COUNT})"
echo " Base: $BASE"
echo "============================================"
echo ""

# Health
HOME_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
COMPLETE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/complete")
[ "$HOME_CODE" = "200" ] && pass "홈 HTTP 200" || fail "홈 HTTP $HOME_CODE"
[ "$COMPLETE_CODE" = "200" ] && pass "완료페이지 HTTP 200" || fail "완료페이지 HTTP $COMPLETE_CODE"

echo ""
echo "【접수 ${COUNT}건】"

for i in $(seq 1 "$COUNT"); do
  TS=$(date +%s)
  PHONE="010$(printf '%08d' $((TS + i)))"
  NAME="최종QA${i}"
  RES=$(curl -s -X POST "$BASE/api/submit" \
    -H "Content-Type: application/json" \
    -H "x-forwarded-for: 203.0.113.$i" \
    -H "Referer: https://search.naver.com/" \
    -d "{
      \"name\": \"$NAME\",
      \"phone\": \"$PHONE\",
      \"sourceUrl\": \"$BASE/?utm_source=final&utm_medium=qa&utm_campaign=test${i}\",
      \"referer\": \"https://search.naver.com/\",
      \"device\": \"mobile\",
      \"utmSource\": \"final\",
      \"utmMedium\": \"qa\",
      \"utmCampaign\": \"test${i}\"
    }")

  if echo "$RES" | grep -q '"success":true'; then
    pass "접수 ${i}/$COUNT — $NAME"
    if echo "$RES" | grep -q '"demo":true'; then
      echo "    ⚠ demo mode — APPS_SCRIPT_URL 미연결, Sheet 저장 안 됨"
    fi
    if echo "$RES" | grep -q '"notificationSent":true'; then
      echo "    → 알림톡 발송 OK"
    elif echo "$RES" | grep -q '"notificationSent":false'; then
      echo "    → 알림톡 미발송 (Solapi 미설정 가능)"
    fi
  else
    fail "접수 ${i}/$COUNT — $(echo "$RES" | head -c 120)"
  fi
  sleep 0.5
done

echo ""
REC=$(curl -s "$BASE/api/reservations?limit=5")
if echo "$REC" | grep -q '"success":true'; then
  pass "실시간 예약현황 API"
else
  fail "실시간 예약현황 API"
fi

echo ""
echo "============================================"
echo " RESULT: PASS=$PASS  FAIL=$FAIL"
echo "============================================"
echo ""
echo "Sheet 수동 확인: utm_source=final, utm_medium=qa, utm_campaign=test*"
echo "                 Referer, Device, IP 컬럼"
echo ""

[ "$FAIL" -eq 0 ] || exit 1
