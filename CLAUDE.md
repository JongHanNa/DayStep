# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

DayStep은 Next.js 15 + React 19 기반의 할일 관리 앱으로, **웹과 모바일(iOS/Android) 하이브리드 환경**을 동시에 지원합니다. Capacitor 7를 통한 네이티브 앱 기능과 Supabase 백엔드를 활용한 실시간 동기화가 핵심입니다.

**중요한 컨텍스트**: 이 프로젝트는 **환경별 조건부 빌드**(BUILD_TARGET: web|mobile)를 사용하며, 동일한 코드베이스에서 웹과 모바일 앱을 생성합니다.

## 필수 명령어

### 개발 서버

```bash
# 웹 개발 (IP 자동 설정 포함)
npm run dev

# 웹 개발 (IP 설정 없이)
npm run dev:direct

# 캐시 정리 후 실행
npm run dev:clean

# 완전 정리 후 실행 (안정성 우선)
npm run dev:stable
```

### 모바일 개발

```bash
# 모바일 빌드 (Next.js export + Capacitor 동기화)
npm run build:mobile

# iOS 시뮬레이터 실행
npm run mobile:run:ios

# Android 에뮬레이터 실행
npm run mobile:run:android

# Xcode에서 열기
npm run mobile:ios

# Android Studio에서 열기
npm run mobile:android

# 모바일 환경 진단
npm run mobile:doctor
```

### 테스트

```bash
# 단위 테스트
npm run test
npm run test:unit

# 통합 테스트
npm run test:integration

# E2E 테스트 (Playwright)
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:debug

# 모든 테스트 실행
npm run test:all
```

### 빌드 및 배포

```bash
# 웹용 프로덕션 빌드
npm run build:web

# 모바일용 프로덕션 빌드
npm run build:mobile

# 번들 크기 분석
npm run analyze:bundle
```

### 코드 품질

```bash
# 린팅
npm run lint
npm run lint:fix

# 타입 체크
npm run type-check

# 포맷팅
npm run format
npm run format:check
```

## 핵심 아키텍처 패턴

### 1. 환경별 조건부 빌드 시스템

**중요**: 이 프로젝트는 웹과 모바일을 단일 코드베이스로 관리하며, `BUILD_TARGET` 환경 변수로 빌드를 분기합니다.

#### 빌드 타겟 결정 (next.config.ts:6-8)
```typescript
const buildTarget = process.env.BUILD_TARGET || (process.env.MOBILE_BUILD === 'true' ? 'mobile' : 'web');
const isMobileBuild = buildTarget === 'mobile';
const isWebBuild = buildTarget === 'web';
```

#### 환경별 설정 차이
- **웹 빌드**:
  - Next.js 서버리스 모드
  - SSR/ISR 지원
  - API 라우트 활성화

- **모바일 빌드**:
  - Next.js export 모드 (정적 HTML 생성)
  - SPA 동작
  - API 라우트 비활성화 (`.mobile.ts` 버전으로 대체)

#### 조건부 렌더링 패턴
컴포넌트에서 환경별 로직 분기:
```typescript
const isMobile = process.env.BUILD_TARGET === 'mobile' || process.env.NEXT_PUBLIC_IS_MOBILE === 'true';

// 환경별 컴포넌트 렌더링
{isMobile ? <MobileComponent /> : <WebComponent />}

// 환경별 API 호출
const fetchData = isMobile
  ? () => supabaseWebViewHelper.query()  // 모바일: JWT 직접 사용
  : () => supabase.from().select();      // 웹: 쿠키 기반 세션
```

### 2. Supabase 클라이언트 아키텍처

**웹 환경**: `lib/supabase.ts` - 브라우저 클라이언트 (쿠키 기반 세션)
```typescript
import { createBrowserSupabaseClient } from '@/lib/supabase';
const supabase = createBrowserSupabaseClient();
```

**모바일 환경**: `lib/supabaseWebViewHelper.ts` - JWT 토큰 기반 헬퍼
```typescript
import { supabaseWebViewHelper } from '@/lib/supabaseWebViewHelper';
// Capacitor Preferences에 저장된 JWT 토큰으로 직접 인증
const { data } = await supabaseWebViewHelper.from('todos').select();
```

