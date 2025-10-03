# 🎯 DayStep

**나만의 할일 관리 앱**

DayStep는 할일 목록과 템플릿 보관함을 한 곳에서 체계적으로 관리할 수 있는 개인 생산성 애플리케이션입니다.

## ✨ 주요 기능

### 📝 할일 관리
- 할일 생성, 수정, 삭제 및 완료 처리
- 우선순위(높음/보통/낮음) 및 상태 관리
- 실시간 검색 및 고급 필터링 (상태, 우선순위, 날짜)
- 드래그 앤 드롭으로 순서 변경
- **📅 타임라인 뷰**: 날짜별 할일 시각화 및 관리
- 반복 할일 지원 (매일, 매주, 매월)

### 📚 보관함 (템플릿 시스템)
- 재사용 가능한 할일 템플릿 저장 및 관리
- 보관함에서 할일로 원클릭 복사
- 카테고리별 체계적 정리
- 템플릿 검색 및 태그 기능

### 🍅 뽀모도로 타이머
- **집중 타이머**: 25분 작업 + 5분 휴식 사이클
- **통계 및 분석**: 일일/주간/월간 집중 시간 추적
- **커스터마이징**: 작업/휴식 시간 개별 설정
- **오디오 알림**: 사운드 및 진동 알림 설정
- **백그라운드 실행**: 앱 종료 시에도 타이머 지속

### 📝 퀴크 메모
- **Markdown 에디터**: 실시간 미리보기 지원
- **고급 에디터**: CodeMirror 기반 syntax highlighting
- **할일 연결**: 메모를 특정 할일과 연동
- **플로팅 메모**: 빠른 메모 작성을 위한 플로팅 카드
- **자동 저장**: 입력 중 실시간 자동 저장

### 📞 연락처 통합
- **네이티브 연락처 접근**: iOS/Android 연락처 직접 연동
- **그룹별 관리**: 연락처 그룹 기반 체계적 관리
- **할일 연결**: 연락처와 할일을 연결하여 관계 관리
- **빠른 검색**: 실시간 연락처 검색 및 필터링

### 🔔 스마트 알림 시스템
- **로컬 알림**: 할일 마감일 및 뽀모도로 타이머 알림
- **푸시 알림**: 다중 기기 동기화 알림 (준비 중)
- **알림 설정**: 개별 할일별 맞춤 알림 설정
- **조용한 시간**: 방해 금지 시간대 설정

### 📱 하이브리드 모바일 앱
- **iOS/Android 네이티브 앱**: Capacitor 기반 하이브리드 앱
- **네이티브 기능**: 연락처, 알림, 키보드 등 네이티브 API 활용
- **오프라인 지원**: 네트워크 없이도 기본 기능 사용 가능
- **앱 스토어 배포**: iOS App Store 및 Google Play Store 준비

### 🎨 사용자 경험
- **다크모드**: 라이트/다크/시스템 테마 지원
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- **접근성**: WCAG 2.1 AA 준수, 키보드 네비게이션, 스크린 리더 지원
- **실시간 동기화**: 다중 기기 간 데이터 실시간 업데이트
- **애니메이션**: 부드러운 UI 전환 및 피드백 애니메이션

## 🚀 기술 스택

### Frontend

- **Next.js 15** - React 풀스택 프레임워크 (App Router)
- **React 19** - 사용자 인터페이스 라이브러리
- **TypeScript** - 타입 안전성 및 개발 생산성
- **Tailwind CSS** - 유틸리티 우선 CSS 프레임워크
- **shadcn/ui** - 접근성 중심 고품질 UI 컴포넌트
- **Framer Motion** - 부드러운 애니메이션 및 전환 효과

### 모바일 앱 (하이브리드)

- **Capacitor 7** - 웹 기술 기반 네이티브 앱 프레임워크
- **@capacitor/contacts** - 네이티브 연락처 API 통합
- **@capacitor/local-notifications** - 로컬 푸시 알림
- **@capgo/capacitor-social-login** - 소셜 로그인 플러그인
- **@daystep/contact-groups** - 커스텀 연락처 그룹 플러그인

### Backend & Database

- **Supabase** - 백엔드 서비스 (PostgreSQL, Auth, Realtime)
- **Supabase Auth** - 소셜 로그인 (Google, Kakao) + JWT 인증
- **Row Level Security** - 사용자별 데이터 격리 보안
- **Realtime Subscriptions** - 실시간 데이터 동기화

