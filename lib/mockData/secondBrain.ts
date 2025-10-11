/**
 * Second Brain 시스템 Mock 데이터
 *
 * 백엔드 없이 UI/UX 확인을 위한 샘플 데이터
 */

import type {
  Area,
  Resource,
  Project,
  Goal,
  Note,
  InboxItem,
  ReviewSession,
  OnboardingProgress,
} from '@/types/second-brain';

// ============================================
// Mock User ID
// ============================================
export const MOCK_USER_ID = 'mock-user-123';

// ============================================
// 영역 (Areas) - 4개
// ============================================
export const mockAreas: Area[] = [
  {
    id: 'area-1',
    user_id: MOCK_USER_ID,
    title: '직장',
    description: '업무 프로젝트 및 커리어 개발',
    standard: '월 1회 성과 리뷰',
    icon: '💼',
    color: '#DBAC6C',
    order_index: 0,
    is_archived: false,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'area-2',
    user_id: MOCK_USER_ID,
    title: '가족',
    description: '가족 시간 및 이벤트',
    standard: '주 2회 가족 식사',
    icon: '👨‍👩‍👧',
    color: '#E07A5F',
    order_index: 1,
    is_archived: false,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'area-3',
    user_id: MOCK_USER_ID,
    title: '건강',
    description: '운동 및 식단 관리',
    standard: '주 3회 운동',
    icon: '🏃',
    color: '#6B9080',
    order_index: 2,
    is_archived: false,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'area-4',
    user_id: MOCK_USER_ID,
    title: '재테크',
    description: '투자 및 자산 관리',
    standard: '월 1회 포트폴리오 점검',
    icon: '💰',
    color: '#F4A261',
    order_index: 3,
    is_archived: false,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'area-5',
    user_id: MOCK_USER_ID,
    title: '사이드 프로젝트',
    description: '블로그 운영 및 콘텐츠 제작',
    standard: '주 1회 콘텐츠 발행',
    icon: '📝',
    color: '#8E44AD',
    order_index: 4,
    is_archived: true,
    created_at: new Date('2024-06-01').toISOString(),
    updated_at: new Date('2025-01-15').toISOString(),
  },
];

// ============================================
// 자원 (Resources) - 2개
// ============================================
export const mockResources: Resource[] = [
  {
    id: 'resource-1',
    user_id: MOCK_USER_ID,
    title: '독서',
    description: '자기계발 및 비즈니스 서적',
    icon: '📚',
    color: '#81B29A',
    order_index: 0,
    is_archived: false,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'resource-2',
    user_id: MOCK_USER_ID,
    title: '프로그래밍',
    description: 'Next.js, React, TypeScript 학습',
    icon: '💻',
    color: '#2A9D8F',
    order_index: 1,
    is_archived: false,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
];

// ============================================
// 목표 (Goals) - 1개
// ============================================
export const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    user_id: MOCK_USER_ID,
    title: '앱 출시하기',
    description: 'DayStep 앱을 6개월 내 출시하여 월 500만원 부수입 달성',
    area_id: 'area-1',
    timeframe: 'year',
    target_date: new Date('2025-12-31').toISOString(),
    target_year: 2025,
    icon: '🚀',
    color: '#E07A5F',
    status: 'in_progress',
    progress: 33,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-10-10').toISOString(),
  },
];

