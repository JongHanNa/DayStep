# DayStep 개발 구조 및 패턴 가이드

> **목적**: 실제 개발 시 필요한 폴더 구조, 코딩 패턴, 아키텍처 결정사항을 담은 실용 가이드

---

## 📋 목차
1. [폴더 구조 상세](#폴더-구조-상세)
2. [핵심 개발 패턴](#핵심-개발-패턴)
3. [환경별 빌드 분기](#환경별-빌드-분기)
4. [상태 관리 패턴](#상태-관리-패턴)
5. [데이터베이스 접근 패턴](#데이터베이스-접근-패턴)
6. [스타일링 시스템](#스타일링-시스템)
7. [컴포넌트 작성 규칙](#컴포넌트-작성-규칙)
8. [개발 워크플로우](#개발-워크플로우)

---

## 폴더 구조 상세

### 전체 구조 (주요 폴더)

```
DayStep/
├── app/                          # Next.js 15 App Router
│   ├── page.tsx                 # 메인 타임라인 페이지 (/)
│   ├── layout.tsx               # 루트 레이아웃
│   ├── globals.css              # CSS 변수 정의 (테마, 색상 팔레트)
│   ├── settings/                # 설정 페이지
│   ├── repository/              # 할일 저장소 페이지
│   ├── context/                 # 컨텍스트 페이지
│   ├── auth/                    # 인증 관련 페이지
│   │   └── callback/            # OAuth 콜백
│   └── api/                     # API 라우트 (웹 전용)
│       ├── auth/                # 인증 API
│       │   ├── google/          # Google OAuth
│       │   └── callback/        # OAuth 콜백
│       └── *.mobile.ts          # 모바일 대체 파일
│
├── components/                   # React 컴포넌트
│   ├── ui/                      # shadcn/ui 재사용 컴포넌트 (30+ 컴포넌트)
│   │   ├── button.tsx           # 버튼
│   │   ├── dialog.tsx           # 다이얼로그/모달
│   │   ├── select.tsx           # 셀렉트 박스
│   │   ├── checkbox.tsx         # 체크박스
│   │   └── ...
│   ├── todos/                   # 할일 관련 컴포넌트
│   │   ├── TodoCard.tsx         # 할일 카드
│   │   ├── TodoForm.tsx         # 할일 생성/수정 폼
│   │   ├── TodoList.tsx         # 할일 리스트
│   │   └── ...
│   ├── timeline/                # 타임라인 컴포넌트
│   │   ├── TimelineView.tsx    # 타임라인 메인 뷰
│   │   ├── TimeSlot.tsx         # 시간 슬롯
│   │   └── ...
│   ├── calendar/                # 캘린더 컴포넌트
│   ├── memos/                   # 메모 컴포넌트
│   ├── layout/                  # 레이아웃 컴포넌트
│   │   ├── Header.tsx           # 헤더
│   │   ├── Navigation.tsx       # 네비게이션
│   │   └── ...
│   ├── providers/               # Context Providers
│   │   ├── ThemeProvider.tsx   # 테마 제공자
│   │   └── ...
│   └── mobile/                  # 모바일 전용 컴포넌트
│
├── state/                        # Zustand 상태 관리
│   ├── stores/                  # 도메인별 스토어
│   │   ├── todoStore.ts         # 할일 상태 (CRUD, 필터링, 정렬)
│   │   ├── timelineStore.ts    # 타임라인 뷰 상태
│   │   ├── authStore.ts         # 인증 상태
│   │   ├── settingsStore.ts    # 앱 설정 (테마, 글꼴, 알림)
│   │   ├── motivationStore.ts  # 동기부여 메시지
│   │   ├── memoTagStore.ts     # 메모 태그
│   │   ├── pomodoroStore.ts    # 포모도로 타이머
│   │   └── ...
│   ├── types/                   # 상태 타입 정의
│   ├── hooks/                   # 상태 관련 커스텀 훅
│   └── utils/                   # 상태 유틸리티
│
├── lib/                          # 유틸리티 및 라이브러리
│   ├── supabase.ts              # Supabase 클라이언트 (웹)
│   ├── supabaseWebViewHelper.ts # JWT 기반 DB 접근 (웹/모바일 통합)
│   ├── auth.ts                  # 인증 로직
│   ├── date-utils.ts            # 날짜 유틸 (date-fns 래퍼)
│   ├── time-utils.ts            # 시간 유틸
│   ├── timezone-utils.ts        # 타임존 관리
│   ├── utils.ts                 # 공통 유틸 (cn, clsx)
│   ├── theme-colors.ts          # 테마 색상 관리
│   ├── constants.ts             # 전역 상수
│   └── ...
│
├── hooks/                        # 커스텀 React 훅 (30+ 훅)
│   ├── useTodoFormState.ts     # 할일 폼 상태 관리
│   ├── useTodoFormHandlers.ts  # 할일 폼 핸들러
│   ├── useDragAndDrop.ts       # 드래그앤드롭 로직
│   ├── useNotification.ts      # 알림 관리
│   ├── useTheme.ts             # 테마 토글
│   ├── useAutoSave.ts          # 자동 저장
│   ├── use-toast.ts            # 토스트 알림
│   └── ...
│
├── types/                        # TypeScript 타입 정의
│   ├── index.ts                 # 공통 타입 (Todo, User, Category 등)
│   ├── todo.ts                  # 할일 관련 타입
│   ├── memo.ts                  # 메모 관련 타입
│   ├── motivation.ts            # 동기부여 관련 타입
│   └── ...
│
├── mobile/                       # Capacitor 네이티브 프로젝트
│   ├── ios/                     # iOS 네이티브 코드
│   ├── android/                 # Android 네이티브 코드
│   └── capacitor.config.ts     # Capacitor 설정
│
├── scripts/                      # 빌드 및 유틸 스크립트
│   ├── setup-dev-ip.js         # 개발 IP 자동 설정
│   ├── mobile-build-with-hotreload.js  # 모바일 핫리로드
│   ├── validate-build.js       # 빌드 검증
│   └── ...
│
├── styles/                       # CSS 파일
│   ├── animations.css          # 애니메이션 정의
│   ├── platform.css            # 플랫폼별 스타일
│   ├── bottom-sheet.css        # 바텀시트 스타일
│   └── memo-markdown.css       # 마크다운 렌더링 스타일
│
├── next.config.ts               # Next.js 설정 (웹/모바일 분기)
├── tailwind.config.ts           # Tailwind 설정 (DaisyUI 통합)
├── tsconfig.json                # TypeScript 설정
├── package.json                 # 의존성 및 스크립트
└── CLAUDE.md                    # AI 에이전트 가이드
```

### 폴더별 역할

| 폴더 | 파일 개수 | 주요 역할 | 주의사항 |
|------|-----------|-----------|----------|
| `app/` | 20+ | Next.js 라우팅, 페이지 | 환경별 분기 필수 |
| `components/ui/` | 30+ | 재사용 컴포넌트 | shadcn/ui 기반 |
| `components/todos/` | 15+ | 할일 UI | 드래그앤드롭 포함 |
| `components/timeline/` | 10+ | 타임라인 UI | 시간 슬롯 렌더링 |
| `state/stores/` | 12+ | Zustand 스토어 | Optimistic updates |
| `lib/` | 30+ | 비즈니스 로직 | supabaseWebViewHelper 필수 |
| `hooks/` | 30+ | 커스텀 훅 | 재사용성 중심 |
| `types/` | 10+ | 타입 정의 | 중앙 집중화 |

---

## 핵심 개발 패턴

### 1. 환경별 빌드 분기 패턴

#### Next.js 설정 (`next.config.ts`)

```typescript
const buildTarget = process.env.BUILD_TARGET || 'web';
const isMobileBuild = buildTarget === 'mobile';
const isWebBuild = buildTarget === 'web';

const nextConfig: NextConfig = {
  // 모바일 전용 설정
  ...(isMobileBuild && {
    output: 'export',          // 정적 HTML 빌드
    distDir: 'out',
    trailingSlash: true,
    reactStrictMode: false,    // WebView 안정성
    eslint: { ignoreDuringBuilds: true },
  }),

  // 웹 전용 설정
  ...(isWebBuild && {
    // output: 'standalone',    // Vercel 배포용 (주석 처리)
    reactStrictMode: false,    // 하이드레이션 에러 방지
    compress: true,
  }),

  // 공통 설정
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
    webpackMemoryOptimizations: true,
  },
};
```

#### 컴포넌트 내 환경 분기

```typescript
'use client';

export function AuthButton() {
  const isMobile = process.env.BUILD_TARGET === 'mobile';

  if (isMobile) {
    // 모바일: Capacitor 플러그인 사용
    return <CapacitorAuthButton />;
  } else {
    // 웹: Supabase OAuth 사용
    return <WebAuthButton />;
  }
}
```

#### API 라우트 대체 (모바일)

```typescript
// app/api/auth/callback/route.ts (웹)
export async function GET(request: Request) {
  // OAuth 콜백 처리
}

// app/api/auth/callback/route.mobile.ts (모바일)
export default function GET() {
  return new Response(JSON.stringify({ message: 'Mobile build - API not available' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

### 2. 데이터베이스 접근 패턴 (JWT 기반)

#### ✅ 올바른 방법: supabaseWebViewHelper 사용

```typescript
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '@/lib/supabaseWebViewHelper';

// 조회
const todos = await fetchTodos(userId);

// 생성
const newTodo = await createTodo({
  title: '할일',
  user_id: userId,
  // ...
});

// 수정
await updateTodo(todoId, { title: '수정된 할일' });

// 삭제
await deleteTodo(todoId);
```

#### ❌ 잘못된 방법: 직접 supabase.from() 호출

```typescript
// 이 방법은 모바일에서 RLS 에러 발생!
import { supabase } from '@/lib/supabase';

const { data } = await supabase
  .from('todos')
  .select('*')
  .eq('user_id', userId);  // RLS 정책 위반 가능
```

#### supabaseWebViewHelper 내부 구조

```typescript
// lib/supabaseWebViewHelper.ts
export async function fetchTodos(userId: string): Promise<Todo[]> {
  // 1. JWT 토큰 가져오기 (Capacitor Preferences 백업)
  const session = await getStoredSession();

  // 2. Supabase REST API 직접 호출
  const response = await fetch(`${SUPABASE_URL}/rest/v1/todos`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  // 3. 응답 파싱 및 반환
  return await response.json();
}
```

---

### 3. 상태 관리 패턴 (Zustand + Optimistic Updates)

#### 스토어 구조

```typescript
// state/stores/todoStore.ts
import { create } from 'zustand';

interface TodoStore {
  // 서버 동기화 상태
  todos: Todo[];

  // 낙관적 업데이트 상태
  optimisticState: Todo[];

  // 로딩 상태
  isLoading: boolean;

  // CRUD 액션
  fetchTodos: () => Promise<void>;
  addTodo: (todo: TodoInput) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  optimisticState: [],
  isLoading: false,

  fetchTodos: async () => {
    set({ isLoading: true });
    const todos = await fetchTodosFromDB();
    set({ todos, optimisticState: todos, isLoading: false });
  },

  addTodo: async (todoInput) => {
    const tempTodo = { ...todoInput, id: crypto.randomUUID() };

    // 1. 낙관적 업데이트 (즉시 UI 반영)
    set((state) => ({
      optimisticState: [...state.optimisticState, tempTodo]
    }));

    try {
      // 2. 서버 요청
      const newTodo = await createTodoInDB(todoInput);

      // 3. 성공 시 서버 응답으로 동기화
      set((state) => ({
        todos: [...state.todos, newTodo],
        optimisticState: [...state.todos, newTodo],
      }));
    } catch (error) {
      // 4. 실패 시 롤백
      set((state) => ({
        optimisticState: state.todos
      }));
      throw error;
    }
  },

  updateTodo: async (id, updates) => {
    // 1. 낙관적 업데이트
    set((state) => ({
      optimisticState: state.optimisticState.map(todo =>
        todo.id === id ? { ...todo, ...updates } : todo
      )
    }));

    try {
      // 2. 서버 요청
      const updatedTodo = await updateTodoInDB(id, updates);

      // 3. 성공 시 동기화
      set((state) => ({
        todos: state.todos.map(todo => todo.id === id ? updatedTodo : todo),
        optimisticState: state.todos.map(todo => todo.id === id ? updatedTodo : todo),
      }));
    } catch (error) {
      // 4. 실패 시 롤백
      set((state) => ({
        optimisticState: state.todos
      }));
      throw error;
    }
  },
}));
```

#### 컴포넌트에서 사용

```typescript
'use client';

export function TodoList() {
  const { optimisticState, addTodo, updateTodo } = useTodoStore();

  // optimisticState를 렌더링 (낙관적 업데이트 반영)
  return (
    <div>
      {optimisticState.map(todo => (
        <TodoCard key={todo.id} todo={todo} onUpdate={updateTodo} />
      ))}
    </div>
  );
}
```

---

### 4. 스타일링 시스템 (Single Source of Truth)

#### CSS 변수 계층 구조

```
app/globals.css (브랜드 색상 팔레트 정의)
    ↓
tailwind.config.ts (Tailwind 통합)
    ↓
컴포넌트 (Tailwind 클래스 사용)
```

#### app/globals.css (색상 정의)

```css
:root {
  /* 기본 색상 팔레트 (HSL 형식) */
  --background: 0 0% 100%;        /* #ffffff */
  --foreground: 222 47% 11%;      /* #0f172a */

  --primary: 215 17% 35%;         /* 다크 올리브 그린 */
  --primary-foreground: 0 0% 100%; /* 흰색 */

  --accent: 210 40% 96%;          /* 연한 회색 */
  --accent-foreground: 222 47% 11%;

  /* 상태 색상 */
  --status-completed: 142 71% 45%; /* 녹색 */
  --status-in-progress: 25 95% 53%; /* 주황색 */
  --status-pending: 217 91% 60%;   /* 파란색 */
}

.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  --primary: 220 9% 46%;
  /* ... */
}
```

#### tailwind.config.ts (Tailwind 통합)

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        status: {
          completed: "hsl(var(--status-completed))",
          'in-progress': "hsl(var(--status-in-progress))",
          pending: "hsl(var(--status-pending))",
        },
      },
    },
  },
} satisfies Config;
```

#### 컴포넌트에서 사용

```tsx
// ✅ 올바른 방법
<button className="bg-primary text-primary-foreground">
  완료
</button>

<div className="bg-status-completed">
  완료됨
</div>

// ❌ 잘못된 방법
<button style={{ background: '#3B82F6' }}>완료</button>
<div className="bg-[#22c55e]">완료됨</div>
```

---

### 5. 컴포넌트 작성 패턴

#### 기본 구조

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTodoStore } from '@/state/stores/todoStore';
import { cn } from '@/lib/utils';

interface TodoCardProps {
  todo: Todo;
  onUpdate?: (id: string, updates: Partial<Todo>) => void;
}

export function TodoCard({ todo, onUpdate }: TodoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { updateTodo } = useTodoStore();

  const handleComplete = () => {
    updateTodo(todo.id, { is_completed: !todo.is_completed });
    onUpdate?.(todo.id, { is_completed: !todo.is_completed });
  };

  return (
    <div className={cn(
      "rounded-lg border p-4",
      todo.is_completed && "opacity-50"
    )}>
      <h3 className="text-lg font-semibold">{todo.title}</h3>
      <p className="text-muted-foreground">{todo.description}</p>

      <Button onClick={handleComplete} className="btn-primary">
        {todo.is_completed ? '취소' : '완료'}
      </Button>
    </div>
  );
}
```

#### 버튼 패턴

```tsx
// ✅ 올바른 방법
<button className="btn btn-ghost">취소</button>
<button className="btn btn-soft">옵션</button>
<button className="btn btn-primary">완료</button>

// ❌ 잘못된 방법
<button className="btn btn-outline">취소</button> // 테두리 있음
```

#### 아이콘 및 시각 효과 패턴

**Lucide React 아이콘 사용**

```tsx
// ✅ 올바른 방법 - Lucide 아이콘 사용
import { Check, X, Loader2, Plus, Trash2 } from 'lucide-react';

<button className="btn btn-primary">
  <Check className="w-4 h-4 mr-2" />
  완료
</button>

<button className="btn btn-ghost">
  <X className="w-4 h-4 mr-2" />
  취소
</button>

<div className="flex items-center gap-2">
  <Loader2 className="w-4 h-4 animate-spin" />
  로딩 중...
</div>

// ❌ 잘못된 방법 - 기본 이모지 사용
<button className="btn btn-primary">
  ✅ 완료
</button>

<button className="btn btn-ghost">
  ❌ 취소
</button>

<div>🔄 로딩 중...</div>
```

**그라디언트 효과 금지**

```tsx
// ✅ 올바른 방법 - 단색 배경과 CSS 변수
<div className="bg-primary text-primary-foreground rounded-lg p-4">
  콘텐츠
</div>

<button className="bg-accent text-accent-foreground">
  버튼
</button>

<div className="bg-status-completed text-white p-2 rounded">
  완료됨
</div>

// ❌ 잘못된 방법 - 그라디언트 배경
<div className="bg-gradient-to-r from-purple-500 to-pink-500">
  콘텐츠
</div>

<div style={{ background: 'linear-gradient(to right, #3B82F6, #8B5CF6)' }}>
  콘텐츠
</div>

<h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
  제목
</h1>
```

**원칙**:
- 아이콘은 Lucide React만 사용 (일관된 미니멀 디자인)
- 기본 이모지(❌, ✅, 🔄 등) 사용 금지
- 그라디언트 효과 사용 금지 (배경, 텍스트 모두)
- 단색 배경과 CSS 변수(`bg-primary`, `bg-accent` 등)로 구현

---

## 개발 워크플로우

### 1. 신규 기능 개발 (5단계)

1. **요구사항 분석**: UI 기능, 인터랙션, 시각적 효과 파악
2. **라이브러리 탐색**: Perplexity MCP로 최신 라이브러리 비교
3. **공식 문서 확인**: Context7 MCP로 정확한 구현법 확인 (필수)
4. **기존 패턴 탐색**: `components/ui/`, DaisyUI 확인
5. **구현 및 검증**: 웹/모바일 양방향 테스트

### 2. CRUD 작업 체크리스트

- [ ] Capacitor 백업 인증 확인
- [ ] `supabaseWebViewHelper.ts` 사용
- [ ] Optimistic updates 적용
- [ ] 웹/모바일 테스트
- [ ] 필터링은 헬퍼에서만 구현

### 3. 작업 완료 순서

1. 코드 작성
2. 기능 테스트
3. **사용자 검증 요청**
4. git commit
5. 다음 작업

---

**작성일**: 2025-10-10
**버전**: 1.0.0
**유지보수**: 새로운 패턴 추가 시 업데이트 필수