### State Management & Data

- **Zustand** - 경량 상태 관리 라이브러리
- **Immer** - 불변성 관리 및 상태 업데이트 최적화
- **Dexie.js** - IndexedDB 기반 클라이언트 사이드 캐싱
- **React Hook Form** - 폼 상태 관리 및 검증

### 에디터 & 텍스트 처리

- **CodeMirror 6** - 고성능 코드 에디터 (Markdown 지원)
- **Slate.js** - 커스터마이징 가능한 리치 텍스트 에디터
- **@uiw/react-md-editor** - Markdown 미리보기 에디터

### UI/UX 라이브러리

- **@dnd-kit** - 접근성 중심 드래그 앤 드롭
- **React Modal Sheet** - 모바일 친화적 바텀 시트 모달
- **React Confetti Explosion** - 성취감 향상 축하 애니메이션
- **Lucide React** - 일관된 아이콘 시스템
- **React DatePicker** - 날짜 선택 컴포넌트
- **React Textarea Autosize** - 자동 크기 조절 텍스트 영역

### 시간 & 날짜 처리

- **date-fns** - 경량 날짜 유틸리티 라이브러리
- **date-fns-tz** - 시간대 처리 및 변환
- **RRule** - 반복 일정 규칙 처리

### Performance & SEO

- **Code Splitting** - 동적 import로 번들 최적화
- **Image Optimization** - Next.js Image 컴포넌트 활용
- **Web Vitals** - Core Web Vitals 모니터링 및 최적화
- **Progressive Web App** - 오프라인 지원 및 앱 같은 경험
- **Bundle Analyzer** - 번들 크기 분석 및 최적화

## 🛠️ 로컬 개발 환경 설정

### 사전 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- Supabase 계정

### 설치 및 실행

1. **레포지토리 클론**

```bash
git clone https://github.com/JongHanNa/DayStep.git
cd DayStep
```

2. **의존성 설치**

```bash
npm install
```

3. **환경 변수 설정**

```bash
cp .env.example .env.local
```

`.env.local` 파일에 다음 변수들을 설정:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. **개발 서버 실행**

```bash
# 웹 개발 서버 (IP 자동 설정 포함)
npm run dev

# 직접 실행 (IP 설정 없이)
npm run dev:direct

# 캐시 정리 후 실행
npm run dev:clean

# 완전 정리 후 실행
npm run dev:stable
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📱 모바일 앱 개발

### 모바일 빌드 및 실행

```bash
# 빠른 모바일 빌드 (권장)
npm run build:mobile:fast

# 완전 모바일 빌드
npm run build:mobile

# iOS 시뮬레이터에서 실행
npm run mobile:run:ios

# Android 에뮬레이터에서 실행
npm run mobile:run:android

# 네이티브 IDE에서 열기
npm run mobile:ios        # Xcode
npm run mobile:android    # Android Studio
```

### 모바일 개발 유틸리티

```bash
# 모바일 프로젝트 동기화
npm run mobile:sync

# 모바일 프로젝트 정리
npm run mobile:clean

# 모바일 환경 진단
npm run mobile:doctor

# Xcode 로그 필터링
npm run logs:filter
```

## 🧪 테스트

### 단위 테스트 및 통합 테스트

```bash
# 모든 테스트 실행
npm run test

# 테스트 와치 모드
npm run test:watch

# 커버리지와 함께 테스트
npm run test:coverage

# 단위 테스트만 실행
npm run test:unit

# 통합 테스트만 실행
npm run test:integration
```

### E2E 테스트 (Playwright)

```bash
# E2E 테스트 실행
npm run test:e2e

# UI와 함께 E2E 테스트
npm run test:e2e:ui

# 디버그 모드로 E2E 테스트
npm run test:e2e:debug

# 모든 테스트 실행 (단위 + E2E)
npm run test:all
```

## 🔧 빌드 및 배포

### 프로덕션 빌드

```bash
# 웹용 빌드
npm run build:web

# 모바일용 빌드
npm run build:mobile

# 환경 검증 포함 빌드
npm run validate:build
```

### 분석 및 디버깅

```bash
# 번들 크기 분석
npm run analyze:bundle

# 디버그 모드 빌드
npm run debug:build

