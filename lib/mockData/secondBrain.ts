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
    icon: '💼',
    color: '#DBAC6C',
    status: 'area',
    is_pinned: false,
    order_index: 0,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'area-2',
    user_id: MOCK_USER_ID,
    title: '가족',
    icon: '👨‍👩‍👧',
    color: '#E07A5F',
    status: 'area',
    is_pinned: false,
    order_index: 1,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'area-3',
    user_id: MOCK_USER_ID,
    title: '건강',
    icon: '🏃',
    color: '#6B9080',
    status: 'area',
    is_pinned: false,
    order_index: 2,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'area-4',
    user_id: MOCK_USER_ID,
    title: '재테크',
    icon: '💰',
    color: '#F4A261',
    status: 'area',
    is_pinned: false,
    order_index: 3,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'area-5',
    user_id: MOCK_USER_ID,
    title: '사이드 프로젝트',
    icon: '📝',
    color: '#8E44AD',
    status: 'archived',
    is_pinned: false,
    order_index: 4,
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
    icon: '📚',
    color: '#81B29A',
    status: 'resource',
    is_pinned: false,
    order_index: 0,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'resource-2',
    user_id: MOCK_USER_ID,
    title: '프로그래밍',
    icon: '💻',
    color: '#2A9D8F',
    status: 'resource',
    is_pinned: false,
    order_index: 1,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString(),
  },
];

// ============================================
// 목표 (Goals) - 4개 (수집함 테스트용 3개 포함)
// ============================================
export const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    user_id: MOCK_USER_ID,
    title: '앱 출시하기',
    description: 'DayStep 앱을 6개월 내 출시하여 월 500만원 부수입 달성',
    area_id: 'area-1',
    end_date: new Date('2025-12-31').toISOString(),
    year_goal: 2025,
    icon: '🚀',
    color: '#E07A5F',
    status: 'in_progress',
    progress: 33,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-10-10').toISOString(),
  },
  // 수집함 테스트용: 영역/자원, 종료일 미배정
  {
    id: 'goal-inbox-1',
    user_id: MOCK_USER_ID,
    title: '건강한 라이프스타일 만들기',
    description: '꾸준한 운동과 식단 관리로 건강 개선',
    // area_id, resource_id, end_date 없음 (수집함 조건)
    icon: 'lucide-Heart',
    color: '#6B9080',
    status: 'not_started',
    progress: 0,
    created_at: new Date('2025-10-20').toISOString(),
    updated_at: new Date('2025-10-20').toISOString(),
  },
  {
    id: 'goal-inbox-2',
    user_id: MOCK_USER_ID,
    title: '새로운 기술 스택 마스터하기',
    description: 'Next.js 15와 React 19 심화 학습',
    // area_id, resource_id, end_date 없음 (수집함 조건)
    quarter_goal: 'Q4',
    icon: 'lucide-Code',
    color: '#2A9D8F',
    status: 'not_started',
    progress: 0,
    created_at: new Date('2025-10-21').toISOString(),
    updated_at: new Date('2025-10-21').toISOString(),
  },
  {
    id: 'goal-inbox-3',
    user_id: MOCK_USER_ID,
    title: '경제적 자유 달성',
    description: '투자 포트폴리오 다각화 및 수익률 개선',
    // area_id, resource_id, end_date 없음 (수집함 조건)
    icon: 'lucide-TrendingUp',
    color: '#F4A261',
    status: 'not_started',
    progress: 0,
    created_at: new Date('2025-10-22').toISOString(),
    updated_at: new Date('2025-10-22').toISOString(),
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
    start_date: new Date('2025-01-01').toISOString(),
    end_date: new Date('2025-01-14').toISOString(),
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
    status: 'in_progress',
    start_date: new Date('2025-10-01').toISOString(),
    end_date: new Date('2025-11-15').toISOString(),
    icon: '🎨',
    color: '#F4A261',
    order_index: 1,
    total_todos: 5,
    completed_todos: 3,
    progress: 60,
    created_at: new Date('2025-10-01').toISOString(),
    updated_at: new Date('2025-10-25').toISOString(),
  },
  {
    id: 'project-3',
    user_id: MOCK_USER_ID,
    title: '개발',
    description: 'Second Brain 시스템 개발',
    status: 'not_started',
    start_date: new Date('2025-11-16').toISOString(),
    end_date: new Date('2026-02-16').toISOString(),
    icon: '⚙️',
    color: '#2A9D8F',
    order_index: 2,
    total_todos: 0,
    completed_todos: 0,
    progress: 0,
    created_at: new Date('2025-10-25').toISOString(),
    updated_at: new Date('2025-10-25').toISOString(),
  },
];

