# VIDAD Web — PRD v1.1 Next.js 랜딩

방문예약 전환율 극대화를 위한 프리미엄 분양 랜딩페이지.

## 기술스택

- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion
- **Backend**: Google Apps Script
- **DB**: Google Sheet
- **알림**: Solapi 알림톡
- **배포**: Netlify

## 빠른 시작

```bash
cd vidad-platform/web
npm install
npm run dev
```

브라우저: `http://localhost:3000/A001` (데모 모드 자동)

## 환경변수

`.env.local` 생성:

```env
# Apps Script Web App URL (미설정 시 데모 데이터)
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# 강제 데모 모드
# NEXT_PUBLIC_DEMO_MODE=true
```

## 페이지 구성 (PRD v1.1)

1. 팝업 — 세션 1회, 1.5초 후 노출
2. Hero — Ken Burns + 혜택카드 순환 강조
3. 실시간 방문예약 현황 — 모바일 롤링 / PC 카드
4. 방문예약 안내 — 3 STEP
5. 사업개요
6. 프리미엄
7. 입지환경
8. 미래가치
9. 단지배치도
10. 커뮤니티
11. CTA + 접수 폼
12. Footer
13. 모바일 하단 고정바

## Netlify 배포

1. Netlify에 저장소 연결
2. `netlify.toml`이 루트(`vidad-platform/`)에 있음 — Base directory: `web`
3. 환경변수 `NEXT_PUBLIC_API_URL` 설정
4. `@netlify/plugin-nextjs` 자동 적용

## API 연동

| action | 용도 |
|--------|------|
| `site.get` | 현장 데이터 + 관리자 설정 |
| `reservations.recent` | 실시간 예약 현황 |
| `submit` | 방문예약 접수 |

## 관리자 설정 (현장관리 시트)

| 컬럼 | 설명 |
|------|------|
| 팝업사용 | Y/N |
| 실시간예약현황사용 | Y/N |
| 가상예약생성 | Y/N |
| Hero혜택1~3 | Hero 혜택 카드 |
| 모바일후킹문구 | 하단바 문구 |
| CTA제목/부제/버튼문구 | CTA 섹션 |
| 중복접수차단분 | 기본 120 |

## 파일 구조

```
web/
├── src/app/[siteCode]/     # 동적 라우트
├── src/components/landing/ # UI 컴포넌트
├── src/lib/                # API, types, demo
└── netlify.toml            # (상위 vidad-platform/)
```
