/**
 * 추천 항목 데이터
 *
 * 처음 사용하는 한국인 사용자를 위한 라이프스타일 기반 템플릿
 */

import type { GraphNodeType } from '@/types/graph';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/graph-utils';
import type { LucideIcon } from 'lucide-react';
import { addDays, startOfDay, format, setHours, setMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  // Area 아이콘
  Heart,
  Wallet,
  GraduationCap,
  Users,
  Briefcase,
  Palette,
  // Resource 아이콘
  Clock,
  Zap,
  DollarSign,
  BookOpen,
  Network,
  // Goal 아이콘
  Scale,
  PiggyBank,
  Languages,
  Dumbbell,
  Target,
  Smile,
  Timer,
  // Project 아이콘
  Salad,
  TrendingUp,
  Award,
  Plane,
  CalendarDays,
  Code,
  Sunrise,
  Sparkles,
  // Todo 아이콘
  Sun,
  Receipt,
  Book,
  UtensilsCrossed,
  Laptop,
  Activity,
  Coffee,
  // Note 아이콘
  FileText,
  Lightbulb,
  ClipboardList,
} from 'lucide-react';

// ============================================
// 타입 정의
// ============================================

export interface RecommendationItem {
  id: string;
  type: GraphNodeType;
  title: string;
  icon: LucideIcon;
  color: string;
  category?: string;
  parentId?: string; // 부모 항목 ID (관계 설정용)
  // 날짜/시간 설정 (동적 생성용)
  dateConfig?: {
    startOffset?: number;  // 오늘로부터 시작일 오프셋 (일)
    endOffset?: number;    // 오늘로부터 종료일 오프셋 (일)
    time?: string;         // "HH:MM" 형식
  };
  progress?: number; // 0-100 진행률
  childCount?: number; // 하위 항목 수 힌트 (예: "목표 3개 포함")
  // 반복 설정 (Todo 전용)
  recurrenceConfig?: {
    pattern: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;           // 반복 간격
    daysOfWeek?: number[];       // [0-6] (일=0, 월=1, ...)
    dayOfMonth?: number;         // 1-31
    endOffset?: number;          // 오늘로부터 반복 종료일 오프셋 (일)
  };
}

// 트리 구조 노드 타입
export interface TreeNode extends RecommendationItem {
  children: TreeNode[];
  depth: number;
}

export interface RecommendationCategory {
  type: GraphNodeType;
  label: string;
  description?: string;
  items: RecommendationItem[];
}

export interface RecommendationSet {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  color: string;
  items: RecommendationItem[];  // 계층적으로 연결된 항목들 (Area/Resource → Goals → Projects → Todos)
}

// ============================================
// 날짜/시간 유틸리티 함수
// ============================================

/**
 * 항목의 날짜 정보를 동적으로 계산
 */
export function getItemDates(item: RecommendationItem): {
  startDate: Date | null;
  endDate: Date | null;
  formattedStart: string | null;
  formattedEnd: string | null;
  formattedTime: string | null;
  formattedRange: string | null;
} {
  const now = new Date();
  const today = startOfDay(now);

  if (!item.dateConfig) {
    return {
      startDate: null,
      endDate: null,
      formattedStart: null,
      formattedEnd: null,
      formattedTime: null,
      formattedRange: null,
    };
  }

  let startDate: Date | null = null;
  let endDate: Date | null = null;

  // 시작일 계산
  if (item.dateConfig.startOffset !== undefined) {
    startDate = addDays(today, item.dateConfig.startOffset);

    // 시간 설정
    if (item.dateConfig.time) {
      const [hours, minutes] = item.dateConfig.time.split(':').map(Number);
      startDate = setHours(setMinutes(startDate, minutes), hours);
    }
  }

  // 종료일 계산
  if (item.dateConfig.endOffset !== undefined) {
    endDate = addDays(today, item.dateConfig.endOffset);
  }

  // 포맷팅
  const formattedStart = startDate
    ? format(startDate, 'M월 d일 (E)', { locale: ko })
    : null;
  const formattedEnd = endDate
    ? format(endDate, 'M월 d일', { locale: ko })
    : null;
  const formattedTime = startDate && item.dateConfig.time
    ? format(startDate, 'a h:mm', { locale: ko })
    : null;

  // 범위 포맷팅
  let formattedRange: string | null = null;
  if (formattedStart && formattedEnd) {
    formattedRange = `${formattedStart} ~ ${formattedEnd}`;
  } else if (formattedStart && formattedTime) {
    formattedRange = `${formattedStart} ${formattedTime}`;
  } else if (formattedStart) {
    formattedRange = formattedStart;
  }

  return { startDate, endDate, formattedStart, formattedEnd, formattedTime, formattedRange };
}

/**
 * 상대적 기간 텍스트 생성 (예: "3일 후", "2주 후", "3개월 후")
 */