// ============================================
// 프로젝트 할일 (Project Todos) - 8개
// ============================================
export const mockProjectTodos = [
  // 기획 프로젝트 할일 (3개, 모두 완료)
  {
    id: 'project-todo-1',
    project_id: 'project-1',
    title: '요구사항 분석',
    completed: true,
    scheduledDate: new Date('2025-01-03').toISOString(),
    displayOrder: 0,
    isHighlight: false,
  },
  {
    id: 'project-todo-2',
    project_id: 'project-1',
    title: '사용자 스토리 작성',
    completed: true,
    scheduledDate: new Date('2025-01-07').toISOString(),
    displayOrder: 1,
    isHighlight: false,
  },
  {
    id: 'project-todo-3',
    project_id: 'project-1',
    title: '기술 스택 선정',
    completed: true,
    scheduledDate: new Date('2025-01-12').toISOString(),
    displayOrder: 2,
    isHighlight: true,
  },

  // 디자인 프로젝트 할일 (5개, 3개 완료 + 2개 미완료)
  {
    id: 'project-todo-4',
    project_id: 'project-2',
    title: '와이어프레임 작성',
    completed: true,
    scheduledDate: new Date('2025-10-05').toISOString(),
    displayOrder: 0,
    isHighlight: false,
  },
  {
    id: 'project-todo-5',
    project_id: 'project-2',
    title: '프로토타입 제작',
    completed: true,
    scheduledDate: new Date('2025-10-12').toISOString(),
    displayOrder: 1,
    isHighlight: true,
  },
  {
    id: 'project-todo-6',
    project_id: 'project-2',
    title: '사용자 테스트',
    completed: true,
    scheduledDate: new Date('2025-10-18').toISOString(),
    displayOrder: 2,
    isHighlight: false,
  },
  {
    id: 'project-todo-7',
    project_id: 'project-2',
    title: '디자인 시스템 구축',
    completed: false,
    scheduledDate: new Date('2025-10-29').toISOString(),
    displayOrder: 3,
    isHighlight: false,
    clarification: '일정',
  },
  {
    id: 'project-todo-8',
    project_id: 'project-2',
    title: '아이콘 디자인',
    completed: false,
    scheduledDate: new Date('2025-11-05').toISOString(),
    displayOrder: 4,
    isHighlight: false,
    clarification: '일정',
  },
];

