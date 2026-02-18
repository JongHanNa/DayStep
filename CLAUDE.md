# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 정보

**저장소**: DayStep - 할일 관리 및 템플릿 기반 생산성 앱
**배포**: 웹 (Vercel) + Desktop (Electron) + React Native (iOS/Android)

## 모노레포 구조 (Turborepo + npm Workspaces)

```
DayStep/
  turbo.json
  package.json                 (루트: workspaces 설정)
  apps/
    web/                       (Next.js 웹앱 + Electron 빌드)
    desktop/                   (Electron 메인 프로세스)
    mobile-rn/                 (React Native 앱)
  packages/                    (공유 패키지 - 예정)
```

### 빌드 명령어
- 웹: `cd apps/web && npm run build` 또는 루트 `npm run build:web`
- Electron: `cd apps/web && npm run build:electron`

### React Native 개발 워크플로우 (실기기)

**개발환경** (Debug + 개발 DB):
1. `npm run start:rn` — Metro 번들러 시작 (필수)
2. Xcode에서 DayStepRN scheme 선택 → 실기기 선택 → Cmd+R

**운영환경** (Release + 운영 DB):
1. Metro 불필요 (JS 번들 내장)
2. Xcode에서 DayStepProd scheme 선택 → 실기기 선택 → Cmd+R

| scheme | 빌드 모드 | DB | 앱 이름 | Bundle ID | Metro 필요 |
|--------|----------|------|---------|-----------|-----------|
| DayStepRN | Debug | 개발 | DevDayStep | com.daystep.app.dev | O |
| DayStepProd | Release | 운영 | DayStep | com.daystep.app | X |

### Electron 데스크탑 개발 워크플로우

**개발환경** (개발 DB):
1. `cd apps/web && npm run dev:electron` — Next.js 빌드 + Electron 실행 (DevTools 자동 오픈)
2. 코드 수정 시 Electron 재시작 필요 (HMR 미지원, 정적 빌드 기반)

**프로덕션 빌드**:
1. `cd apps/web && npm run build:electron:prod` — 프로덕션 DB + 패키징
2. 출력: `dist-electron/` (DMG/ZIP for macOS, NSIS for Windows)

| 명령어 | DB | DevTools | 출력 |
|--------|------|---------|------|
| `dev:electron` | 개발 | O | 앱 직접 실행 |
| `build:electron:prod` | 운영 | X | `dist-electron/` 패키지 |

**핵심 구조**:
- `apps/desktop/` — Electron 메인 프로세스 (TypeScript)
- `apps/web/out/` — 빌드된 정적 파일 (app:// 프로토콜로 로드)
- OAuth: 로컬 HTTP 서버 + PKCE 콜백 패턴
- 세션 저장: `electron-store` (key: `supabase_auth_session`)

## 빌드 및 배포

**Materialized View 사용 금지:**
- `inbox_todos`, `inbox_projects`, `inbox_goals` Materialized View 조회 금지
- 캐시된 스냅샷 반환 → DELETE/UPDATE 후 자동 갱신 안됨
- **필수**: `todos`, `projects`, `goals` 테이블 직접 조회 + 클라이언트 필터링
- 스키마 검증: Supabase MCP로 확인

## 환경 설정

**환경 파일 분리** (apps/web/ 디렉터리 내):
- `.env.development` → 개발 DB (DayStep)
- `.env.production` → 프로덕션 DB (DayStep Production)

**BUILD_TARGET**: `web` (기본), `electron`

**Vercel 배포**:
- Vercel 루트 디렉터리: 프로젝트 루트 (vercel.json에서 buildCommand로 apps/web 지정)
- **Production**: main 브랜치 → 프로덕션 DB → `daystep.app`
- **Preview**: develop/feature 브랜치 → 개발 DB → 자동 생성 URL

## MCP 서버

### DayStep MCP 서버 배포

```bash
npx supabase functions deploy mcp-server --project-ref <PROJECT_REF> --no-verify-jwt
```

## 핵심 아키텍처 패턴

### 인증 시스템
- **웹**: Supabase Auth + OAuth (Google, Kakao)
- **Electron**: JWT 방식 (`fetchWithJWT`) + electron-store 백업
- **React Native**: MMKV 네이티브 스토리지 + Supabase Auth

---

## Claude Code 개발 가이드

### 기본 규칙

- **한글로 대답하세요**
- **커밋은 사용자에게 허락 확인 받고 하세요**
- **CLAUDE.md 업데이트 시 핵심만 작성, 예제 코드는 최소화하세요**

### 환경별 절대원칙

**절대 금지**:
- ❌ 한 환경의 빌드 오류로 다른 환경 코드 삭제/수정
- ❌ RN 오류 → 웹 코드 수정 | 웹 오류 → RN 코드 수정

**반응형 우선**: UI 크기/간격/폰트 → Tailwind Responsive (`sm:`, `md:`) 사용, DevTools 테스트 가능
**BUILD_TARGET**: Electron 전용 분기만 사용
