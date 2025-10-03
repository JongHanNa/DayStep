# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 저장소 정보

**저장소 이름**: DayStep  
**원격 저장소**: https://github.com/JongHanNa/Willist.git  
**설명**: 나만의 할일 관리 앱 - Personal productivity app for managing todos and templates

## 프로젝트 개요

DayStep은 Next.js 15, React 19, TypeScript, Supabase로 구축된 풀스택 개인 생산성 애플리케이션입니다. 사용자가 할일 목록과 재사용 가능한 템플릿을 한 곳에서 체계적으로 관리할 수 있도록 도와줍니다.

### 핵심 기능
- **📝 할일 관리**: 할일 CRUD, 우선순위/상태 관리, 드래그앤드롭, 검색/필터링
- **📚 보관함**: 재사용 가능한 템플릿 저장 및 관리
- **🌙 다크모드**: 라이트/다크/시스템 테마 지원
- **📱 반응형**: 모바일, 태블릿, 데스크톱 최적화
- **♿ 접근성**: WCAG 2.1 AA 준수
- **🔄 실시간 동기화**: 다중 기기 간 데이터 실시간 업데이트

### 기술 스택

- **프론트엔드**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **백엔드**: Supabase (PostgreSQL, Auth, Realtime)
- **상태 관리**: Zustand with persistence utilities
- **인증**: Supabase Auth with Google & Kakao OAuth (네이티브 + 웹 통합)
- **모바일**: Capacitor 7 + @capgo/capacitor-social-login 플러그인
- **모바일 OAuth**: Google Sign-In iOS SDK + Supabase idToken 인증
- **배포**: Vercel (웹) + iOS/Android 네이티브 앱
- **DnD**: @dnd-kit for drag and drop functionality
- **날짜 처리**: date-fns, date-fns-tz for timezone handling
- **애니메이션**: framer-motion for UI animations
- **알림**: Local notifications via Capacitor

### 환경별 주요 설정

**React StrictMode**:
- 웹 환경: 모든 환경에서 OFF (개발 편의성 우선)
- 모바일 환경: 모든 환경에서 OFF (WebView 안정성)

**빌드 타겟**:
- `BUILD_TARGET=web`: 웹 브라우저용 빌드
- `BUILD_TARGET=mobile`: Capacitor WebView용 빌드

**하이드레이션 처리**:
- 웹: SSR → Hydration (필수)
- 모바일: SPA 모드 (하이드레이션 패턴 유지)

## 개발 명령어

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (일반 개발)
npm run dev                              # 기본 개발 서버 (http://localhost:3000)
npm run dev:web                          # 웹 전용 개발 서버 (BUILD_TARGET=web, 2초 시작)
npm run dev:mobile                       # 모바일 개발 빌드 + Capacitor 동기화

# 프로덕션 빌드
npm run build                            # 웹 프로덕션 빌드 (StrictMode OFF)
npm run build:web                        # BUILD_TARGET=web으로 웹 전용 빌드
BUILD_TARGET=mobile npm run build        # 모바일 프로덕션 빌드 (StrictMode OFF)

# 프로덕션 미리보기 (배포 전 확인)
npm run preview:web                      # 웹 프로덕션 빌드 + 프로덕션 서버 실행

# 프로덕션 서버 시작
npm start          # 빌드된 애플리케이션 실행

# 린팅 실행
npm run lint       # ESLint with Next.js 규칙

# 타입 체킹 (커밋 전 실행)
npx tsc --noEmit   # TypeScript 컴파일 체크

# 테스트 명령어
npm run test              # 모든 단위 테스트 실행
npm run test:watch        # 와치 모드로 테스트 실행
npm run test:coverage     # 커버리지와 함께 테스트 실행 (목표: 80% 이상)
npm run test:unit         # 단위 테스트만 실행
npm run test:integration  # 통합 테스트만 실행
npm run test:e2e          # Playwright E2E 테스트 실행
npm run test:e2e:ui       # UI와 함께 Playwright 테스트 실행
npm run test:e2e:debug    # 디버그 모드로 E2E 테스트
npm run test:all          # 모든 테스트 실행 (단위 + E2E)

