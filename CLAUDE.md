# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 정보

**저장소**: DayStep - 할일 관리 및 템플릿 기반 생산성 앱
**기술 스택**: Next.js 15, React 19, TypeScript, Supabase, Capacitor 7
**배포**: 웹 (Vercel) + iOS/Android 네이티브 앱

## 개발 명령어

### 일반 개발
```bash
npm install                    # 의존성 설치
npm run dev:web               # 웹 개발 서버 (BUILD_TARGET=web, 2초 시작)
npm run dev:mobile            # 모바일 개발 + Capacitor 동기화
npm run lint                  # ESLint 검사
npx tsc --noEmit             # 타입 체크
```

### 빌드 및 배포
```bash
npm run build                 # 웹 프로덕션 빌드 (BUILD_TARGET=web)
npm run build:mobile          # 모바일 빌드 + Capacitor 동기화
npm run preview:web           # 웹 프로덕션 미리보기
npm start                     # 프로덕션 서버
```

### 테스트
```bash
npm run test                  # 단위 테스트
npm run test:coverage         # 커버리지 포함 (목표: 80%)
npm run test:e2e              # Playwright E2E 테스트
npm run test:all              # 전체 테스트 (단위 + E2E)
```

### 모바일 개발
```bash
npm run mobile:ios            # Xcode 열기
npm run mobile:android        # Android Studio 열기
npm run mobile:sync           # 네이티브 동기화
npm run mobile:clean          # 모바일 빌드 정리
```

### 분석 및 디버깅
```bash
npm run analyze:bundle        # 번들 사이즈 분석
npm run debug:build           # 디버그 모드 빌드
```

## 환경 설정

`.env.example` → `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Task Master AI (선택)
ANTHROPIC_API_KEY=your_anthropic_key
PERPLEXITY_API_KEY=your_perplexity_key
```

## MCP 서버

`.mcp.json` 참조:
- **taskmaster-ai**: 작업 관리 자동화
- **perplexity-ask**, **context7**: 코드 리서치, 문서 검색
- **playwright**: 브라우저 자동화, UI 테스트
- **supabase**: 데이터베이스 관리

## 핵심 아키텍처 패턴

### 환경별 빌드 시스템 (중요)
- **웹**: `BUILD_TARGET=web` → standalone 모드, SSR 지원
- **모바일**: `BUILD_TARGET=mobile` → export 모드, Capacitor WebView 최적화
- **StrictMode**: 모든 환경에서 OFF (웹: 개발 편의성, 모바일: WebView 안정성)

### 인증 시스템
- **웹**: Supabase Auth + OAuth (Google, Kakao)
- **모바일**: Capacitor 플러그인 + JWT 토큰
- **백업**: Capacitor Preferences (key: `supabase_auth_session`)

### 데이터베이스 접근 (필수)
- ✅ `lib/supabaseWebViewHelper.ts`의 JWT 방식 사용
- ❌ `supabase.from()` 직접 호출 금지 (웹/모바일 호환성)
- 모든 CRUD: Optimistic updates 적용

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
