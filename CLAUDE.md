# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 정보

**저장소**: DayStep - 할일 관리 및 템플릿 기반 생산성 앱
**배포**: 웹 (Vercel) + iOS/Android 네이티브 앱

## 빌드 및 배포

**TestFlight 배포 프로세스**:
1. 빌드 실행: `npm run build:mobile` 또는 `npm run build:mobile:prod`
2. Xcode 열기: `npx cap open ios`
3. Archive 생성: Product → Archive (Any iOS Device 선택)
4. App Store Connect 업로드: Distribute App - 스키마 검증: Supabase MCP로 확인

**Materialized View 사용 금지:**
- `inbox_todos`, `inbox_projects`, `inbox_goals` Materialized View 조회 금지
- 캐시된 스냅샷 반환 → DELETE/UPDATE 후 자동 갱신 안됨
- 새로고침해도 삭제된 데이터가 계속 보이는 문제 발생
- **필수**: `todos`, `projects`, `goals` 테이블 직접 조회 + 클라이언트 필터링
→ Upload
5. TestFlight 설정: App Store Connect에서 테스터 추가

## 환경 설정

**환경 파일 분리**:
- `.env.development` → 개발 DB (DayStep)
- `.env.production` → 프로덕션 DB (DayStep Production)

**Vercel 배포**:
- ⚠️ Vercel은 `.env.production` 파일을 사용하지 않음
- ✅ Vercel Dashboard → Settings → Environment Variables에서 설정
- **Production**: main 브랜치 → 프로덕션 DB → `daystep.vercel.app`
- **Preview**: develop/feature 브랜치 → 개발 DB → 자동 생성 URL
- 📖 상세 가이드: `docs/VERCEL_DEPLOYMENT.md` 참조

## MCP 서버

### DayStep MCP 서버 배포

```bash
npx supabase functions deploy mcp-server --project-ref <PROJECT_REF> --no-verify-jwt
```
⚠️ `--no-verify-jwt` 필수 (공개 OAuth 엔드포인트용, 없으면 401 오류)

## 핵심 아키텍처 패턴

### 인증 시스템
- **웹**: Supabase Auth + OAuth (Google, Kakao)
- **모바일**: Capacitor 플러그인 + JWT 토큰
- **백업**: Capacitor Preferences (key: `supabase_auth_session`)

## Task Master AI

`.taskmaster/CLAUDE.md` 참조 - 작업 관리 워크플로우 및 명령어

---

## Claude Code 개발 가이드

### 기본 규칙

- **한글로 대답하세요**
- **커밋은 사용자에게 허락 확인 받고 하세요**
- **CLAUDE.md 업데이트 시 핵심만 작성, 예제 코드는 최소화하세요**

---

## 🚨 공통 패턴 (절대 원칙)

### 1. 🌐 환경별 개발 가이드

**절대 금지**:
- ❌ 한 환경의 빌드 오류로 다른 환경 코드 삭제/수정
- ❌ 모바일 오류 → 웹 코드 수정 | 웹 오류 → 모바일 코드 수정

**반응형 우선 (Tailwind) - 권장**:
- ✅ UI 크기/간격/폰트 → `className="w-20 sm:w-16"` (DevTools 테스트 가능)

**BUILD_TARGET - 제한적**:
- ⚠️ Capacitor 전용, SSR 분기만 → `{process.env.BUILD_TARGET === 'mobile' && ...}`
- ⚠️ DevTools 불가, 실제 빌드 필요

| 요구사항 | 사용 패턴 |
|---------|---------|
| 화면 크기별 UI | Tailwind Responsive |
| Capacitor 네이티브 | BUILD_TARGET |

---

## 🎨 프론트엔드 개발 패턴

### 스타일 규칙

| 항목 | 사용 ✅ | 금지 ❌ |
|------|--------|---------|
| 색상 | `bg-primary`, `bg-accent` | `bg-purple-500`, `bg-[#3B82F6]` |
| 버튼 | `btn-ghost`, `btn-soft` | `btn-outline` |
| 아이콘 | Lucide React

### UI 컴포넌트 패턴

| 패턴 | 규칙 |
|------|------|
| 아이콘 컨테이너 | `rounded-full`, 테두리 없음, `text-white` |
| 액션 버튼 | `rounded-full` (pill shape) |
| 아이콘 전용 버튼 | `btn-circle` |
| 아코디언 | `bg-transparent hover:opacity-80` |

### Hover 색상 규칙

| 컨테이너 배경 | 카드 기본 | 카드 Hover |
|--------------|----------|-----------|
| bg-base-200 | bg-base-100 | hover:bg-base-300 |
| bg-base-100 | bg-base-200 | hover:bg-base-300 |