// ============================================
// 프로젝트 (Projects) - 3개
// ============================================
export const mockProjects: Project[] = [
  {
    id: 'project-1',
    user_id: MOCK_USER_ID,
    title: '기획',
    description: '앱 기획 및 요구사항 정의',
    status: 'completed',
    area_id: 'area-1',
    start_date: new Date('2025-01-01').toISOString(),
    target_end_date: new Date('2025-01-14').toISOString(),
    completed_at: new Date('2025-01-14').toISOString(),
    icon: '📋',
    color: '#6B9080',
    order_index: 0,
    total_todos: 3,
    completed_todos: 3,
    progress: 100,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-14').toISOString(),
  },
  {
    id: 'project-2',
    user_id: MOCK_USER_ID,
    title: '디자인',
    description: 'UI/UX 디자인 및 프로토타입 제작',
    status: 'active',
    area_id: 'area-1',
    start_date: new Date('2025-01-15').toISOString(),
    target_end_date: new Date('2025-02-05').toISOString(),
    icon: '🎨',
    color: '#F4A261',
    order_index: 1,
    total_todos: 5,
    completed_todos: 3,
    progress: 60,
    created_at: new Date('2025-01-15').toISOString(),
    updated_at: new Date('2025-10-10').toISOString(),
  },
  {
    id: 'project-3',
    user_id: MOCK_USER_ID,
    title: '개발',
    description: 'Second Brain 시스템 개발',
    status: 'active',
    area_id: 'area-1',
    start_date: new Date('2025-02-06').toISOString(),
    target_end_date: new Date('2025-04-06').toISOString(),
    icon: '⚙️',
    color: '#2A9D8F',
    order_index: 2,
    total_todos: 0,
    completed_todos: 0,
    progress: 0,
    created_at: new Date('2025-02-06').toISOString(),
    updated_at: new Date('2025-02-06').toISOString(),
  },
];

// ============================================
// Inbox 아이템 - 12개
// ============================================
export const mockInboxItems: InboxItem[] = [
  {
    id: 'inbox-1',
    user_id: MOCK_USER_ID,
    content: '회의 자료 준비',
    status: 'inbox',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-2',
    user_id: MOCK_USER_ID,
    content: '블로그 아이디어: 세컨드 브레인 활용법',
    status: 'inbox',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 어제
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-3',
    user_id: MOCK_USER_ID,
    content: '책 구매: Atomic Habits',
    status: 'inbox',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-4',
    user_id: MOCK_USER_ID,
    content: 'UX 리서치 자료 정리',
    status: 'inbox',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-5',
    user_id: MOCK_USER_ID,
    content: '건강검진 예약',
    status: 'inbox',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-6',
    user_id: MOCK_USER_ID,
    content: 'Next.js 15 튜토리얼 보기',
    status: 'inbox',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 전
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-7',
    user_id: MOCK_USER_ID,
    content: '디자인 시스템 가이드 작성',
    status: 'inbox',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-8',
    user_id: MOCK_USER_ID,
    content: '운동 루틴 재설계',
    status: 'inbox',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-9',
    user_id: MOCK_USER_ID,
    content: '투자 포트폴리오 리밸런싱',
    status: 'inbox',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-10',
    user_id: MOCK_USER_ID,
    content: '주말 가족 여행 계획',
    status: 'inbox',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 전
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-11',
    user_id: MOCK_USER_ID,
    content: 'Supabase 마이그레이션 스크립트 작성',
    status: 'inbox',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-12',
    user_id: MOCK_USER_ID,
    content: 'Playwright E2E 테스트 추가',
    status: 'inbox',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================
// 노트 (Notes) - 15개
// ============================================
export const mockNotes: Note[] = [
  {
    id: 'note-1',
    user_id: MOCK_USER_ID,
    title: '세컨드 브레인 블로그 초안',
    content: `# 세컨드 브레인이란?

세컨드 브레인은 외부 시스템을 통해 우리의 사고를 확장하는 개념입니다.

## 핵심 원칙
- 수집 (Collect)
- 명료화 (Clarify)
- 계획 (Plan)
- 실행 (Do)
- 점검 (Review)

## PARA 시스템
- Projects (프로젝트): 종료일이 있는 목표
- Areas (영역): 지속적인 책임 영역
- Resources (자원): 관심 주제
- Archive (아카이브): 완료된 항목`,
    memo_type: 'work_in_progress',
    project_id: 'project-1',
    tags: ['블로그', '생산성'],
    is_pinned: true,
    created_at: new Date('2025-01-10').toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'note-2',
    user_id: MOCK_USER_ID,
    title: '디자인 시스템 색상 팔레트',
    content: `# 색상 팔레트

## Primary
- #DBAC6C (브랜드 색상)
- #6B9080 (보조 색상)

## 상태 색상
- Success: #22c55e
- Error: #ef4444
- Warning: #f97316`,
    memo_type: 'reference',
    project_id: 'project-2',
    tags: ['디자인', '색상'],
    is_pinned: false,
    created_at: new Date('2025-01-20').toISOString(),
    updated_at: new Date('2025-01-20').toISOString(),
  },
  {
    id: 'note-3',
    user_id: MOCK_USER_ID,
    title: 'Getting Things Done 핵심 요약',
    content: `# GTD 방법론

## 5단계
1. Capture (수집)
2. Clarify (명료화)
3. Organize (정리)
4. Reflect (점검)
5. Engage (실행)

## 2분 규칙
2분 이내 할 수 있으면 즉시 실행`,
    memo_type: 'reference',
    resource_id: 'resource-1',
    tags: ['생산성', 'GTD'],
    is_pinned: false,
    created_at: new Date('2025-01-05').toISOString(),
    updated_at: new Date('2025-01-05').toISOString(),
  },
  {
    id: 'note-4',
    user_id: MOCK_USER_ID,
    title: 'React 19 새로운 기능',
    content: `# React 19 주요 변경사항

- Actions
- use() Hook
- Improved Server Components
- Asset Loading

참고: https://react.dev/blog/2025/01/01/react-19`,
    memo_type: 'read_later',
    resource_id: 'resource-2',
    tags: ['React', '프로그래밍'],
    is_pinned: false,
    created_at: new Date('2025-02-01').toISOString(),
    updated_at: new Date('2025-02-01').toISOString(),
  },
  {
    id: 'note-5',
    user_id: MOCK_USER_ID,
    title: '프로젝트 마일스톤',
    content: `# 앱 출시 마일스톤

## Q1 (1-3월)
- ✅ 기획 완료
- 🔄 디자인 60% 진행중

## Q2 (4-6월)
- 개발 (예정)
- 테스트 (예정)

## Q3 (7-9월)
- 베타 테스트
- 마케팅 준비`,
    memo_type: 'work_in_progress',
    area_id: 'area-1',
    tags: ['마일스톤', '계획'],
    is_pinned: true,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-10-10').toISOString(),
  },
  // 추가 노트 10개 (간략하게)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `note-${i + 6}`,
    user_id: MOCK_USER_ID,
    title: `노트 ${i + 6}`,
    content: `샘플 노트 내용 ${i + 6}`,
    memo_type: 'note' as const,
    tags: [],
    is_pinned: false,
    created_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
  })),
];