function getRelativeOffsetText(offset: number): string {
  if (offset === 0) {
    return '오늘';
  }
  if (offset === 1) {
    return '내일';
  }
  if (offset === -1) {
    return '어제';
  }
  if (offset > 0 && offset <= 7) {
    return `${offset}일 후`;
  }
  if (offset < 0 && offset >= -7) {
    return `${Math.abs(offset)}일 전`;
  }
  if (offset > 7 && offset <= 30) {
    return `${Math.ceil(offset / 7)}주 후`;
  }
  if (offset > 30) {
    return `${Math.ceil(offset / 30)}개월 후`;
  }
  return `${offset}일`;
}

/**
 * 날짜 텍스트 생성 (정확한 날짜 + 상대적 기간)
 * - 오늘/내일: 그대로 표시
 * - 그 외: "12월 15일 (3주 후)", "2026년 3월 1일 (3개월 후)"
 */
export function getRelativeDateText(offset: number): string {
  if (offset === 0) {
    return '오늘';
  }
  if (offset === 1) {
    return '내일';
  }

  const today = startOfDay(new Date());
  const targetDate = addDays(today, offset);
  const currentYear = today.getFullYear();
  const targetYear = targetDate.getFullYear();

  // 정확한 날짜
  const exactDate = targetYear === currentYear
    ? format(targetDate, 'M월 d일', { locale: ko })
    : format(targetDate, 'yyyy년 M월 d일', { locale: ko });

  // 상대적 기간
  const relativeText = getRelativeOffsetText(offset);

  return `${exactDate} (${relativeText})`;
}

// ============================================
// 추천 항목 데이터
// ============================================

export const RECOMMENDATIONS: RecommendationCategory[] = [
  {
    type: 'area',
    label: NODE_TYPE_LABELS.area,
    items: [
      {
        id: 'area-health',
        type: 'area',
        title: '건강 관리',
        icon: Heart,
        color: NODE_TYPE_COLORS.area,
        category: '웰빙',
      },
      {
        id: 'area-finance',
        type: 'area',
        title: '재정 관리',
        icon: Wallet,
        color: NODE_TYPE_COLORS.area,
        category: '재무',
      },
      {
        id: 'area-growth',
        type: 'area',
        title: '자기계발',
        icon: GraduationCap,
        color: NODE_TYPE_COLORS.area,
        category: '성장',
      },
      {
        id: 'area-family',
        type: 'area',
        title: '가족/관계',
        icon: Users,
        color: NODE_TYPE_COLORS.area,
        category: '관계',
      },
      {
        id: 'area-career',
        type: 'area',
        title: '커리어',
        icon: Briefcase,
        color: NODE_TYPE_COLORS.area,
        category: '직업',
      },
      {
        id: 'area-hobby',
        type: 'area',
        title: '취미/여가',
        icon: Palette,
        color: NODE_TYPE_COLORS.area,
        category: '여가',
      },
    ],
  },
  {
    type: 'resource',
    label: NODE_TYPE_LABELS.resource,
    items: [
      {
        id: 'resource-time',
        type: 'resource',
        title: '시간',
        icon: Clock,
        color: NODE_TYPE_COLORS.resource,
      },
      {
        id: 'resource-energy',
        type: 'resource',
        title: '에너지',
        icon: Zap,
        color: NODE_TYPE_COLORS.resource,
      },
      {
        id: 'resource-money',
        type: 'resource',
        title: '돈',
        icon: DollarSign,
        color: NODE_TYPE_COLORS.resource,
      },
      {
        id: 'resource-knowledge',
        type: 'resource',
        title: '지식',
        icon: BookOpen,
        color: NODE_TYPE_COLORS.resource,
      },
      {
        id: 'resource-network',
        type: 'resource',
        title: '인맥',
        icon: Network,
        color: NODE_TYPE_COLORS.resource,
      },
    ],
  },
  {
    type: 'goal',
    label: NODE_TYPE_LABELS.goal,
    items: [
      {
        id: 'goal-weight',
        type: 'goal',
        title: '체중 감량',
        icon: Scale,
        color: NODE_TYPE_COLORS.goal,
        category: '건강',
        parentId: 'area-health',
      },
      {
        id: 'goal-savings',
        type: 'goal',
        title: '저축 1000만원',
        icon: PiggyBank,
        color: NODE_TYPE_COLORS.goal,
        category: '재정',
        parentId: 'area-finance',
      },
      {
        id: 'goal-english',
        type: 'goal',
        title: '영어 공부',
        icon: Languages,
        color: NODE_TYPE_COLORS.goal,
        category: '자기계발',
        parentId: 'area-growth',
      },
      {
        id: 'goal-exercise',
        type: 'goal',
        title: '운동 습관 만들기',
        icon: Dumbbell,
        color: NODE_TYPE_COLORS.goal,
        category: '건강',
        parentId: 'area-health',
      },
    ],
  },
  {
    type: 'project',
    label: NODE_TYPE_LABELS.project,
    items: [
      {
        id: 'project-diet',
        type: 'project',
        title: '다이어트 계획',
        icon: Salad,
        color: NODE_TYPE_COLORS.project,
        parentId: 'goal-weight',
      },
      {
        id: 'project-invest',
        type: 'project',
        title: '투자 포트폴리오',
        icon: TrendingUp,
        color: NODE_TYPE_COLORS.project,
        parentId: 'goal-savings',
      },
      {
        id: 'project-cert',
        type: 'project',
        title: '자격증 취득',
        icon: Award,
        color: NODE_TYPE_COLORS.project,
        parentId: 'goal-english',
      },
      {
        id: 'project-travel',
        type: 'project',
        title: '여행 계획',
        icon: Plane,
        color: NODE_TYPE_COLORS.project,
        parentId: 'area-hobby',
      },
    ],
  },
  {
    type: 'todo',
    label: NODE_TYPE_LABELS.todo,
    items: [
      {
        id: 'todo-morning',
        type: 'todo',
        title: '아침 운동 30분',
        icon: Sun,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'project-diet',
      },
      {
        id: 'todo-expense',
        type: 'todo',
        title: '가계부 작성',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'project-invest',
      },
      {
        id: 'todo-reading',
        type: 'todo',
        title: '책 10페이지 읽기',
        icon: Book,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'project-cert',
      },
    ],
  },
  {
    type: 'note',
    label: NODE_TYPE_LABELS.note,
    items: [
      {
        id: 'note-reading',
        type: 'note',
        title: '독서 메모',
        icon: FileText,
        color: NODE_TYPE_COLORS.note,
        parentId: 'project-cert',
      },
      {
        id: 'note-idea',
        type: 'note',
        title: '아이디어 정리',
        icon: Lightbulb,
        color: NODE_TYPE_COLORS.note,
        parentId: 'area-growth',
      },
      {
        id: 'note-meeting',
        type: 'note',
        title: '회의록',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.note,
        parentId: 'area-career',
      },
      {
        id: 'note-gratitude',
        type: 'note',
        title: '감사 일기',
        icon: Heart,
        color: NODE_TYPE_COLORS.note,
        parentId: 'area-health',
      },
    ],
  },
];

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 특정 타입의 추천 항목 가져오기
 */