# 모바일 빌드 분석
npm run analyze:mobile
```

## ⚙️ 개발 도구

### 코드 품질

```bash
# 린팅
npm run lint

# 린팅 자동 수정
npm run lint:fix

# 코드 포맷팅
npm run format

# 포맷팅 체크
npm run format:check

# 타입 체크
npm run type-check
```

## 📦 배포

### Vercel 배포 (권장)

1. **GitHub에 푸시**

```bash
git push origin main
```

2. **Vercel 대시보드에서 배포**

- [Vercel Dashboard](https://vercel.com/dashboard) 접속
- "New Project" → GitHub 레포지토리 선택
- 환경 변수 설정 후 배포

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md) 및 [VERCEL_DEPLOYMENT_STEPS.md](./VERCEL_DEPLOYMENT_STEPS.md)를 참고하세요.

## 🗂️ 프로젝트 구조

```
DayStep/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트 (auth callbacks, health check)
│   ├── auth/              # 인증 관련 페이지
│   ├── context/           # React Context 제공자
│   ├── login/             # 로그인 페이지
│   ├── repository/        # 보관함 페이지
│   ├── settings/          # 설정 및 알림 페이지
│   └── page.tsx           # 메인 대시보드/타임라인
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 기본 컴포넌트
│   ├── layout/           # 네비게이션, 바텀 네비게이션
│   ├── todos/            # 할일 관련 컴포넌트
│   ├── repository/       # 보관함 관련 컴포넌트
│   ├── timeline/         # 타임라인 뷰 컴포넌트
│   ├── pomodoro/         # 뽀모도로 타이머 컴포넌트
│   ├── memos/            # 메모 에디터 컴포넌트
│   ├── contacts/         # 연락처 관련 컴포넌트
│   ├── notifications/    # 알림 컴포넌트
│   ├── widgets/          # 위젯 컴포넌트
│   ├── providers/        # Context 제공자
│   └── mobile/           # 모바일 전용 컴포넌트
├── lib/                  # 유틸리티 라이브러리
│   ├── supabase.ts       # Supabase 클라이언트 설정
│   ├── supabaseWebViewHelper.ts # Capacitor WebView용 DB 헬퍼
│   ├── auth/             # 인증 유틸리티
│   ├── utils.ts          # 공통 유틸리티
│   └── date-utils.ts     # 날짜/시간 유틸리티
├── state/                # 상태 관리 (Zustand)
│   ├── stores/           # Zustand 스토어
│   │   ├── todoStore.ts      # 할일 관리 상태
│   │   ├── timelineStore.ts  # 타임라인 뷰 상태
│   │   ├── authStore.ts      # 인증 상태
│   │   ├── settingsStore.ts  # 앱 설정 상태
│   │   ├── pomodoroStore.ts  # 뽀모도로 타이머 상태
│   │   ├── contactsStore.ts  # 연락처 상태
│   │   ├── quickMemoStore.ts # 메모 상태
│   │   └── repositoryStore.ts # 보관함 상태
│   └── utils/            # 스토어 유틸리티
├── types/                # TypeScript 타입 정의
├── shared/               # 공유 기능 모듈
│   └── features/         # 기능 기반 조직화
├── mobile/               # Capacitor 모바일 앱 파일
├── plugins/              # 커스텀 Capacitor 플러그인
│   └── contact-groups/   # 연락처 그룹 플러그인
├── __tests__/            # 테스트 파일
├── e2e/                  # Playwright E2E 테스트
├── scripts/              # 빌드 및 개발 스크립트
├── .taskmaster/          # Task Master AI 설정
└── docs/                 # 프로젝트 문서
```

## 🎨 디자인 시스템

- **컬러 팔레트**: Tailwind CSS 기본 컬러 + 커스텀 브랜드 컬러
- **타이포그래피**: Inter 폰트 패밀리
- **컴포넌트**: shadcn/ui 기반 일관된 디자인
- **아이콘**: Lucide React 아이콘 라이브러리
- **애니메이션**: Tailwind CSS 트랜지션 및 애니메이션

## 🔒 보안

- **Row Level Security**: Supabase RLS로 사용자별 데이터 격리
- **OAuth 인증**: Google, Kakao 소셜 로그인
- **HTTPS**: 프로덕션 환경에서 SSL/TLS 적용
- **환경 변수**: 민감한 정보 환경 변수로 관리

## 📊 성능 최적화

### 번들 최적화
- **Code Splitting**: 페이지별, 컴포넌트별 동적 로딩
- **Tree Shaking**: 사용하지 않는 코드 자동 제거
- **Bundle Analysis**: `npm run analyze:bundle`로 크기 분석
- **Lazy Loading**: React.lazy()를 활용한 지연 로딩

### 캐싱 전략
- **Dexie.js**: IndexedDB 기반 클라이언트 사이드 캐싱
- **SWR Pattern**: Stale-While-Revalidate 데이터 페칭
- **Optimistic Updates**: 즉시 UI 반영 후 서버 동기화
- **Memory Cache**: Zustand 상태 관리를 통한 메모리 캐싱

### 이미지 및 에셋 최적화
- **Next.js Image**: 자동 WebP 변환 및 Lazy Loading
- **Icon Optimization**: Lucide React SVG 아이콘 최적화
- **Font Optimization**: 시스템 폰트 우선 사용

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5초
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3.5초

## 🔐 보안 및 접근성

### 보안 조치
- **Row Level Security**: Supabase RLS로 데이터 격리
- **JWT 인증**: 안전한 토큰 기반 인증
- **OAuth 2.0**: Google, Kakao 소셜 로그인
- **HTTPS 강제**: 프로덕션 환경 SSL/TLS 적용
- **CSP Headers**: Content Security Policy 헤더 설정

### 접근성 (WCAG 2.1 AA)
- **키보드 네비게이션**: 모든 인터랙션 키보드로 접근 가능
- **스크린 리더**: ARIA 레이블 및 랜드마크 구현
- **색상 대비**: 4.5:1 이상 색상 대비율 유지
- **포커스 관리**: 명확한 포커스 인디케이터
- **시맨틱 HTML**: 의미있는 HTML 구조 사용

## 🛠️ 개발 환경 특징

### 크로스 플랫폼 개발
- **환경 분리**: `BUILD_TARGET=web|mobile` 환경별 빌드
- **조건부 렌더링**: 플랫폼별 컴포넌트 분기
- **하이드레이션 최적화**: SSR/SPA 모드 전환
- **네이티브 API 통합**: Capacitor 플러그인 활용

### 개발자 경험 (DX)
- **Hot Reload**: 실시간 코드 변경 반영
- **TypeScript**: 타입 안전성 및 IntelliSense
- **ESLint + Prettier**: 코드 품질 및 일관성
- **Component Storybook**: UI 컴포넌트 문서화 (준비 중)
- **VSCode Integration**: 최적화된 개발 환경 설정

### CI/CD 파이프라인
- **GitHub Actions**: 자동화된 테스트 및 빌드
- **Vercel 배포**: 자동 웹 배포 및 프리뷰
- **모바일 빌드**: 자동화된 iOS/Android 빌드 (준비 중)
- **코드 품질 검사**: ESLint, TypeScript, 테스트 자동 실행

## 🎯 핵심 아키텍처 패턴

### 상태 관리 패턴
- **Zustand Store**: 각 도메인별 독립적 상태 관리
- **Optimistic UI**: 사용자 경험 향상을 위한 낙관적 업데이트
- **Persistence**: 로컬 스토리지 기반 상태 지속성
- **Immer Integration**: 불변성 관리 최적화

### 환경별 빌드 시스템
- **웹 빌드**: SSR, ISR, Static Generation 최적화
- **모바일 빌드**: SPA 모드, Capacitor WebView 최적화
- **조건부 코드**: 환경별 기능 분기 처리
- **성능 최적화**: 각 환경에 특화된 최적화 적용

### 데이터베이스 접근 패턴
- **웹**: 직접 Supabase 클라이언트 사용
- **모바일**: JWT 방식의 `supabaseWebViewHelper` 활용
- **실시간 동기화**: Supabase Realtime 구독
- **오프라인 지원**: Dexie.js 기반 로컬 데이터베이스

## 🔄 데이터 플로우

### 할일 관리 플로우
```
사용자 입력 → todoStore → Optimistic Update → UI 반영
            ↓
      Supabase API → 서버 검증 → 실시간 동기화 → 모든 클라이언트 업데이트