**중요한 차이점**:
- 웹: `@supabase/ssr` 쿠키 기반 세션 관리
- 모바일: JWT 토큰을 Capacitor Preferences에 저장 및 직접 사용

### 3. Zustand 상태 관리

모든 도메인별 상태는 `state/stores/` 디렉토리에 독립적인 Zustand 스토어로 관리됩니다:

```
state/stores/
├── todoStore.ts           # 할일 관리
├── timelineViewStore.ts   # 타임라인 뷰
├── authStore.ts           # 인증 상태
├── pomodoroStore.ts       # 뽀모도로 타이머
├── noteStore.ts           # 노트
├── contactsStore.ts       # 연락처
├── settingsStore.ts       # 앱 설정
└── secondBrain/           # GTD 시스템 상태
    ├── inboxStore.ts
    ├── clarifyStore.ts
    ├── organizeStore.ts
    └── reviewStore.ts
```

**Optimistic UI 패턴**: 모든 스토어는 즉시 UI 반영 후 서버 동기화 방식을 사용합니다.

### 4. API 라우트 환경별 처리

모바일 빌드는 API 라우트를 지원하지 않으므로 `.mobile.ts` 파일로 대체:

```
app/api/auth/
├── callback/
│   ├── route.ts          # 웹용 (서버 사이드)
│   └── route.mobile.ts   # 모바일용 (클라이언트 사이드)
└── google/
    ├── url/
    │   ├── route.ts
    │   └── route.mobile.ts
    └── callback/
        ├── route.ts
        └── route.mobile.ts
```

**Webpack alias 설정** (next.config.ts:186-193)으로 빌드 타겟에 따라 자동 교체됩니다.

### 5. Capacitor 네이티브 API 통합

모바일 앱에서만 사용 가능한 네이티브 기능:

```typescript
import { Contacts } from '@capacitor-community/contacts';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Keyboard } from '@capacitor/keyboard';

// 플랫폼 감지
import { Capacitor } from '@capacitor/core';
const isNativePlatform = Capacitor.isNativePlatform();
```

**커스텀 플러그인**: `plugins/contact-groups/` - 연락처 그룹 기능 (iOS/Android)

### 6. TypeScript 경로 별칭

`tsconfig.json` 참조:
```typescript
import { Todo } from '@/types/todo';              // 프로젝트 루트
import { MobileHeader } from '@mobile/widgets';   // 모바일 전용
import { ContactGroups } from '@plugins/contact-groups'; // 플러그인
```

## 컴포넌트 구조

### UI 컴포넌트 계층

```
components/
├── ui/                   # shadcn/ui 기본 컴포넌트 (Radix UI 기반)
├── layout/               # 레이아웃 (네비게이션, 헤더)
├── todos/                # 할일 관련
├── timeline/             # 타임라인 뷰
├── pomodoro/             # 뽀모도로 타이머
├── notes/                # 노트 에디터
├── contacts/             # 연락처
├── second-brain/         # GTD 시스템 (inbox, clarify, organize, review)
└── mobile/               # 모바일 전용 컴포넌트
```

### 페이지 라우팅 (App Router)

```
app/
├── page.tsx              # 메인 대시보드 (할일 + 타임라인)
├── timeline/             # 타임라인 전용 뷰
├── inbox/                # GTD 수집함
├── second-brain/         # GTD 시스템
│   ├── inbox/           # 수집
│   ├── clarify/         # 명료화
│   ├── organize/        # 정리
│   └── review/          # 검토
├── projects/             # 프로젝트 관리
├── routine/              # 루틴 관리
├── settings/             # 설정
└── login/                # 로그인
```

## 주요 기술적 고려사항

### 1. 하이드레이션 에러 방지

**중요**: `reactStrictMode: false` 설정 (next.config.ts:21, 44)
- 웹/모바일 환경 차이로 인한 하이드레이션 불일치 방지
- SSR/SPA 모드 전환 시 발생하는 에러 해결