export function getRecommendationsByType(type: GraphNodeType): RecommendationItem[] {
  const category = RECOMMENDATIONS.find((cat) => cat.type === type);
  return category?.items || [];
}

/**
 * ID로 추천 항목 찾기
 */
export function getRecommendationById(id: string): RecommendationItem | undefined {
  for (const category of RECOMMENDATIONS) {
    const item = category.items.find((item) => item.id === id);
    if (item) { return item; }
  }
  return undefined;
}

/**
 * 모든 추천 항목 가져오기 (플랫)
 */
export function getAllRecommendations(): RecommendationItem[] {
  return RECOMMENDATIONS.flatMap((cat) => cat.items);
}

/**
 * 뷰 타입 정의
 */
export type EmptyStateViewType = 'carousel' | 'accordion' | 'graph' | 'chips';

export const VIEW_TYPES: { type: EmptyStateViewType; label: string; description: string }[] = [
  { type: 'carousel', label: '캐러셀', description: '카드를 스와이프하세요' },
  { type: 'accordion', label: '목록', description: '카테고리를 펼쳐보세요' },
  { type: 'graph', label: '그래프', description: '연결을 확인하세요' },
  { type: 'chips', label: '태그', description: '빠르게 선택하세요' },
];

// ============================================
// 추천 세트 데이터 (8개) - 풍부한 계층 구조 + 동적 날짜
// ============================================