**주의**: hover 색상은 반드시 컨테이너 배경과 다른 색상 사용

### 아이콘 + 제목 입력 (편집 모달)

| 요소 | 스타일 |
|------|--------|
| 아이콘 버튼 | `w-12 h-12 rounded-lg bg-[#f3f4f6]` |
| 색상 인디케이터 | `w-5 h-5 rounded-full absolute -bottom-1 -left-1` |
| 입력 필드 | `border-0 border-b-2 text-[20px] font-semibold` |

### 폼 섹션 (편집 모달)

- 컨테이너: `my-4`
- 제목: `flex items-center gap-3 text-lg font-semibold mb-3`
- 래퍼: `p-3 rounded-lg bg-base-200 border border-base-300`

### 모달 패턴

**DaisyUI dialog 우선** (z-index 보장):
- 구조: `<dialog open className="modal z-[110]">` + `modal-box`
- Z-index: 반드시 `z-[110]` 명시 (AppHeader보다 높음)
- 헤더: 취소(좌)-제목(중)-삭제-저장(우), 모두 `rounded-full`
- Sticky Header: `sticky top-0 z-10` (부모 기준 상대값)
- 패딩: `pt-[30px] sm:pt-2` (헤더), `px-3` (양쪽)
- Capacitor: `useModalStore`로 하단 네비 자동 숨김

**기존 react-modal-sheet**: 점진적 마이그레이션 (14개 파일)

### Z-Index 계층 구조

| 레이어 | z-index | 용도 | 위치 |
|--------|---------|------|------|
| Dialog | z-[110] | 모달/대화상자 | `<dialog>` 요소 |
| Dialog Backdrop | z-[109] | 모달 배경 | `dialog::backdrop` (globals.css) |
| Sheet Content | z-50 | Bottom sheet 콘텐츠 | react-modal-sheet |
| AppHeader | z-40 | 고정 헤더 | `/components/layout/AppHeader.tsx` |
| Sheet Overlay | z-40 | Bottom sheet 배경 | react-modal-sheet |
| FAB | z-20 | Floating Action Button | 각 페이지 |
| Modal Sticky Header | z-10 | 모달 내부 고정 헤더 | 부모 기준 상대값 |

**중요 규칙**:
- 새로운 모달 → 반드시 `<dialog className="modal z-[110]">`
- 모달 내부 sticky 요소 → `z-10` 사용 (부모 기준)
- AppHeader보다 높은 z-index 필요 시 → z-50 이상 사용
- 전역 스타일(`globals.css`)에서 기본값 보장

### 즉시 생성 패턴

- 추가 버튼 → DB 즉시 생성 + spinner

---

## 🔧 백엔드 개발 패턴

### 인증

- `useAuth()` Hook → userId 파라미터 전달
- Store에서 `getState().user?.id` 직접 호출 금지
- Capacitor 백업: Preferences (`supabase_auth_session`)

### DB 접근

- `supabaseWebViewHelper.ts` JWT 방식만
- `supabase.from()` 직접 호출 금지
- DB 필터링: 서버에서만 (클라이언트 중복 금지)
- 스키마 검증: Supabase MCP로 확인
**Materialized View 사용 금지:**
- 캐시된 스냅샷 반환 → DELETE/UPDATE 후 자동 갱신 안됨
- 새로고침해도 삭제된 데이터가 계속 보이는 문제 발생
- **필수**: `todos`, `projects`, `goals` 테이블 직접 조회 + 클라이언트 필터링
- 스키마 검증: supabase dev mcp(개발 DB), supabase prod MCP(운영 DB)로 확인

### 상태 관리

**Optimistic Update 패턴 (필수)**:
- UI 즉시 업데이트 → DB 업데이트 → 동기화 순서
- 에러 시 롤백으로 일관성 보장
- 드래그앤드롭, 편집 등 모든 상태 변경에 적용Edge Function

**적용 원칙**:
- `setState` 먼저 → `await DB.update()` → `fetch & setState` (동기화)
- try-catch로 에러 시 DB에서 재조회하여 롤백
- Zustand: `Object.assign(state.optimisticState, {...})` 사용

### 날짜/시간 저장 패턴

**timestamptz 날짜 전용 저장**:
- 날짜만 저장: `new Date('YYYY-MM-DDT00:00:00+09:00').toISOString()`
- DB 저장: 한국시간 자정 → UTC 변환 (예: 2025-11-08 00:00 KST → 2025-11-07 15:00 UTC)

**schedule_type 필드로 구분**:
- `anytime`: 날짜만 (start_time은 자정)
- `timed`: 날짜+시간
- `all_day`: 종일

**중요**: DB의 start_time만으로는 날짜/시간 구분 불가. schedule_type 필드 필수.

