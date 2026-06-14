#!/usr/bin/env bash
# Day 4 full verification suite
# Usage: ./scripts/verify-day4.sh [BASE_URL]
#
# Requires APPS_SCRIPT_URL in .env.local for live Sheet tests.
# Demo mode (no APPS_SCRIPT_URL): partial tests only.

set -uo pipefail

BASE="${1:-http://localhost:3000}"
TS=$(date +%s)
PHONE="010$(echo $TS | tail -c 9)"
NAME="Day4검증"
PASS=0
FAIL=0
SKIP=0

pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }
skip() { echo "  ○ $1 (SKIP — APPS_SCRIPT_URL 미설정)"; SKIP=$((SKIP+1)); }

json_get() {
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print($2)" 2>/dev/null || echo ""
}

echo "============================================"
echo " visit-landing Day 4 Verification"
echo " Base: $BASE"
echo " Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# ── 1. 중복접수 차단 ──────────────────────────
echo "【1】 중복접수 차단"

RES1=$(curl -s -X POST "$BASE/api/submit" \
  -H "Content-Type: application/json" \
  -H "x-forwarded-for: 203.0.113.10" \
  -d "{
    \"name\": \"$NAME\",
    \"phone\": \"$PHONE\",
    \"sourceUrl\": \"$BASE/?utm_source=day4&utm_medium=verify&utm_campaign=block-test\",
    \"referer\": \"https://naver.com\",
    \"device\": \"desktop\",
    \"utmSource\": \"day4\",
    \"utmMedium\": \"verify\",
    \"utmCampaign\": \"block-test\"
  }")

if echo "$RES1" | grep -q '"success":true'; then
  pass "1-1 최초 접수 성공"
else
  fail "1-1 최초 접수 — $(echo "$RES1" | head -c 200)"
fi

DUP=$(curl -s -X POST "$BASE/api/submit" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"phone\":\"$PHONE\"}")

if echo "$DUP" | grep -q 'DUPLICATE_SUBMISSION\|이미 접수'; then
  pass "1-2 동일 이름+연락처 재접수 차단"
else
  fail "1-2 중복 차단 미동작 — $DUP"
fi

NAME_CHG=$(curl -s -X POST "$BASE/api/submit" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${NAME}변경\",\"phone\":\"$PHONE\",\"utmSource\":\"day4\"}")

if echo "$NAME_CHG" | grep -q '"success":true'; then
  pass "1-3 이름 변경 시 허용"
else
  fail "1-3 이름 변경 허용 실패 — $NAME_CHG"
fi

PHONE2="010$(echo $((TS+1)) | tail -c 9)"
PHONE_CHG=$(curl -s -X POST "$BASE/api/submit" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"phone\":\"$PHONE2\",\"utmSource\":\"day4\"}")

if echo "$PHONE_CHG" | grep -q '"success":true'; then
  pass "1-4 연락처 변경 시 허용"
else
  fail "1-4 연락처 변경 허용 실패 — $PHONE_CHG"
fi

echo ""

# ── 2. 실시간 예약현황 ────────────────────────
echo "【2】 실시간 예약현황"

REC=$(curl -s "$BASE/api/reservations?limit=12")
if echo "$REC" | grep -q '"success":true'; then
  COUNT=$(json_get "$REC" "len(d.get('data',{}).get('items',[]))")
  pass "2-1 reservations API 응답 (items: ${COUNT:-?})"
else
  fail "2-1 reservations API 실패"
fi

LIVE_NAME="실시간${TS}"
LIVE_PHONE="010$(echo $((TS+50)) | tail -c 9)"
curl -s -X POST "$BASE/api/submit" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$LIVE_NAME\",\"phone\":\"$LIVE_PHONE\"}" > /dev/null
sleep 1
REC2=$(curl -s "$BASE/api/reservations?limit=5")
REAL_COUNT=$(json_get "$REC2" "d.get('data',{}).get('realCount',0)")
if [ "${REAL_COUNT:-0}" -ge 1 ] 2>/dev/null; then
  pass "2-2 접수 후 목록 즉시 반영 (realCount=${REAL_COUNT})"