export const RECOMMENDATION_SETS: RecommendationSet[] = [
  // 1. 건강/다이어트 세트 - 책임 1개, 목표 2개, 프로젝트 3개, 할일 5개
  {
    id: 'set-health',
    title: '건강/다이어트',
    emoji: '🏃',
    color: NODE_TYPE_COLORS.area,
    items: [
      // 책임 (Area)
      {
        id: 'set-health-area',
        type: 'area',
        title: '건강 관리',
        icon: Heart,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      // 목표 1: 체중 감량
      {
        id: 'set-health-goal-1',
        type: 'goal',
        title: '체중 5kg 감량',
        icon: Scale,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-health-area',
        dateConfig: { startOffset: 0, endOffset: 90 },
        childCount: 2,
      },
      // 목표 2: 운동 습관
      {
        id: 'set-health-goal-2',
        type: 'goal',
        title: '주 4회 운동 습관',
        icon: Dumbbell,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-health-area',
        dateConfig: { startOffset: 0, endOffset: 60 },
        childCount: 1,
      },
      // 프로젝트 1-1: 다이어트
      {
        id: 'set-health-project-1',
        type: 'project',
        title: '식단 관리',
        icon: Salad,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-health-goal-1',
        dateConfig: { startOffset: 0, endOffset: 30 },
        childCount: 2,
      },
      // 프로젝트 1-2: 헬스장
      {
        id: 'set-health-project-2',
        type: 'project',
        title: '헬스장 등록',
        icon: Dumbbell,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-health-goal-1',
        dateConfig: { startOffset: 3, endOffset: 93 },
        childCount: 1,
      },
      // 프로젝트 2-1: 홈트
      {
        id: 'set-health-project-3',
        type: 'project',
        title: '홈트레이닝 루틴',
        icon: Activity,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-health-goal-2',
        dateConfig: { startOffset: 0, endOffset: 14 },
        childCount: 2,
      },
      // 할일들 (반복 패턴 포함)
      {
        id: 'set-health-todo-1',
        type: 'todo',
        title: '아침 공복 스트레칭',
        icon: Sun,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project-1',
        dateConfig: { startOffset: 0, time: '07:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 90 },
      },
      {
        id: 'set-health-todo-2',
        type: 'todo',
        title: '식단 기록하기',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project-1',
        dateConfig: { startOffset: 0, time: '12:30' },
        recurrenceConfig: { pattern: 'daily', endOffset: 90 },
      },
      {
        id: 'set-health-todo-3',
        type: 'todo',
        title: '헬스장 가기',
        icon: Dumbbell,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project-2',
        dateConfig: { startOffset: 1, time: '18:00' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [1, 2, 4, 5], endOffset: 90 },
      },
      {
        id: 'set-health-todo-4',
        type: 'todo',
        title: '저녁 홈트 30분',
        icon: Activity,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project-3',
        dateConfig: { startOffset: 0, time: '19:00' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [0, 3, 6], endOffset: 60 },
      },
      {
        id: 'set-health-todo-5',
        type: 'todo',
        title: '취침 전 스트레칭',
        icon: Clock,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project-3',
        dateConfig: { startOffset: 0, time: '22:30' },
        recurrenceConfig: { pattern: 'daily', endOffset: 60 },
      },
    ],
  },

  // 2. 재정/저축 세트 - 책임 1개, 목표 2개, 프로젝트 3개, 할일 4개
  {
    id: 'set-finance',
    title: '재정/저축',
    emoji: '💰',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-finance-area',
        type: 'area',
        title: '재정 관리',
        icon: Wallet,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-finance-goal-1',
        type: 'goal',
        title: '비상금 1000만원 모으기',
        icon: PiggyBank,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-finance-area',
        dateConfig: { startOffset: 0, endOffset: 180 },
        childCount: 2,
      },
      {
        id: 'set-finance-goal-2',
        type: 'goal',
        title: '월 지출 20% 절감',
        icon: TrendingUp,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-finance-area',
        dateConfig: { startOffset: 0, endOffset: 30 },
        childCount: 1,
      },
      {
        id: 'set-finance-project-1',
        type: 'project',
        title: '자동이체 저축 설정',
        icon: CalendarDays,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-finance-goal-1',
        dateConfig: { startOffset: 0, endOffset: 7 },
        childCount: 1,
      },
      {
        id: 'set-finance-project-2',
        type: 'project',
        title: '투자 공부',
        icon: BookOpen,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-finance-goal-1',
        dateConfig: { startOffset: 7, endOffset: 37 },
        childCount: 1,
      },
      {
        id: 'set-finance-project-3',
        type: 'project',
        title: '지출 분석',
        icon: TrendingUp,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-finance-goal-2',
        dateConfig: { startOffset: 0, endOffset: 14 },
        childCount: 2,
      },
      {
        id: 'set-finance-todo-1',
        type: 'todo',
        title: '적금 계좌 개설',
        icon: Wallet,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-finance-project-1',
        dateConfig: { startOffset: 0, time: '10:00' },
        recurrenceConfig: { pattern: 'none' },
      },
      {
        id: 'set-finance-todo-2',
        type: 'todo',
        title: '투자 입문서 읽기',
        icon: Book,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-finance-project-2',
        dateConfig: { startOffset: 1, time: '21:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 30 },
      },
      {
        id: 'set-finance-todo-3',
        type: 'todo',
        title: '오늘 지출 기록',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-finance-project-3',
        dateConfig: { startOffset: 0, time: '22:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 180 },
      },
      {
        id: 'set-finance-todo-4',
        type: 'todo',
        title: '월간 재정 점검',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-finance-project-3',
        dateConfig: { startOffset: 0, time: '15:00' },
        recurrenceConfig: { pattern: 'monthly', dayOfMonth: 1, endOffset: 180 },
      },
    ],
  },

  // 3. 자기계발/학습 세트
  {
    id: 'set-learning',
    title: '자기계발/학습',
    emoji: '📚',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-learning-area',
        type: 'area',
        title: '자기계발',
        icon: GraduationCap,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-learning-goal-1',
        type: 'goal',
        title: '영어 회화 중급 달성',
        icon: Languages,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-learning-area',
        dateConfig: { startOffset: 0, endOffset: 180 },
        childCount: 2,
      },
      {
        id: 'set-learning-goal-2',
        type: 'goal',
        title: '독서 24권 읽기',
        icon: Book,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-learning-area',
        dateConfig: { startOffset: 0, endOffset: 365 },
        childCount: 1,
      },
      {
        id: 'set-learning-project-1',
        type: 'project',
        title: '영어 앱 학습',
        icon: Laptop,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-learning-goal-1',
        dateConfig: { startOffset: 0, endOffset: 30 },
        childCount: 2,
      },
      {
        id: 'set-learning-project-2',
        type: 'project',
        title: '영어 스터디 참여',
        icon: Users,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-learning-goal-1',
        dateConfig: { startOffset: 7, endOffset: 90 },
        childCount: 1,
      },
      {
        id: 'set-learning-project-3',
        type: 'project',
        title: '이달의 책 읽기',
        icon: Book,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-learning-goal-2',
        dateConfig: { startOffset: 0, endOffset: 14 },
        childCount: 2,
      },
      {
        id: 'set-learning-todo-1',
        type: 'todo',
        title: '영어 앱 오늘 학습',
        icon: Laptop,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project-1',
        dateConfig: { startOffset: 0, time: '08:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 180 },
      },
      {
        id: 'set-learning-todo-2',
        type: 'todo',
        title: '영어 일기 쓰기',
        icon: FileText,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project-1',
        dateConfig: { startOffset: 0, time: '22:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 180 },
      },
      {
        id: 'set-learning-todo-3',
        type: 'todo',
        title: '영어 스터디 참석',
        icon: Users,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project-2',
        dateConfig: { startOffset: 2, time: '20:00' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [6], endOffset: 90 },
      },
      {
        id: 'set-learning-todo-4',
        type: 'todo',
        title: '책 30분 읽기',
        icon: Book,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project-3',
        dateConfig: { startOffset: 0, time: '12:30' },
        recurrenceConfig: { pattern: 'daily', endOffset: 365 },
      },
      {
        id: 'set-learning-todo-5',
        type: 'todo',
        title: '독서 노트 정리',
        icon: FileText,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project-3',
        dateConfig: { startOffset: 0, time: '21:30' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [0], endOffset: 365 },
      },
    ],
  },

  // 4. 가족/관계 세트
  {
    id: 'set-family',
    title: '가족/관계',
    emoji: '👨‍👩‍👧',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-family-area',
        type: 'area',
        title: '가족/관계',
        icon: Users,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-family-goal-1',
        type: 'goal',
        title: '가족과 주 3회 저녁 함께',
        icon: Target,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-family-area',
        dateConfig: { startOffset: 0, endOffset: 30 },
        childCount: 1,
      },
      {
        id: 'set-family-goal-2',
        type: 'goal',
        title: '월 1회 부모님 방문',
        icon: Heart,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-family-area',
        dateConfig: { startOffset: 0, endOffset: 365 },
        childCount: 2,
      },
      {
        id: 'set-family-project-1',
        type: 'project',
        title: '이번 주 가족 식사',
        icon: UtensilsCrossed,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-family-goal-1',
        dateConfig: { startOffset: 0, endOffset: 7 },
        childCount: 2,
      },
      {
        id: 'set-family-project-2',
        type: 'project',
        title: '부모님 생신 준비',
        icon: CalendarDays,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-family-goal-2',
        dateConfig: { startOffset: 14, endOffset: 21 },
        childCount: 2,
      },
      {
        id: 'set-family-project-3',
        type: 'project',
        title: '주말 가족 나들이',
        icon: Plane,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-family-goal-2',
        dateConfig: { startOffset: 5, endOffset: 6 },
        childCount: 1,
      },
      {
        id: 'set-family-todo-1',
        type: 'todo',
        title: '저녁 메뉴 정하기',
        icon: UtensilsCrossed,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project-1',
        dateConfig: { startOffset: 0, time: '17:00' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [1, 3, 5], endOffset: 30 },
      },
      {
        id: 'set-family-todo-2',
        type: 'todo',
        title: '장보기',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project-1',
        dateConfig: { startOffset: 0, time: '18:00' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [6], endOffset: 30 },
      },
      {
        id: 'set-family-todo-3',
        type: 'todo',
        title: '생신 선물 주문',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project-2',
        dateConfig: { startOffset: 7, time: '20:00' },
        recurrenceConfig: { pattern: 'none' },
      },
      {
        id: 'set-family-todo-4',
        type: 'todo',
        title: '레스토랑 예약',
        icon: CalendarDays,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project-2',
        dateConfig: { startOffset: 10, time: '11:00' },
        recurrenceConfig: { pattern: 'none' },
      },
      {
        id: 'set-family-todo-5',
        type: 'todo',
        title: '피크닉 준비물 체크',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project-3',
        dateConfig: { startOffset: 4, time: '21:00' },
        recurrenceConfig: { pattern: 'none' },
      },
    ],
  },

  // 5. 커리어/성장 세트
  {
    id: 'set-career',
    title: '커리어/성장',
    emoji: '💼',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-career-area',
        type: 'area',
        title: '커리어',
        icon: Briefcase,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-career-goal-1',
        type: 'goal',
        title: '연봉 10% 인상',
        icon: TrendingUp,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-career-area',
        dateConfig: { startOffset: 0, endOffset: 180 },
        childCount: 2,
      },
      {
        id: 'set-career-goal-2',
        type: 'goal',
        title: '새로운 기술 스택 습득',
        icon: Code,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-career-area',
        dateConfig: { startOffset: 0, endOffset: 90 },
        childCount: 1,
      },
      {
        id: 'set-career-project-1',
        type: 'project',
        title: '핵심 성과 달성',
        icon: Target,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-career-goal-1',
        dateConfig: { startOffset: 0, endOffset: 60 },
        childCount: 2,
      },
      {
        id: 'set-career-project-2',
        type: 'project',
        title: '사내 교육 이수',
        icon: Award,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-career-goal-1',
        dateConfig: { startOffset: 30, endOffset: 90 },
        childCount: 1,
      },
      {
        id: 'set-career-project-3',
        type: 'project',
        title: '사이드 프로젝트',
        icon: Code,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-career-goal-2',
        dateConfig: { startOffset: 0, endOffset: 45 },
        childCount: 2,
      },
      {
        id: 'set-career-todo-1',
        type: 'todo',
        title: '주간 업무 보고 작성',
        icon: FileText,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project-1',
        dateConfig: { startOffset: 4, time: '17:00' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [5], endOffset: 180 },
      },
      {
        id: 'set-career-todo-2',
        type: 'todo',
        title: '팀 미팅 준비',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project-1',
        dateConfig: { startOffset: 1, time: '09:00' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [1], endOffset: 60 },
      },
      {
        id: 'set-career-todo-3',
        type: 'todo',
        title: '교육 신청',
        icon: GraduationCap,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project-2',
        dateConfig: { startOffset: 14, time: '10:00' },
        recurrenceConfig: { pattern: 'none' },
      },
      {
        id: 'set-career-todo-4',
        type: 'todo',
        title: '코딩 1시간',
        icon: Laptop,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project-3',
        dateConfig: { startOffset: 0, time: '21:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 45 },
      },
      {
        id: 'set-career-todo-5',
        type: 'todo',
        title: '기술 블로그 읽기',
        icon: BookOpen,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project-3',
        dateConfig: { startOffset: 0, time: '12:00' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [1, 3, 5], endOffset: 90 },
      },
    ],
  },

  // 6. 취미/여가 세트
  {
    id: 'set-hobby',
    title: '취미/여가',
    emoji: '🎨',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-hobby-area',
        type: 'area',
        title: '취미/여가',
        icon: Palette,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-hobby-goal-1',
        type: 'goal',
        title: '새 취미 하나 시작',
        icon: Sparkles,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-hobby-area',
        dateConfig: { startOffset: 0, endOffset: 90 },
        childCount: 2,
      },
      {
        id: 'set-hobby-goal-2',
        type: 'goal',
        title: '여행 2회 다녀오기',
        icon: Plane,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-hobby-area',
        dateConfig: { startOffset: 0, endOffset: 365 },
        childCount: 1,
      },
      {
        id: 'set-hobby-project-1',
        type: 'project',
        title: '원데이 클래스 체험',
        icon: Sparkles,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-hobby-goal-1',
        dateConfig: { startOffset: 0, endOffset: 30 },
        childCount: 2,
      },
      {
        id: 'set-hobby-project-2',
        type: 'project',
        title: '취미 용품 구매',
        icon: Receipt,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-hobby-goal-1',
        dateConfig: { startOffset: 14, endOffset: 21 },
        childCount: 1,
      },
      {
        id: 'set-hobby-project-3',
        type: 'project',
        title: '제주도 여행 계획',
        icon: Plane,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-hobby-goal-2',
        dateConfig: { startOffset: 30, endOffset: 60 },
        childCount: 2,
      },
      {
        id: 'set-hobby-todo-1',
        type: 'todo',
        title: '원데이 클래스 검색',
        icon: Laptop,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project-1',
        dateConfig: { startOffset: 0, time: '20:00' },
        recurrenceConfig: { pattern: 'none' },
      },
      {
        id: 'set-hobby-todo-2',
        type: 'todo',
        title: '클래스 예약',
        icon: CalendarDays,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project-1',
        dateConfig: { startOffset: 1, time: '19:00' },
        recurrenceConfig: { pattern: 'none' },
      },
      {
        id: 'set-hobby-todo-3',
        type: 'todo',
        title: '용품 리스트 작성',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project-2',
        dateConfig: { startOffset: 7, time: '21:00' },
        recurrenceConfig: { pattern: 'none' },
      },
      {
        id: 'set-hobby-todo-4',
        type: 'todo',
        title: '항공권 검색',
        icon: Plane,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project-3',
        dateConfig: { startOffset: 14, time: '20:00' },
        recurrenceConfig: { pattern: 'none' },
      },
      {
        id: 'set-hobby-todo-5',
        type: 'todo',
        title: '숙소 예약',
        icon: CalendarDays,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project-3',
        dateConfig: { startOffset: 15, time: '21:00' },
        recurrenceConfig: { pattern: 'none' },
      },
    ],
  },

  // 7. 마음챙김/웰빙 세트
  {
    id: 'set-mindfulness',
    title: '마음챙김/웰빙',
    emoji: '🧘',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-mindfulness-area',
        type: 'area',
        title: '정신 건강',
        icon: Heart,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-mindfulness-goal-1',
        type: 'goal',
        title: '매일 명상 습관화',
        icon: Smile,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-mindfulness-area',
        dateConfig: { startOffset: 0, endOffset: 21 },
        childCount: 1,
      },
      {
        id: 'set-mindfulness-goal-2',
        type: 'goal',
        title: '수면 질 개선',
        icon: Clock,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-mindfulness-area',
        dateConfig: { startOffset: 0, endOffset: 30 },
        childCount: 2,
      },
      {
        id: 'set-mindfulness-project-1',
        type: 'project',
        title: '명상 앱 활용',
        icon: Sparkles,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-mindfulness-goal-1',
        dateConfig: { startOffset: 0, endOffset: 21 },
        childCount: 2,
      },
      {
        id: 'set-mindfulness-project-2',
        type: 'project',
        title: '취침 루틴 만들기',
        icon: Clock,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-mindfulness-goal-2',
        dateConfig: { startOffset: 0, endOffset: 14 },
        childCount: 2,
      },
      {
        id: 'set-mindfulness-project-3',
        type: 'project',
        title: '감사 일기 쓰기',
        icon: FileText,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-mindfulness-goal-2',
        dateConfig: { startOffset: 0, endOffset: 30 },
        childCount: 1,
      },
      {
        id: 'set-mindfulness-todo-1',
        type: 'todo',
        title: '아침 명상 10분',
        icon: Sun,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project-1',
        dateConfig: { startOffset: 0, time: '06:30' },
        recurrenceConfig: { pattern: 'daily', endOffset: 21 },
      },
      {
        id: 'set-mindfulness-todo-2',
        type: 'todo',
        title: '저녁 명상 10분',
        icon: Clock,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project-1',
        dateConfig: { startOffset: 0, time: '22:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 21 },
      },
      {
        id: 'set-mindfulness-todo-3',
        type: 'todo',
        title: '스마트폰 알림 끄기',
        icon: Laptop,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project-2',
        dateConfig: { startOffset: 0, time: '22:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 30 },
      },
      {
        id: 'set-mindfulness-todo-4',
        type: 'todo',
        title: '따뜻한 차 마시기',
        icon: Coffee,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project-2',
        dateConfig: { startOffset: 0, time: '21:30' },
        recurrenceConfig: { pattern: 'daily', endOffset: 30 },
      },
      {
        id: 'set-mindfulness-todo-5',
        type: 'todo',
        title: '감사 일기 작성',
        icon: FileText,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project-3',
        dateConfig: { startOffset: 0, time: '22:30' },
        recurrenceConfig: { pattern: 'daily', endOffset: 30 },
      },
    ],
  },

  // 8. 생산성/루틴 세트
  {
    id: 'set-productivity',
    title: '생산성/루틴',
    emoji: '⚡',
    color: NODE_TYPE_COLORS.resource,
    items: [
      {
        id: 'set-productivity-resource',
        type: 'resource',
        title: '시간',
        icon: Clock,
        color: NODE_TYPE_COLORS.resource,
        childCount: 2,
      },
      {
        id: 'set-productivity-goal-1',
        type: 'goal',
        title: '아침형 인간 되기',
        icon: Sunrise,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-productivity-resource',
        dateConfig: { startOffset: 0, endOffset: 30 },
        childCount: 1,
      },
      {
        id: 'set-productivity-goal-2',
        type: 'goal',
        title: '집중력 향상',
        icon: Timer,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-productivity-resource',
        dateConfig: { startOffset: 0, endOffset: 21 },
        childCount: 2,
      },
      {
        id: 'set-productivity-project-1',
        type: 'project',
        title: '아침 루틴 정착',
        icon: Sunrise,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-productivity-goal-1',
        dateConfig: { startOffset: 0, endOffset: 14 },
        childCount: 3,
      },
      {
        id: 'set-productivity-project-2',
        type: 'project',
        title: '업무 집중 시간',
        icon: Target,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-productivity-goal-2',
        dateConfig: { startOffset: 0, endOffset: 7 },
        childCount: 2,
      },
      {
        id: 'set-productivity-project-3',
        type: 'project',
        title: '디지털 정리',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-productivity-goal-2',
        dateConfig: { startOffset: 0, endOffset: 7 },
        childCount: 1,
      },
      {
        id: 'set-productivity-todo-1',
        type: 'todo',
        title: '6시 알람 설정',
        icon: Clock,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-1',
        dateConfig: { startOffset: 0, time: '22:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 30 },
      },
      {
        id: 'set-productivity-todo-2',
        type: 'todo',
        title: '아침 루틴 체크리스트',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-1',
        dateConfig: { startOffset: 1, time: '06:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 30 },
      },
      {
        id: 'set-productivity-todo-3',
        type: 'todo',
        title: '오늘 할 일 3가지 정하기',
        icon: Target,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-1',
        dateConfig: { startOffset: 0, time: '07:30' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], endOffset: 30 },
      },
      {
        id: 'set-productivity-todo-4',
        type: 'todo',
        title: '뽀모도로 25분 집중',
        icon: Timer,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-2',
        dateConfig: { startOffset: 0, time: '09:00' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], endOffset: 21 },
      },
      {
        id: 'set-productivity-todo-5',
        type: 'todo',
        title: '5분 휴식 & 스트레칭',
        icon: Activity,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-2',
        dateConfig: { startOffset: 0, time: '09:25' },
        recurrenceConfig: { pattern: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], endOffset: 21 },
      },
      {
        id: 'set-productivity-todo-6',
        type: 'todo',
        title: '받은 편지함 비우기',
        icon: FileText,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-3',
        dateConfig: { startOffset: 0, time: '17:00' },
        recurrenceConfig: { pattern: 'daily', endOffset: 30 },
      },
    ],
  },
];

