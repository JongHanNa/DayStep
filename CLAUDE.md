# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 정보

**저장소**: DayStep - 할일 관리 및 템플릿 기반 생산성 앱
**기술 스택**: Next.js 15, React 19, TypeScript, Supabase, Capacitor 7
**배포**: 웹 (Vercel) + iOS/Android 네이티브 앱

## 개발 명령어

### 일반 개발 (개발 DB 사용)
```bash
npm install                    # 의존성 설치
npm run dev:web               # 웹 개발 서버 (개발 DB)
npm run dev:mobile            # 모바일 개발 (개발 DB) + Capacitor 동기화
npm run lint                  # ESLint 검사
npx tsc --noEmit             # 타입 체크
```

### 빌드 및 배포

**웹**:
```bash
npm run build                 # 웹 프로덕션 빌드 (프로덕션 DB)
npm run preview:web           # 웹 프로덕션 미리보기
```

**모바일**:
```bash
npm run build:mobile          # TestFlight 내부 테스트용 (개발 DB)
npm run build:mobile:prod     # App Store 배포용 또는 최종 TestFlight (프로덕션 DB)
```

**Bundle Identifier 자동 설정**:
- `mobile/capacitor.config.ts`에서 `NODE_ENV`에 따라 자동 분기
- Development: `com.daystep.app.dev` (DevDayStep)
- Production: `com.daystep.app` (DayStep)
- 두 앱을 동시에 설치하여 비교 테스트 가능

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
- Next.js 자동 환경 로딩: `NODE_ENV`에 따라 자동 전환
- `cross-env`로 환경 변수 설정 (크로스 플랫폼 호환)

**Vercel 배포**:
- ⚠️ Vercel은 `.env.production` 파일을 사용하지 않음
- ✅ Vercel Dashboard → Settings → Environment Variables에서 설정
- **Production**: main 브랜치 → 프로덕션 DB → `daystep.vercel.app`
- **Preview**: develop/feature 브랜치 → 개발 DB → 자동 생성 URL
- 📖 상세 가이드: `docs/VERCEL_DEPLOYMENT.md` 참조

## MCP 서버

`.mcp.json` 참조:
- **taskmaster-ai**: 작업 관리 자동화
- **perplexity-ask**, **context7**: 코드 리서치, 문서 검색
- **playwright**: 브라우저 자동화, UI 테스트
- **supabase dev**: 개발 DB 관리 (DayStep)
- **supabase prod**: 프로덕션 DB 관리 (DayStep Production)

## 핵심 아키텍처 패턴

### 환경별 빌드 시스템 (중요)
- **웹**: `BUILD_TARGET=web` → standalone 모드, SSR 지원
- **모바일**: `BUILD_TARGET=mobile` → export 모드, Capacitor WebView 최적화
- **StrictMode**: 모든 환경에서 OFF (웹: 개발 편의성, 모바일: WebView 안정성)

### 인증 시스템
- **웹**: Supabase Auth + OAuth (Google, Kakao)
- **모바일**: Capacitor 플러그인 + JWT 토큰
- **백업**: Capacitor Preferences (key: `supabase_auth_session`)


### 상태 관리 (Zustand)
- `todoStore`: Todo CRUD, optimistic updates
- `timelineStore`: 타임라인 뷰 상태
- `authStore`: 인증 상태, 사용자 정보
- `settingsStore`: 앱 설정

### 주요 라이브러리
- **DnD**: @dnd-kit
- **날짜**: date-fns, date-fns-tz
- **애니메이션**: framer-motion
- **UI**: shadcn/ui + Tailwind + DaisyUI
- **알림**: Capacitor Local Notifications

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
- ✅ Breakpoint: `max-sm:` (< 640px), `sm:` (≥ 640px), `md:` (≥ 768px), `lg:` (≥ 1024px)

**BUILD_TARGET - 제한적**:
- ⚠️ Capacitor 전용, SSR 분기만 → `{process.env.BUILD_TARGET === 'mobile' && ...}`
- ⚠️ DevTools 불가, 실제 빌드 필요

| 요구사항 | 사용 패턴 |
|---------|---------|
| 화면 크기별 UI | Tailwind Responsive |
| Capacitor 네이티브 | BUILD_TARGET |

### 2. 📚 외부 리소스 활용

**MCP 선택**: 라이브러리 명시? → Context7만 | 미정 → Perplexity → Context7

**예외 조건** (모두 만족 시만 커스텀):
- [ ] MCP로 적합한 라이브러리 없음
- [ ] 환경 호환성 문제 확인
- [ ] 요구사항 매우 특수
- [ ] 성능상 커스텀 필수

### 3. ⚠️ 안티패턴 회피

