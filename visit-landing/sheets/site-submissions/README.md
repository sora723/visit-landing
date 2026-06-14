# 현장별 독립 Spreadsheet

명명 규칙: **`{siteCode}_접수_{현장명}`** (공백·특수문자 제거)

| siteCode | siteName | Spreadsheet 파일명 |
|----------|----------|-------------------|
| L001 | 더블역세권 | L001_접수_더블역세권 |
| L002 | 원주 한양립스 | L002_접수_원주한양립스 |
| L004 | 엄궁역 트라비스 | L004_접수_엄궁역트라비스하늘채 |

현장관리 컬럼:
- `submissionSpreadsheetId` — Google Spreadsheet ID (Apps Script 조회)
- `submissionSpreadsheetName` — 파일명 (운영자 식별·공유)
- `submissionSheetName` — Spreadsheet 내 탭명 (기본: 접수관리)

## 자동 생성

```javascript
provisionSiteSpreadsheet('L001')
```

```bash
node scripts/create-site.mjs L004 "엄궁역 트라비스" --provision
```

현장 담당자에게 **해당 Spreadsheet 파일만** 공유합니다.