/**
 * 세트 ID로 세트 찾기
 */
export function getSetById(setId: string): RecommendationSet | undefined {
  return RECOMMENDATION_SETS.find((set) => set.id === setId);
}

/**
 * 세트의 모든 항목 ID 가져오기
 */
export function getSetItemIds(setId: string): string[] {
  const set = getSetById(setId);
  return set ? set.items.map((item) => item.id) : [];
}

/**
 * 모든 세트의 모든 항목 가져오기 (플랫)
 */
export function getAllSetItems(): RecommendationItem[] {
  return RECOMMENDATION_SETS.flatMap((set) => set.items);
}

// ============================================
// 트리 구조 유틸리티
// ============================================

/**
 * 플랫 아이템 배열을 parentId 기반 트리 구조로 변환
 * 같은 부모의 자식들은 같은 depth를 가짐
 */
export function buildTree(items: RecommendationItem[]): TreeNode[] {
  const itemMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // 1단계: 모든 아이템을 TreeNode로 변환
  items.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [], depth: 0 });
  });

  // 2단계: 부모-자식 관계 설정 및 depth 계산
  items.forEach((item) => {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      const parent = itemMap.get(item.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // 3단계: depth 재귀 계산
  function calculateDepth(node: TreeNode, depth: number): void {
    node.depth = depth;
    node.children.forEach((child) => calculateDepth(child, depth + 1));
  }
  roots.forEach((root) => calculateDepth(root, 0));

  return roots;
}

/**
 * 트리에서 모든 노드 ID 수집 (재귀)
 */
export function collectAllNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  function collect(node: TreeNode): void {
    ids.push(node.id);
    node.children.forEach(collect);
  }
  nodes.forEach(collect);
  return ids;
}

/**
 * 트리에서 특정 노드의 모든 자손 ID 수집
 */
export function collectDescendantIds(node: TreeNode): string[] {
  const ids: string[] = [];
  function collect(n: TreeNode): void {
    n.children.forEach((child) => {
      ids.push(child.id);
      collect(child);
    });
  }
  collect(node);
  return ids;
}

/**
 * 트리의 총 노드 수 계산
 */
export function countTreeNodes(nodes: TreeNode[]): number {
  let count = 0;
  function countNode(node: TreeNode): void {
    count++;
    node.children.forEach(countNode);
  }
  nodes.forEach(countNode);
  return count;
}