# 모바일 빌드 명령어
npm run dev:mobile        # 모바일 개발 빌드 + Capacitor 동기화 (권장)
npm run build:mobile      # 모바일 프로덕션 빌드
npm run mobile:ios        # Xcode에서 열기
npm run mobile:android    # Android Studio에서 열기
npm run mobile:sync       # 네이티브 프로젝트에 변경사항 동기화
npm run mobile:clean      # 모바일 빌드 정리 및 재동기화

# 분석 및 디버깅
npm run analyze:bundle    # 번들 사이즈 분석
npm run debug:build       # 디버그 모드로 빌드
npm run debug:mobile      # 모바일 빌드 디버깅
```

## 환경 설정

`.env.example`을 `.env.local`로 복사하고 설정:

```bash
# 앱 기능에 필요한 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # 프로덕션에서는 https://willist.app

# Task Master AI에 필요한 설정 (최소 하나는 필요)
ANTHROPIC_API_KEY=your_anthropic_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key  # 연구 기능에 권장
```

## MCP Server Configuration

This project uses several MCP (Model Context Protocol) servers for enhanced functionality:

### Available MCP Servers

- **taskmaster-ai**: Task management and workflow automation
- **perplexity-ask**: Code research, documentation lookup, and best practices
- **context7**: Code research, documentation lookup, and best practices
- **playwright**: Browser automation and UI testing
- **supabase**: Database management and operations


### Usage Guidelines

- Use `taskmaster-ai` MCP for all task management operations
- Use `perplexity-ask` MCP when researching code patterns or investigating issues
- Use `context7` MCP when researching code patterns or investigating issues
- Use `playwright` MCP for UI testing after running the web application
- Use `supabase` MCP for database management operations



## 🏗️ 프로젝트 구조

```
DayStep/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (health, auth callbacks)
│   ├── auth/              # Authentication pages
│   ├── context/           # React contexts (AuthContext)
│   ├── login/             # Login page
│   ├── repository/        # Template repository pages  
│   ├── settings/          # Settings and notifications
│   └── page.tsx           # Main dashboard/timeline
├── components/            # React components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── layout/           # Layout components (Navigation, BottomNav)
│   ├── todos/            # Todo-related components
│   ├── repository/       # Repository components
│   ├── timeline/         # Timeline view components
│   ├── providers/        # Context providers
│   └── notifications/    # Notification components
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Supabase client setup
│   ├── supabaseWebViewHelper.ts # Capacitor-specific database helpers
│   ├── auth/             # Authentication utilities
│   ├── utils.ts          # Common utilities
│   └── date-utils.ts     # Date/time utilities
├── state/                # State management
│   ├── stores/           # Zustand stores
│   │   ├── todoStore.ts      # Todo management state
│   │   ├── timelineStore.ts  # Timeline view state  
│   │   ├── authStore.ts      # Authentication state
│   │   └── settingsStore.ts  # App settings state
│   └── utils/            # Store utilities
├── types/                # TypeScript type definitions
├── shared/               # Shared feature modules
│   └── features/         # Feature-based organization
├── mobile/               # Capacitor mobile app files
├── .taskmaster/          # Task Master AI configuration
└── docs/                 # Documentation files
```


## 🔑 핵심 아키텍처 패턴

### 상태 관리 (Zustand)
- **todoStore**: Todo CRUD 및 optimistic updates
- **timelineStore**: 타임라인 뷰 상태 관리
- **authStore**: 인증 상태 및 사용자 정보
- **settingsStore**: 앱 설정 및 사용자 기본설정

### 환경별 빌드 시스템
- **웹 빌드**: `BUILD_TARGET=web` - standalone 모드, SSR 지원
- **모바일 빌드**: `BUILD_TARGET=mobile` - export 모드, Capacitor WebView 최적화

### 인증 시스템
- **웹**: Supabase Auth with OAuth (Google, Kakao)  
- **모바일**: Capacitor 플러그인 + JWT 토큰 방식
- **백업 인증**: Capacitor Preferences로 세션 유지

### 데이터베이스 접근 패턴
- **웹, 모바일**: `supabaseWebViewHelper.ts`의 JWT 방식 사용
- **Optimistic Updates**: 모든 CRUD 작업에 낙관적 업데이트 적용

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