### 2. Next.js 15 + Supabase 호환성

**간헐적 SyntaxError 해결** (next.config.ts:74-110):
- CJS 우선 모듈 해상도 (`mainFields: ["main", "module", "browser"]`)
- 웹팩 캐시 비활성화 (개발 모드)
- 심볼릭 링크 해상도 비활성화

### 3. 모바일 빌드 최적화

**Capacitor WebView 호환성** (next.config.ts:224-266):
- 단순한 청크 분할로 로딩 순서 문제 해결
- 런타임 청크를 메인 번들에 인라인 포함
- CSS @규칙 처리 개선 (url(), @import 비활성화)

### 4. 번들 크기 최적화 (웹)

**코드 스플리팅 전략** (next.config.ts:287-333):
- React 전용 청크 (30 우선순위)
- UI 라이브러리 청크 (25 우선순위)
- Supabase 청크 (20 우선순위)
- 상태 관리 청크 (15 우선순위)

### 5. DaisyUI 테마 시스템

**다크모드 지원**: `next-themes` 라이브러리 사용
```typescript
import { useTheme } from 'next-themes';
const { theme, setTheme } = useTheme();
```

**DaisyUI 클래스 우선 사용**:
- 버튼: `btn btn-primary rounded-full`
- 카드: `card bg-base-100`
- 탭: `tabs tabs-boxed`

## 개발 워크플로우

### 새로운 기능 추가 시

1. **환경 고려**: 웹/모바일 양쪽에서 동작할지 결정
2. **상태 관리**: `state/stores/`에 Zustand 스토어 생성 또는 확장
3. **컴포넌트 작성**: `components/` 적절한 도메인 디렉토리에 배치
4. **페이지 라우팅**: `app/` 디렉토리에 페이지 생성
5. **환경별 테스트**: 웹 (`npm run dev`) + 모바일 (`npm run mobile:run:ios`) 검증

### API 라우트 추가 시

1. **웹용**: `app/api/[route]/route.ts` 작성
2. **모바일용**: `app/api/[route]/route.mobile.ts` 작성 (클라이언트 사이드 로직)
3. **Webpack alias**: `next.config.ts`에 별칭 추가

### 타입 정의

- Supabase 타입: `types/supabase.ts` (자동 생성)
- 도메인 타입: `types/[domain].ts` (수동 정의)

## 디버깅 및 트러블슈팅

### 모바일 빌드 실패 시

1. `npm run mobile:doctor` - 환경 진단
2. `npm run mobile:clean` - 캐시 정리
3. `npm run validate:build` - 환경 변수 검증

### 하이드레이션 에러

- 조건부 렌더링에서 `typeof window !== 'undefined'` 체크
- `useEffect`로 클라이언트 사이드 전용 로직 래핑

### Supabase 연결 실패

- 웹: 쿠키 설정 확인 (`lib/supabase.ts`)
- 모바일: JWT 토큰 저장 확인 (Capacitor Preferences)

## TASKS.md 작업 관리

**중요**: 작업을 진행할 때마다 항상 `TASKS.md`를 확인하고 업데이트해야 합니다.

- 작업 시작 전: 현재 진행중인 작업 확인
- 작업 완료 후: Todo → 완료로 상태 변경
- 새로운 작업 발견 시: TASKS.md에 추가

## 성능 모니터링

- Core Web Vitals: `npm run analyze:bundle`
- 번들 크기: `.next/analyze/` 디렉토리 참조
- 모바일 성능: Capacitor 빌드 후 Chrome DevTools 프로파일링

## 보안 주의사항

- `.env.local`: 절대 커밋하지 않음
- Supabase RLS: 모든 테이블에 Row Level Security 적용 필수
- API 라우트: 서버 사이드에서만 민감한 정보 처리
- 모바일 JWT: Capacitor Preferences는 암호화되어 저장됨

## 배포

- **웹**: Vercel 자동 배포 (GitHub 푸시 시)
- **모바일**:
  - iOS: Xcode Archive → App Store Connect
  - Android: Android Studio Generate Signed Bundle → Google Play Console