실무에서 관리 복잡도를 올리는 핵심 안티패턴과 해결 방법

#### **1️⃣ 코드 중복 안티패턴**

**증상**:
- 각 페이지에 동일/유사 로직 인라인 구현
- 모달 데이터 변환 로직이 3곳에 중복

**문제**:
- 유지보수 어려움 (1곳 수정 → N곳 수정 필요)
- 일관성 보장 안됨 (한 곳만 수정 시 버그)

**해결**:
- 공통 함수 추출 (`lib/helpers/`, `lib/utils/`)
- DRY 원칙 적용
- 참고: noteDataMapper.ts (50줄 → 7줄, 86% 감소)

#### **2️⃣ Props Drilling 과도 안티패턴**

**증상**: 5단계 이상 props 전달
**문제**: 중간 컴포넌트 불필요한 의존성
**해결**: Context API, Zustand 등 상태 관리

#### **3️⃣ God Component 안티패턴**

**증상**: 500줄+ 단일 컴포넌트
**문제**: 테스트/수정 어려움, 재사용 불가
**해결**: 컴포넌트 분리, Custom Hook 추출

#### **4️⃣ 하드코딩 안티패턴**

**증상**:
- Magic Number/String 직접 사용
- 환경별 설정을 코드에 하드코딩

**문제**:
- 유지보수 어려움 (값 변경 시 전체 검색 필요)
- 환경별 배포 복잡 (개발/스테이징/운영)
- 의미 파악 어려움 (`if (status === 1)` 의미는?)

**해결**:
- 상수 파일 분리 (`lib/constants/`)
- 환경 변수 사용 (`.env.development`, `.env.production`)
- 명확한 상수명 (`STATUS_ACTIVE`, `MAX_RETRY_COUNT`)

#### **5️⃣ 타입 안정성 무시 안티패턴**

**증상**: `any` 타입 남용
**문제**: 런타임 에러, IDE 지원 불가
**해결**: 명확한 타입 정의, 타입 가드

---

## 🎨 프론트엔드 개발 패턴

### 스타일 규칙

| 항목 | 사용 ✅ | 금지 ❌ |
|------|--------|---------|
| 색상 | `bg-primary`, `bg-accent` | `bg-purple-500`, `bg-[#3B82F6]` |
| 버튼 | `btn-ghost`, `btn-soft` | `btn-outline` |
| 아이콘 | Lucide React | 이모지 |
| 효과 | - | 그라디언트 |

### UI 컴포넌트 패턴

| 패턴 | 규칙 |
|------|------|
| 아이콘 컨테이너 | `rounded-full`, 테두리 없음, `text-white` |
| 액션 버튼 | `rounded-full` (pill shape) |
| 아이콘 전용 버튼 | `btn-circle` |
| 아코디언 | `bg-transparent hover:opacity-80` |

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

**DaisyUI dialog 우선**:
- 구조: `<dialog open>` + `modal-box` + `modal-backdrop`
- 헤더: 취소(좌)-제목(중)-삭제-저장(우), 모두 `rounded-full`
- 패딩: `pt-[30px] sm:pt-2` (헤더), `px-3` (양쪽)
- Capacitor: `useModalStore`로 하단 네비 자동 숨김

**기존 react-modal-sheet**: 점진적 마이그레이션 (14개 파일)

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
- 드래그앤드롭, 편집 등 모든 상태 변경에 적용

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

---

## 🔄 개발 워크플로우

### 표준 5단계

1. 요구사항 분석
2. 라이브러리 탐색 (Perplexity MCP)
3. 공식 문서 확인 (Context7 MCP)
4. 기존 패턴 탐색 (`components/ui/`, DaisyUI)
5. 구현 및 검증 (웹/모바일 테스트)

---

## ✅ 품질 관리

### 작업 완료 체크리스트

1. [ ] 코드 작성 완료
2. [ ] 기능 테스트 수행
3. [ ] **중복 코드 검증 완료** (⚠️ 필수)
4. [ ] 사용자 검증 요청
5. [ ] git commit
6. [ ] 다음 작업 시작

### 2회 실패 시

→ Perplexity/Context7 MCP 사용 (근본 원인 분석, deprecated 확인)

### 자동 경고 트리거

| 트리거 | 조치 |
|--------|------|
| 구버전 패턴 | Context7 최신 패턴 확인 |
| 신규 라이브러리 | 호환성 확인 (React 19, Next.js 15) |
| 위험 컴포넌트 | 테스트 필수 (전역 상태, 인증, 네이티브 브리지 등) |

---

## 📚 기타 가이드

### 쉬운 설명 규칙

**트리거**: 기술 용어, 복잡한 개념 설명 시

**형식**: 기술 설명 후 "쉽게 말하면:" + 실생활 비유
