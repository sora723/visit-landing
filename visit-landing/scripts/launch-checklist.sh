#!/usr/bin/env bash
# 운영 연결 최종 검증 (APPS_SCRIPT_URL 필수)
# Usage: ./scripts/launch-checklist.sh [BASE_URL]

set -uo pipefail
BASE="${1:-http://localhost:3000}"

echo "=== 1. 환경변수 ==="
if [ -f .env.local ]; then
  URL=$(grep -E '^APPS_SCRIPT_URL=' .env.local | cut -d= -f2- | tr -d ' "'\''')
  CODE=$(grep -E '^SHEET_SITE_CODE=' .env.local | cut -d= -f2- | tr -d ' "'\''')
  if [ -n "$URL" ] && [ "$URL" != "YOUR_SCRIPT_ID" ]; then
    echo "  ✓ APPS_SCRIPT_URL 설정됨"
    echo "  ✓ SHEET_SITE_CODE=${CODE:-A001}"
  else
    echo "  ✗ APPS_SCRIPT_URL 미설정 — .env.local에 URL 입력 후 npm run build && npm run start"
    exit 2
  fi
else
  echo "  ✗ .env.local 없음"
  exit 2
fi

echo ""
echo "=== 2. 실접수 5건 ==="
./scripts/verify-final.sh "$BASE" 5

echo ""
echo "=== 3. 수동 확인 ==="
echo "  □ Google Sheet 접수관리 — 이름/연락처/UTM/Referer/Device/IP"
echo "  □ Solapi 알림톡 수신 (실패해도 Sheet 행 유지)"
echo "  □ Netlify 운영 URL"
echo "  □ iPhone Safari 5건+ / Android Chrome 5건+"