```

### 인증 플로우
```
OAuth 로그인 → Supabase Auth → JWT 토큰 → authStore
              ↓
         Capacitor Preferences (모바일) → 세션 지속성
```

### 실시간 동기화 플로우
```
데이터 변경 → Supabase Realtime → WebSocket → Store 업데이트 → UI 리렌더링
```

## ✅ 테스트 전략

### 테스트 피라미드
- **단위 테스트 (Unit Tests)**: Jest + Testing Library
  - 개별 컴포넌트 및 함수 테스트
  - 비즈니스 로직 검증
  - Store 상태 관리 테스트
  - 목표: 80% 이상 커버리지

- **통합 테스트 (Integration Tests)**:
  - 컴포넌트 간 상호작용 테스트
  - API 통합 테스트
  - 데이터베이스 연동 테스트

- **E2E 테스트 (End-to-End Tests)**: Playwright
  - 전체 사용자 플로우 테스트
  - 크로스 브라우저 테스트
  - 모바일 환경 테스트
  - 시각적 회귀 테스트

### 테스트 도구
- **Jest**: JavaScript 테스트 프레임워크
- **Testing Library**: React 컴포넌트 테스트
- **Playwright**: E2E 테스트 및 브라우저 자동화
- **MSW**: API 모킹 및 테스트 더블

### 품질 게이트
- **타입 체크**: TypeScript 컴파일러
- **린팅**: ESLint + Next.js 규칙
- **포맷팅**: Prettier 자동 코드 정리
- **빌드 검증**: 프로덕션 빌드 성공 확인

## 📈 SEO & 접근성

- **메타 태그**: 각 페이지별 최적화된 메타데이터
- **구조화 데이터**: JSON-LD 스키마 마크업
- **Sitemap**: 자동 생성되는 sitemap.xml
- **접근성**: WCAG 2.1 AA 준수, 키보드 네비게이션
- **성능**: Core Web Vitals 모니터링

## 📚 개발자 문서

### 📋 종합 문서
- **[아키텍처 가이드](./docs/ARCHITECTURE.md)** - 시스템 설계 및 구조 상세 설명
- **[개발 워크플로우](./docs/DEVELOPMENT_WORKFLOW.md)** - 개발 환경 설정 및 작업 프로세스
- **[배포 가이드](./DEPLOYMENT.md)** - 프로덕션 배포 절차

### 🔧 API 문서
- **[Custom Hooks API](./docs/HOOKS_API.md)** - 커스텀 훅 사용법 및 API 레퍼런스
- **[Timeline Components](./docs/TIMELINE_COMPONENTS.md)** - 타임라인 컴포넌트 상세 문서

### 🛠️ 설정 가이드
- **[OAuth 설정](./docs/oauth-setup.md)** - 소셜 로그인 설정 방법
- **[Smart App Banner](./docs/SMART_APP_BANNER_SETUP.md)** - 모바일 앱 배너 설정
- **[Migration Guide](./docs/MIGRATION_GUIDE.md)** - 버전 업그레이드 가이드

### 📱 모바일 개발
- **[모바일 개발 계획](./MOBILE_DEVELOPMENT_PLAN.md)** - Capacitor 기반 하이브리드 앱 개발
- **[IP 자동 설정](./docs/IP-AUTO-SETUP.md)** - 개발 환경 네트워크 설정

## 🤝 기여하기

이 프로젝트는 Task Master AI와 Claude Code를 활용하여 개발되었습니다. 기여를 원하시는 경우:

1. **개발 환경 설정**: [개발 워크플로우 가이드](./docs/DEVELOPMENT_WORKFLOW.md) 참조
2. **아키텍처 이해**: [아키텍처 문서](./docs/ARCHITECTURE.md)를 통한 시스템 구조 파악
3. **컴포넌트 개발**: [Timeline Components](./docs/TIMELINE_COMPONENTS.md) 문서 참고
4. **커스텀 훅 개발**: [Hooks API](./docs/HOOKS_API.md) 문서 참고

### 개발자 빠른 시작
```bash
# 1. 저장소 클론 및 의존성 설치
git clone https://github.com/JongHanNa/DayStep.git
cd DayStep && npm install

# 2. 환경 변수 설정 (.env.local)
cp .env.example .env.local

# 3. 개발 서버 실행
npm run dev

# 4. 테스트 실행
npm test
```

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 제공됩니다.

---

**🎯 DayStep - 체계적인 목표 달성을 위한 개인 생산성 도구**