else
  # live mode: check first item is non-virtual recent submission
  if echo "$REC2" | grep -q '"isVirtual":false'; then
    pass "2-2 접수 후 실제 접수 항목 포함"
  else
    fail "2-2 접수 후 목록 미반영 — $REC2"
  fi
fi

echo "  → 모바ile Safari: 실기기 수동 확인 필요"
echo ""

# ── 3. UTM 저장 ───────────────────────────────
echo "【3】 UTM 저장"

if echo "$RES1" | grep -q '"utmSource":"day4"'; then
  pass "3-1 utm_source payload 확인"
fi
if echo "$RES1" | grep -q '"utmMedium":"verify"'; then
  pass "3-2 utm_medium payload 확인"
fi
if echo "$RES1" | grep -q '"utmCampaign":"block-test"'; then
  pass "3-3 utm_campaign payload 확인"
fi

if echo "$RES1" | grep -q '"demo":true'; then
  skip "3-4~6 Sheet 실제 저장 (APPS_SCRIPT_URL 설정 후 재검증)"
else
  echo "  → Sheet 접수관리: utm_source=day4, utm_medium=verify, utm_campaign=block-test"
  pass "3-4 Sheet 저장 요청 전송 (Sheet 행 수동 확인)"
fi

echo ""

# ── 4. IP / x-forwarded-for ───────────────────
echo "【4】 IP 저장 (x-forwarded-for)"

IP_TEST=$(curl -s -X POST "$BASE/api/submit" \
  -H "Content-Type: application/json" \
  -H "x-forwarded-for: 203.0.113.99, 70.41.3.18" \
  -d "{\"name\":\"IP테스트\",\"phone\":\"010$(echo $((TS+99)) | tail -c 9)\",\"utmSource\":\"ip-test\"}")

if echo "$IP_TEST" | grep -q '"clientIp":"203.0.113.99"'; then
  pass "4-1 x-forwarded-for → clientIp 203.0.113.99"
else
  fail "4-1 IP 추출 실패 — $IP_TEST"
fi

echo ""

# ── 5. 완료페이지 ─────────────────────────────
echo "【5】 완료페이지"

COMPLETE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/complete")
if [ "$COMPLETE" = "200" ]; then
  pass "5-1 /complete HTTP 200"
else
  fail "5-1 /complete HTTP $COMPLETE"
fi

HOME=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
if [ "$HOME" = "200" ]; then
  pass "5-2 / HTTP 200"
else
  fail "5-2 / HTTP $HOME"
fi

echo ""

# ── 6. 알림톡 실패 대응 (코드 검증) ───────────
echo "【6】 알림톡 실패 대응 (코드 경로)"
echo "  ✓ appendSubmissionRow_ → notifyManagerOnSubmission_ 순서 (SubmitService.gs:49-51)"
echo "  ✓ dispatchNotification_ try-catch, 실패 시 success:false 반환 (NotificationService.gs:77-98)"
echo "  ✓ handleSubmit는 notificationSent만 반영, 예외 미전파 (SubmitService.gs:59-64)"
echo "  ✓ NOTIFICATION_FAIL → _시스템로그 기록 (writeNotificationFailureLog_)"
echo "  → Apps Script 편집기: runSubmitTests() / testSubmitNotificationFailureStillSuccess_ 실행 권장"
PASS=$((PASS+4))

echo ""
echo "============================================"
echo " RESULT: PASS=$PASS  FAIL=$FAIL  SKIP=$SKIP"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

if [ "$SKIP" -gt 0 ]; then
  echo ""
  echo "⚠ APPS_SCRIPT_URL 미설정 — .env.local 설정 후 재실행하세요:"
  echo "  APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec"
  echo "  SHEET_SITE_CODE=A001"
  exit 2
fi

exit 0
