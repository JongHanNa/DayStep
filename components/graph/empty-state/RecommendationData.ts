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
  description: string;
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
}

export interface RecommendationCategory {
  type: GraphNodeType;
  label: string;
  description: string;
  items: RecommendationItem[];
}

export interface RecommendationSet {
  id: string;
  title: string;
  description: string;
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
 * 상대적 날짜 텍스트 생성 (예: "오늘", "내일", "3일 후")
 */
export function getRelativeDateText(offset: number): string {
  if (offset === 0) { return '오늘'; }
  if (offset === 1) { return '내일'; }
  if (offset === -1) { return '어제'; }
  if (offset > 0 && offset <= 7) { return `${offset}일 후`; }
  if (offset < 0 && offset >= -7) { return `${Math.abs(offset)}일 전`; }
  if (offset > 7 && offset <= 30) { return `${Math.ceil(offset / 7)}주 후`; }
  if (offset > 30 && offset <= 90) { return `${Math.ceil(offset / 30)}개월 후`; }
  if (offset > 90) { return `${Math.ceil(offset / 30)}개월 후`; }
  return `${offset}일`;
}

// ============================================
// 추천 항목 데이터
// ============================================

export const RECOMMENDATIONS: RecommendationCategory[] = [
  {
    type: 'area',
    label: NODE_TYPE_LABELS.area,
    description: '삶에서 책임져야 하는 영역',
    items: [
      {
        id: 'area-health',
        type: 'area',
        title: '건강 관리',
        description: '신체적, 정신적 건강 유지',
        icon: Heart,
        color: NODE_TYPE_COLORS.area,
        category: '웰빙',
      },
      {
        id: 'area-finance',
        type: 'area',
        title: '재정 관리',
        description: '수입, 지출, 투자 관리',
        icon: Wallet,
        color: NODE_TYPE_COLORS.area,
        category: '재무',
      },
      {
        id: 'area-growth',
        type: 'area',
        title: '자기계발',
        description: '학습과 성장',
        icon: GraduationCap,
        color: NODE_TYPE_COLORS.area,
        category: '성장',
      },
      {
        id: 'area-family',
        type: 'area',
        title: '가족/관계',
        description: '소중한 사람들과의 관계',
        icon: Users,
        color: NODE_TYPE_COLORS.area,
        category: '관계',
      },
      {
        id: 'area-career',
        type: 'area',
        title: '커리어',
        description: '직업과 경력 개발',
        icon: Briefcase,
        color: NODE_TYPE_COLORS.area,
        category: '직업',
      },
      {
        id: 'area-hobby',
        type: 'area',
        title: '취미/여가',
        description: '즐거움과 휴식',
        icon: Palette,
        color: NODE_TYPE_COLORS.area,
        category: '여가',
      },
    ],
  },
  {
    type: 'resource',
    label: NODE_TYPE_LABELS.resource,
    description: '관심을 가지고 관리하는 자원',
    items: [
      {
        id: 'resource-time',
        type: 'resource',
        title: '시간',
        description: '하루 24시간의 활용',
        icon: Clock,
        color: NODE_TYPE_COLORS.resource,
      },
      {
        id: 'resource-energy',
        type: 'resource',
        title: '에너지',
        description: '체력과 집중력',
        icon: Zap,
        color: NODE_TYPE_COLORS.resource,
      },
      {
        id: 'resource-money',
        type: 'resource',
        title: '돈',
        description: '재정 자원',
        icon: DollarSign,
        color: NODE_TYPE_COLORS.resource,
      },
      {
        id: 'resource-knowledge',
        type: 'resource',
        title: '지식',
        description: '배움과 정보',
        icon: BookOpen,
        color: NODE_TYPE_COLORS.resource,
      },
      {
        id: 'resource-network',
        type: 'resource',
        title: '인맥',
        description: '사람들과의 연결',
        icon: Network,
        color: NODE_TYPE_COLORS.resource,
      },
    ],
  },
  {
    type: 'goal',
    label: NODE_TYPE_LABELS.goal,
    description: '달성하고 싶은 것',
    items: [
      {
        id: 'goal-weight',
        type: 'goal',
        title: '체중 감량',
        description: '건강한 체중 달성',
        icon: Scale,
        color: NODE_TYPE_COLORS.goal,
        category: '건강',
        parentId: 'area-health', // 건강 관리 Area와 연결
      },
      {
        id: 'goal-savings',
        type: 'goal',
        title: '저축 1000만원',
        description: '비상금 마련',
        icon: PiggyBank,
        color: NODE_TYPE_COLORS.goal,
        category: '재정',
        parentId: 'area-finance', // 재정 관리 Area와 연결
      },
      {
        id: 'goal-english',
        type: 'goal',
        title: '영어 공부',
        description: '외국어 능력 향상',
        icon: Languages,
        color: NODE_TYPE_COLORS.goal,
        category: '자기계발',
        parentId: 'area-growth', // 자기계발 Area와 연결
      },
      {
        id: 'goal-exercise',
        type: 'goal',
        title: '운동 습관 만들기',
        description: '규칙적인 운동',
        icon: Dumbbell,
        color: NODE_TYPE_COLORS.goal,
        category: '건강',
        parentId: 'area-health', // 건강 관리 Area와 연결
      },
    ],
  },
  {
    type: 'project',
    label: NODE_TYPE_LABELS.project,
    description: '목표 달성을 위한 계획',
    items: [
      {
        id: 'project-diet',
        type: 'project',
        title: '다이어트 계획',
        description: '3개월 다이어트',
        icon: Salad,
        color: NODE_TYPE_COLORS.project,
        parentId: 'goal-weight', // 체중 감량 Goal과 연결
      },
      {
        id: 'project-invest',
        type: 'project',
        title: '투자 포트폴리오',
        description: '자산 배분 구성',
        icon: TrendingUp,
        color: NODE_TYPE_COLORS.project,
        parentId: 'goal-savings', // 저축 1000만원 Goal과 연결
      },
      {
        id: 'project-cert',
        type: 'project',
        title: '자격증 취득',
        description: '목표 자격증 준비',
        icon: Award,
        color: NODE_TYPE_COLORS.project,
        parentId: 'goal-english', // 영어 공부 Goal과 연결
      },
      {
        id: 'project-travel',
        type: 'project',
        title: '여행 계획',
        description: '다음 여행 준비',
        icon: Plane,
        color: NODE_TYPE_COLORS.project,
        parentId: 'area-hobby', // 취미/여가 Area와 연결 (Goal 없이 직접)
      },
    ],
  },
  {
    type: 'todo',
    label: NODE_TYPE_LABELS.todo,
    description: '구체적인 실행 항목',
    items: [
      {
        id: 'todo-morning',
        type: 'todo',
        title: '아침 운동 30분',
        description: '기상 후 운동',
        icon: Sun,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'project-diet', // 다이어트 계획 Project와 연결
      },
      {
        id: 'todo-expense',
        type: 'todo',
        title: '가계부 작성',
        description: '오늘 지출 기록',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'project-invest', // 투자 포트폴리오 Project와 연결
      },
      {
        id: 'todo-reading',
        type: 'todo',
        title: '책 10페이지 읽기',
        description: '독서 습관',
        icon: Book,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'project-cert', // 자격증 취득 Project와 연결
      },
    ],
  },
  {
    type: 'note',
    label: NODE_TYPE_LABELS.note,
    description: '어디든 연결 가능한 메모',
    items: [
      {
        id: 'note-reading',
        type: 'note',
        title: '독서 메모',
        description: '책에서 얻은 인사이트',
        icon: FileText,
        color: NODE_TYPE_COLORS.note,
        parentId: 'project-cert', // 자격증 취득 Project와 연결
      },
      {
        id: 'note-idea',
        type: 'note',
        title: '아이디어 정리',
        description: '떠오르는 생각들',
        icon: Lightbulb,
        color: NODE_TYPE_COLORS.note,
        parentId: 'area-growth', // 자기계발 Area와 연결
      },
      {
        id: 'note-meeting',
        type: 'note',
        title: '회의록',
        description: '미팅 내용 기록',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.note,
        parentId: 'area-career', // 커리어 Area와 연결
      },
      {
        id: 'note-gratitude',
        type: 'note',
        title: '감사 일기',
        description: '하루 감사한 것들',
        icon: Heart,
        color: NODE_TYPE_COLORS.note,
        parentId: 'area-health', // 건강 관리 Area와 연결
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
    description: '건강한 몸 만들기',
    emoji: '🏃',
    color: NODE_TYPE_COLORS.area,
    items: [
      // 책임 (Area)
      {
        id: 'set-health-area',
        type: 'area',
        title: '건강 관리',
        description: '신체적, 정신적 건강 유지',
        icon: Heart,
        color: NODE_TYPE_COLORS.area,
        childCount: 2, // 목표 2개 포함
      },
      // 목표 1: 체중 감량
      {
        id: 'set-health-goal-1',
        type: 'goal',
        title: '체중 5kg 감량',
        description: '3개월 내 목표 체중 달성',
        icon: Scale,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-health-area',
        dateConfig: { startOffset: 0, endOffset: 90 },
        childCount: 2, // 프로젝트 2개 포함
      },
      // 목표 2: 운동 습관
      {
        id: 'set-health-goal-2',
        type: 'goal',
        title: '주 4회 운동 습관',
        description: '규칙적인 운동 생활화',
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
        description: '칼로리 제한 식단 실천',
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
        description: '근처 헬스장 3개월권',
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
        description: '집에서 30분 운동',
        icon: Activity,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-health-goal-2',
        dateConfig: { startOffset: 0, endOffset: 14 },
        childCount: 2,
      },
      // 할일들
      {
        id: 'set-health-todo-1',
        type: 'todo',
        title: '아침 공복 스트레칭',
        description: '기상 후 10분 스트레칭',
        icon: Sun,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project-1',
        dateConfig: { startOffset: 0, time: '07:00' },
      },
      {
        id: 'set-health-todo-2',
        type: 'todo',
        title: '점심 식단 기록',
        description: '칼로리 앱에 기록하기',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project-1',
        dateConfig: { startOffset: 0, time: '12:30' },
      },
      {
        id: 'set-health-todo-3',
        type: 'todo',
        title: '헬스장 방문 예약',
        description: '첫 상담 예약하기',
        icon: CalendarDays,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project-2',
        dateConfig: { startOffset: 1, time: '14:00' },
      },
      {
        id: 'set-health-todo-4',
        type: 'todo',
        title: '저녁 홈트 30분',
        description: '유튜브 홈트 영상 따라하기',
        icon: Activity,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project-3',
        dateConfig: { startOffset: 0, time: '19:00' },
      },
      {
        id: 'set-health-todo-5',
        type: 'todo',
        title: '취침 전 스트레칭',
        description: '숙면을 위한 가벼운 스트레칭',
        icon: Clock,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project-3',
        dateConfig: { startOffset: 0, time: '22:30' },
      },
    ],
  },

  // 2. 재정/저축 세트 - 책임 1개, 목표 2개, 프로젝트 3개, 할일 4개
  {
    id: 'set-finance',
    title: '재정/저축',
    description: '경제적 자유 달성',
    emoji: '💰',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-finance-area',
        type: 'area',
        title: '재정 관리',
        description: '수입, 지출, 투자 체계적 관리',
        icon: Wallet,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-finance-goal-1',
        type: 'goal',
        title: '비상금 1000만원 모으기',
        description: '6개월 내 비상자금 확보',
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
        description: '불필요한 지출 줄이기',
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
        description: '월급일 자동 저축',
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
        description: 'ETF, 펀드 기초 학습',
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
        description: '3개월 지출 패턴 분석',
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
        description: '은행 앱에서 비대면 개설',
        icon: Wallet,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-finance-project-1',
        dateConfig: { startOffset: 0, time: '10:00' },
      },
      {
        id: 'set-finance-todo-2',
        type: 'todo',
        title: '투자 입문서 읽기',
        description: '30분 독서',
        icon: Book,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-finance-project-2',
        dateConfig: { startOffset: 1, time: '21:00' },
      },
      {
        id: 'set-finance-todo-3',
        type: 'todo',
        title: '오늘 지출 기록',
        description: '가계부 앱에 입력',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-finance-project-3',
        dateConfig: { startOffset: 0, time: '22:00' },
      },
      {
        id: 'set-finance-todo-4',
        type: 'todo',
        title: '구독 서비스 점검',
        description: '안 쓰는 구독 해지',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-finance-project-3',
        dateConfig: { startOffset: 2, time: '15:00' },
      },
    ],
  },

  // 3. 자기계발/학습 세트
  {
    id: 'set-learning',
    title: '자기계발/학습',
    description: '성장하는 나 만들기',
    emoji: '📚',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-learning-area',
        type: 'area',
        title: '자기계발',
        description: '지속적인 학습과 성장',
        icon: GraduationCap,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-learning-goal-1',
        type: 'goal',
        title: '영어 회화 중급 달성',
        description: '6개월 영어 학습 계획',
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
        description: '월 2권씩 1년 목표',
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
        description: '매일 30분 앱 학습',
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
        description: '주 1회 온라인 스터디',
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
        description: '자기계발서 완독',
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
        description: '단어 20개 + 회화 연습',
        icon: Laptop,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project-1',
        dateConfig: { startOffset: 0, time: '08:00' },
      },
      {
        id: 'set-learning-todo-2',
        type: 'todo',
        title: '영어 일기 쓰기',
        description: '5문장 영어 일기',
        icon: FileText,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project-1',
        dateConfig: { startOffset: 0, time: '22:00' },
      },
      {
        id: 'set-learning-todo-3',
        type: 'todo',
        title: '스터디 그룹 가입',
        description: '온라인 스터디 검색 및 신청',
        icon: Users,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project-2',
        dateConfig: { startOffset: 2, time: '20:00' },
      },
      {
        id: 'set-learning-todo-4',
        type: 'todo',
        title: '책 30분 읽기',
        description: '점심시간 활용 독서',
        icon: Book,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project-3',
        dateConfig: { startOffset: 0, time: '12:30' },
      },
      {
        id: 'set-learning-todo-5',
        type: 'todo',
        title: '독서 노트 정리',
        description: '핵심 내용 3줄 요약',
        icon: FileText,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project-3',
        dateConfig: { startOffset: 0, time: '21:30' },
      },
    ],
  },

  // 4. 가족/관계 세트
  {
    id: 'set-family',
    title: '가족/관계',
    description: '소중한 사람들과 함께',
    emoji: '👨‍👩‍👧',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-family-area',
        type: 'area',
        title: '가족/관계',
        description: '소중한 관계 유지와 발전',
        icon: Users,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-family-goal-1',
        type: 'goal',
        title: '가족과 주 3회 저녁 함께',
        description: '가족 식사 시간 확보',
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
        description: '부모님과 시간 보내기',
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
        description: '함께 요리하고 식사하기',
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
        description: '선물 및 식사 예약',
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
        description: '공원 피크닉 계획',
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
        description: '가족 투표로 메뉴 선정',
        icon: UtensilsCrossed,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project-1',
        dateConfig: { startOffset: 0, time: '17:00' },
      },
      {
        id: 'set-family-todo-2',
        type: 'todo',
        title: '장보기',
        description: '마트에서 재료 구매',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project-1',
        dateConfig: { startOffset: 0, time: '18:00' },
      },
      {
        id: 'set-family-todo-3',
        type: 'todo',
        title: '생신 선물 주문',
        description: '온라인 쇼핑몰에서 주문',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project-2',
        dateConfig: { startOffset: 7, time: '20:00' },
      },
      {
        id: 'set-family-todo-4',
        type: 'todo',
        title: '레스토랑 예약',
        description: '부모님 좋아하시는 식당',
        icon: CalendarDays,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project-2',
        dateConfig: { startOffset: 10, time: '11:00' },
      },
      {
        id: 'set-family-todo-5',
        type: 'todo',
        title: '피크닉 준비물 체크',
        description: '돗자리, 음식, 게임 등',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project-3',
        dateConfig: { startOffset: 4, time: '21:00' },
      },
    ],
  },

  // 5. 커리어/성장 세트
  {
    id: 'set-career',
    title: '커리어/성장',
    description: '직업적 성장 달성',
    emoji: '💼',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-career-area',
        type: 'area',
        title: '커리어',
        description: '직업과 경력 개발',
        icon: Briefcase,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-career-goal-1',
        type: 'goal',
        title: '연봉 10% 인상',
        description: '올해 연말 승진/인상 목표',
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
        description: '업무 역량 확장',
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
        description: '분기 KPI 110% 달성',
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
        description: '리더십 과정 수료',
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
        description: '포트폴리오용 개인 프로젝트',
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
        description: '이번 주 성과 정리',
        icon: FileText,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project-1',
        dateConfig: { startOffset: 4, time: '17:00' },
      },
      {
        id: 'set-career-todo-2',
        type: 'todo',
        title: '팀 미팅 준비',
        description: '발표 자료 검토',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project-1',
        dateConfig: { startOffset: 1, time: '09:00' },
      },
      {
        id: 'set-career-todo-3',
        type: 'todo',
        title: '교육 신청',
        description: '사내 교육 포털에서 신청',
        icon: GraduationCap,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project-2',
        dateConfig: { startOffset: 14, time: '10:00' },
      },
      {
        id: 'set-career-todo-4',
        type: 'todo',
        title: '코딩 1시간',
        description: '사이드 프로젝트 개발',
        icon: Laptop,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project-3',
        dateConfig: { startOffset: 0, time: '21:00' },
      },
      {
        id: 'set-career-todo-5',
        type: 'todo',
        title: '기술 블로그 읽기',
        description: '최신 트렌드 파악',
        icon: BookOpen,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project-3',
        dateConfig: { startOffset: 0, time: '12:00' },
      },
    ],
  },

  // 6. 취미/여가 세트
  {
    id: 'set-hobby',
    title: '취미/여가',
    description: '즐거운 일상 만들기',
    emoji: '🎨',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-hobby-area',
        type: 'area',
        title: '취미/여가',
        description: '즐거움과 휴식의 균형',
        icon: Palette,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-hobby-goal-1',
        type: 'goal',
        title: '새 취미 하나 시작',
        description: '3개월 내 취미 정착',
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
        description: '올해 국내/해외 여행',
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
        description: '다양한 취미 탐색',
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
        description: '기본 장비 마련',
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
        description: '2박 3일 제주 일정',
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
        description: '도예, 요리, 그림 등 탐색',
        icon: Laptop,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project-1',
        dateConfig: { startOffset: 0, time: '20:00' },
      },
      {
        id: 'set-hobby-todo-2',
        type: 'todo',
        title: '클래스 예약',
        description: '이번 주말 클래스 신청',
        icon: CalendarDays,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project-1',
        dateConfig: { startOffset: 1, time: '19:00' },
      },
      {
        id: 'set-hobby-todo-3',
        type: 'todo',
        title: '용품 리스트 작성',
        description: '필요한 장비 정리',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project-2',
        dateConfig: { startOffset: 7, time: '21:00' },
      },
      {
        id: 'set-hobby-todo-4',
        type: 'todo',
        title: '항공권 검색',
        description: '제주도 왕복 항공권',
        icon: Plane,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project-3',
        dateConfig: { startOffset: 14, time: '20:00' },
      },
      {
        id: 'set-hobby-todo-5',
        type: 'todo',
        title: '숙소 예약',
        description: '호텔/펜션 비교 후 예약',
        icon: CalendarDays,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project-3',
        dateConfig: { startOffset: 15, time: '21:00' },
      },
    ],
  },

  // 7. 마음챙김/웰빙 세트
  {
    id: 'set-mindfulness',
    title: '마음챙김/웰빙',
    description: '마음의 평화 찾기',
    emoji: '🧘',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-mindfulness-area',
        type: 'area',
        title: '정신 건강',
        description: '마음의 안정과 평화',
        icon: Heart,
        color: NODE_TYPE_COLORS.area,
        childCount: 2,
      },
      {
        id: 'set-mindfulness-goal-1',
        type: 'goal',
        title: '매일 명상 습관화',
        description: '21일 명상 챌린지',
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
        description: '하루 7시간 숙면',
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
        description: '가이드 명상 따라하기',
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
        description: '10시 이후 디지털 디톡스',
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
        description: '매일 감사한 일 3가지',
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
        description: '기상 후 호흡 명상',
        icon: Sun,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project-1',
        dateConfig: { startOffset: 0, time: '06:30' },
      },
      {
        id: 'set-mindfulness-todo-2',
        type: 'todo',
        title: '저녁 명상 10분',
        description: '취침 전 마음 정리',
        icon: Clock,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project-1',
        dateConfig: { startOffset: 0, time: '22:00' },
      },
      {
        id: 'set-mindfulness-todo-3',
        type: 'todo',
        title: '스마트폰 알림 끄기',
        description: '22시 이후 방해금지 모드',
        icon: Laptop,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project-2',
        dateConfig: { startOffset: 0, time: '22:00' },
      },
      {
        id: 'set-mindfulness-todo-4',
        type: 'todo',
        title: '따뜻한 차 마시기',
        description: '카페인 없는 허브차',
        icon: Coffee,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project-2',
        dateConfig: { startOffset: 0, time: '21:30' },
      },
      {
        id: 'set-mindfulness-todo-5',
        type: 'todo',
        title: '감사 일기 작성',
        description: '오늘 감사한 일 3가지',
        icon: FileText,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project-3',
        dateConfig: { startOffset: 0, time: '22:30' },
      },
    ],
  },

  // 8. 생산성/루틴 세트
  {
    id: 'set-productivity',
    title: '생산성/루틴',
    description: '효율적인 하루 만들기',
    emoji: '⚡',
    color: NODE_TYPE_COLORS.resource,
    items: [
      {
        id: 'set-productivity-resource',
        type: 'resource',
        title: '시간',
        description: '하루 24시간 효율적 활용',
        icon: Clock,
        color: NODE_TYPE_COLORS.resource,
        childCount: 2,
      },
      {
        id: 'set-productivity-goal-1',
        type: 'goal',
        title: '아침형 인간 되기',
        description: '6시 기상 습관화',
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
        description: '뽀모도로 기법 적용',
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
        description: '기상~출근 루틴 최적화',
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
        description: '오전 3시간 딥워크',
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
        description: '폴더, 이메일 정리 습관',
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
        description: '취침 전 알람 확인',
        icon: Clock,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-1',
        dateConfig: { startOffset: 0, time: '22:00' },
      },
      {
        id: 'set-productivity-todo-2',
        type: 'todo',
        title: '아침 루틴 체크리스트',
        description: '세수→운동→샤워→아침',
        icon: ClipboardList,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-1',
        dateConfig: { startOffset: 1, time: '06:00' },
      },
      {
        id: 'set-productivity-todo-3',
        type: 'todo',
        title: '오늘 할 일 3가지 정하기',
        description: '최우선 업무 선정',
        icon: Target,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-1',
        dateConfig: { startOffset: 0, time: '07:30' },
      },
      {
        id: 'set-productivity-todo-4',
        type: 'todo',
        title: '뽀모도로 25분 집중',
        description: '알림 끄고 업무 집중',
        icon: Timer,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-2',
        dateConfig: { startOffset: 0, time: '09:00' },
      },
      {
        id: 'set-productivity-todo-5',
        type: 'todo',
        title: '5분 휴식 & 스트레칭',
        description: '눈 휴식, 목 스트레칭',
        icon: Activity,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-2',
        dateConfig: { startOffset: 0, time: '09:25' },
      },
      {
        id: 'set-productivity-todo-6',
        type: 'todo',
        title: '받은 편지함 비우기',
        description: '이메일 정리 (10분)',
        icon: FileText,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project-3',
        dateConfig: { startOffset: 0, time: '17:00' },
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