// ============================================
// 온보딩 진행 상태
// ============================================
export const mockOnboardingProgress: OnboardingProgress = {
  id: 'onboarding-1',
  user_id: MOCK_USER_ID,
  step_1_areas: false,
  step_2_resources: false,
  step_3_goals: false,
  step_4_projects: false,
  step_5_todos: false,
  completed: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================
// 점검 세션 (샘플)
// ============================================
export const mockReviewSessions: ReviewSession[] = [
  {
    id: 'review-1',
    user_id: MOCK_USER_ID,
    review_type: 'weekly',
    review_date: new Date('2025-10-07').toISOString(),
    inbox_cleared: true,
    next_actions_reviewed: true,
    waiting_for_reviewed: true,
    projects_reviewed: true,
    someday_reviewed: false,
    notes: '이번 주는 디자인 프로젝트에 집중',
    completed_at: new Date('2025-10-07T15:30:00').toISOString(),
    duration_minutes: 45,
    created_at: new Date('2025-10-07').toISOString(),
    updated_at: new Date('2025-10-07').toISOString(),
  },
];

// ============================================
// Mock 데이터 초기화 함수
// ============================================
export function getInitialMockData() {
  return {
    areas: mockAreas,
    resources: mockResources,
    projects: mockProjects,
    goals: mockGoals,
    inbox: mockInboxItems,
    notes: mockNotes,
    onboarding: mockOnboardingProgress,
    reviews: mockReviewSessions,
  };
}

/**
 * Mock 데이터를 LocalStorage에 저장
 */
export function saveMockDataToLocalStorage() {
  if (typeof window === 'undefined') return;

  const data = getInitialMockData();
  localStorage.setItem('second-brain-mock-data', JSON.stringify(data));
}

/**
 * LocalStorage에서 Mock 데이터 로드
 */
export function loadMockDataFromLocalStorage() {
  if (typeof window === 'undefined') return getInitialMockData();

  const stored = localStorage.getItem('second-brain-mock-data');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getInitialMockData();
    }
  }

  return getInitialMockData();
}
