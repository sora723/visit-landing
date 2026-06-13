# VIDAD 분양 홈페이지 플랫폼 — MVP v1.0

## 현재 진행 상태

| 단계 | 상태 |
|------|------|
| 1. Google Sheet 샘플 | ✅ CSV 준비 |
| 2. Apps Script | ✅ 8파일 작성 |
| 3. site.get API | ✅ 완성 |
| NotificationService (Provider 패턴) | ✅ Solapi 기본 |
| submit API | ✅ 완성 |
| **Next.js 랜딩 (PRD v1.1)** | ✅ 완성 |
| admin API | ⬜ 다음 단계 |
| 관리자 프론트 | ⬜ 다음 단계 |
| 랜딩 (정적 Template A) | ✅ v1.0 |

## 빠른 시작

상세 절차: **[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)**

1. `sheets/*.csv` → Google Sheet 4탭 가져오기
2. Drive `VIDAD/assets/A001/` 이미지 업로드 + 공개 권한
3. Apps Script 코드 배포 (clasp 또는 수동)
4. `verifySheetStructure` → `testSiteGet` 실행
5. Web App 배포 후 `?action=site.get&siteCode=A001` 테스트