// ============================================
// Inbox 아이템 - 20개 (기존 12개 + 프로젝트 할일 8개)
// ============================================
export const mockInboxItems: InboxItem[] = [
  // ========== 프로젝트 할일 8개 (기획 프로젝트 3개 + 디자인 프로젝트 5개) ==========
  // 기획 프로젝트 할일 (3개, 모두 완료)
  {
    id: 'project-todo-1',
    user_id: MOCK_USER_ID,
    content: '요구사항 분석',
    status: 'schedule_clear',
    item_type: 'todo',
    project_id: 'project-1',
    is_completed: true,
    scheduled_date: new Date('2025-01-03').toISOString(),
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-03').toISOString(),
  },
  {
    id: 'project-todo-2',
    user_id: MOCK_USER_ID,
    content: '사용자 스토리 작성',
    status: 'schedule_clear',
    item_type: 'todo',
    project_id: 'project-1',
    is_completed: true,
    scheduled_date: new Date('2025-01-07').toISOString(),
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-07').toISOString(),
  },
  {
    id: 'project-todo-3',
    user_id: MOCK_USER_ID,
    content: '기술 스택 선정',
    status: 'schedule_clear',
    item_type: 'todo',
    project_id: 'project-1',
    is_completed: true,
    is_highlight: true,
    scheduled_date: new Date('2025-01-12').toISOString(),
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-12').toISOString(),
  },

  // 디자인 프로젝트 할일 (5개, 3개 완료 + 2개 미완료)
  {
    id: 'project-todo-4',
    user_id: MOCK_USER_ID,
    content: '와이어프레임 작성',
    status: 'schedule_clear',
    item_type: 'todo',
    project_id: 'project-2',
    is_completed: true,
    scheduled_date: new Date('2025-10-05').toISOString(),
    created_at: new Date('2025-10-01').toISOString(),
    updated_at: new Date('2025-10-05').toISOString(),
  },
  {
    id: 'project-todo-5',
    user_id: MOCK_USER_ID,
    content: '프로토타입 제작',
    status: 'schedule_clear',
    item_type: 'todo',
    project_id: 'project-2',
    is_completed: true,
    is_highlight: true,
    scheduled_date: new Date('2025-10-12').toISOString(),
    created_at: new Date('2025-10-01').toISOString(),
    updated_at: new Date('2025-10-12').toISOString(),
  },
  {
    id: 'project-todo-6',
    user_id: MOCK_USER_ID,
    content: '사용자 테스트',
    status: 'schedule_clear',
    item_type: 'todo',
    project_id: 'project-2',
    is_completed: true,
    scheduled_date: new Date('2025-10-18').toISOString(),
    created_at: new Date('2025-10-01').toISOString(),
    updated_at: new Date('2025-10-18').toISOString(),
  },
  {
    id: 'project-todo-7',
    user_id: MOCK_USER_ID,
    content: '디자인 시스템 구축',
    status: 'schedule_clear',
    item_type: 'todo',
    project_id: 'project-2',
    is_completed: false,
    scheduled_date: new Date('2025-10-29').toISOString(),
    clarification: '일정',
    created_at: new Date('2025-10-01').toISOString(),
    updated_at: new Date('2025-10-25').toISOString(),
  },
  {
    id: 'project-todo-8',
    user_id: MOCK_USER_ID,
    content: '아이콘 디자인',
    status: 'schedule_clear',
    item_type: 'todo',
    project_id: 'project-2',
    is_completed: false,
    scheduled_date: new Date('2025-11-05').toISOString(),
    clarification: '일정',
    created_at: new Date('2025-10-01').toISOString(),
    updated_at: new Date('2025-10-25').toISOString(),
  },

  // ========== 기존 Inbox 할일 12개 ==========
  {
    id: 'inbox-1',
    user_id: MOCK_USER_ID,
    content: '회의 자료 준비',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-2',
    user_id: MOCK_USER_ID,
    content: '블로그 아이디어: 세컨드 브레인 활용법',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 어제
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-3',
    user_id: MOCK_USER_ID,
    content: '책 구매: Atomic Habits',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-4',
    user_id: MOCK_USER_ID,
    content: 'UX 리서치 자료 정리',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-5',
    user_id: MOCK_USER_ID,
    content: '건강검진 예약',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-6',
    user_id: MOCK_USER_ID,
    content: 'Next.js 15 튜토리얼 보기',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 전
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-7',
    user_id: MOCK_USER_ID,
    content: '디자인 시스템 가이드 작성',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-8',
    user_id: MOCK_USER_ID,
    content: '운동 루틴 재설계',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-9',
    user_id: MOCK_USER_ID,
    content: '투자 포트폴리오 리밸런싱',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-10',
    user_id: MOCK_USER_ID,
    content: '주말 가족 여행 계획',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 전
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-11',
    user_id: MOCK_USER_ID,
    content: 'Supabase 마이그레이션 스크립트 작성',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-12',
    user_id: MOCK_USER_ID,
    content: 'Playwright E2E 테스트 추가',
    status: 'inbox',
    item_type: 'todo',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // ============================================
  // 프로젝트 수집함 (영역, 자원, 할일, 종료일 미배정)
  // ============================================
  {
    id: 'inbox-project-1',
    user_id: MOCK_USER_ID,
    content: '집 정리 프로젝트',
    status: 'inbox',
    item_type: 'project',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-project-2',
    user_id: MOCK_USER_ID,
    content: '새로운 앱 아이디어',
    status: 'inbox',
    item_type: 'project',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4일 전
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-project-3',
    user_id: MOCK_USER_ID,
    content: '여름 휴가 준비',
    status: 'inbox',
    item_type: 'project',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6일 전
    updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // ============================================
  // 노트 수집함 (영역, 자원 미배정) - 테스트용
  // ============================================
  {
    id: 'inbox-note-1',
    user_id: MOCK_USER_ID,
    content: 'React 19의 새로운 Hooks 정리',
    status: 'inbox',
    item_type: 'note',
    note_title: 'React 19의 새로운 Hooks 정리',
    note_content: 'use() Hook과 Actions에 대해 학습한 내용을 정리해야 함. 공식 문서와 예제 코드 참고.',
    note_category: '중간 작업물',
    is_pinned: false,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1일 전
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-note-2',
    user_id: MOCK_USER_ID,
    content: 'Next.js 15 서버 컴포넌트 예제',
    status: 'inbox',
    item_type: 'note',
    note_title: 'Next.js 15 서버 컴포넌트 예제',
    note_content: '서버 컴포넌트와 클라이언트 컴포넌트 차이점, 데이터 페칭 패턴, 스트리밍 등 핵심 개념 정리.',
    note_category: '레퍼런스',
    is_pinned: false,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 전
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inbox-note-3',
    user_id: MOCK_USER_ID,
    content: 'GTD 워크플로우 체크리스트',
    status: 'inbox',
    item_type: 'note',
    note_title: 'GTD 워크플로우 체크리스트',
    note_content: '주간 점검 시 확인할 항목: 수집함 비우기, 다음 행동 정리, 대기중 항목 확인, 프로젝트 진행 상태 점검.',
    note_category: '나중에 보기',
    is_pinned: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 전
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
    note_category: 'work_in_progress',
    tags: [],
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
    note_category: 'reference',
    tags: [],
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
    note_category: 'reference',
    resource_id: 'resource-1',
    tags: [],
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
    note_category: 'read_later',
    resource_id: 'resource-2',
    tags: [],
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
    note_category: 'work_in_progress',
    area_id: 'area-1',
    tags: [],
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
    note_category: 'none' as const,
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
    projectTodos: mockProjectTodos,
    onboarding: mockOnboardingProgress,
    reviews: mockReviewSessions,
  };
}

/**
 * Mock 데이터를 LocalStorage에 저장
 */
export function saveMockDataToLocalStorage() {
  if (typeof window === 'undefined') {return;}

  const data = getInitialMockData();
  localStorage.setItem('second-brain-mock-data', JSON.stringify(data));
}

/**
 * LocalStorage에서 Mock 데이터 로드
 */
export function loadMockDataFromLocalStorage() {
  if (typeof window === 'undefined') {return getInitialMockData();}

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
