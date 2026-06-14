#!/usr/bin/env bash
# VisitLanding_Master Sheet 헤더 검증
set -uo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)/sheets/VisitLanding_Master"
PASS=0
FAIL=0

check() {
  local file="$1"
  shift
  local -a required=("$@")
  local header
  header=$(head -1 "$file")
  local missing=()
  for col in "${required[@]}"; do
    if ! echo "$header" | tr ',' '\n' | grep -qx "$col"; then
      missing+=("$col")
    fi
  done
  if [ ${#missing[@]} -eq 0 ]; then
    echo "  ✓ $(basename "$file")"
    PASS=$((PASS+1))
  else
    echo "  ✗ $(basename "$file") — 누락: ${missing[*]}"
    FAIL=$((FAIL+1))
  fi
}

echo "VisitLanding_Master 구조 검증"
echo ""

check "$DIR/현장관리.csv" \
  siteCode siteName submissionSpreadsheetId submissionSpreadsheetName submissionSheetName \
  phone managerName managerPhone notifyPhone \
  popupEnabled liveStatusEnabled virtualReservationEnabled duplicateBlockMinutes isActive

check "$DIR/콘텐츠관리.csv" \
  siteCode heroTitle heroSubTitle benefit1Title benefit1Value \
  benefit2Title benefit2Value benefit3Title benefit3Value ctaText mobileHookText \
  heroImage heroVisualImage overviewData premiumData locationData futureData \
  layoutData communityData floatingTodayReservations floatingActiveConsultations stickyPromoText extendedData

check "$DIR/접수관리.csv" \
  id siteCode createdAt name phone utmSource utmMedium utmCampaign \
  referer device ip status memo

check "$DIR/시스템로그.csv" \
  occurredAt action siteCode provider recipientPhone errorMessage payload message

echo ""
echo "RESULT: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
