/**
 * 추천 항목 데이터
 *
 * 처음 사용하는 한국인 사용자를 위한 라이프스타일 기반 템플릿
 */

import type { GraphNodeType } from '@/types/graph';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/graph-utils';
import type { LucideIcon } from 'lucide-react';
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
  items: RecommendationItem[];  // Area→Goal→Project→Todo 순서로 연결된 항목들
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
    if (item) return item;
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
// 추천 세트 데이터 (8개)
// ============================================

export const RECOMMENDATION_SETS: RecommendationSet[] = [
  // 1. 건강/다이어트 세트
  {
    id: 'set-health',
    title: '건강/다이어트',
    description: '건강한 몸 만들기',
    emoji: '🏃',
    color: NODE_TYPE_COLORS.area,
    items: [
      {
        id: 'set-health-area',
        type: 'area',
        title: '건강 관리',
        description: '신체적, 정신적 건강 유지',
        icon: Heart,
        color: NODE_TYPE_COLORS.area,
      },
      {
        id: 'set-health-goal',
        type: 'goal',
        title: '체중 감량',
        description: '건강한 체중 달성',
        icon: Scale,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-health-area',
      },
      {
        id: 'set-health-project',
        type: 'project',
        title: '다이어트 계획',
        description: '3개월 다이어트 프로젝트',
        icon: Salad,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-health-goal',
      },
      {
        id: 'set-health-todo',
        type: 'todo',
        title: '아침 운동 30분',
        description: '기상 후 운동하기',
        icon: Sun,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-health-project',
      },
    ],
  },

  // 2. 재정/저축 세트
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
        description: '수입, 지출, 투자 관리',
        icon: Wallet,
        color: NODE_TYPE_COLORS.area,
      },
      {
        id: 'set-finance-goal',
        type: 'goal',
        title: '저축 1000만원',
        description: '비상금 마련하기',
        icon: PiggyBank,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-finance-area',
      },
      {
        id: 'set-finance-project',
        type: 'project',
        title: '투자 포트폴리오',
        description: '자산 배분 구성하기',
        icon: TrendingUp,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-finance-goal',
      },
      {
        id: 'set-finance-todo',
        type: 'todo',
        title: '가계부 작성',
        description: '오늘 지출 기록하기',
        icon: Receipt,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-finance-project',
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
        description: '학습과 성장',
        icon: GraduationCap,
        color: NODE_TYPE_COLORS.area,
      },
      {
        id: 'set-learning-goal',
        type: 'goal',
        title: '영어 공부',
        description: '외국어 능력 향상',
        icon: Languages,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-learning-area',
      },
      {
        id: 'set-learning-project',
        type: 'project',
        title: '자격증 취득',
        description: '목표 자격증 준비',
        icon: Award,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-learning-goal',
      },
      {
        id: 'set-learning-todo',
        type: 'todo',
        title: '책 10페이지 읽기',
        description: '매일 독서 습관',
        icon: Book,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-learning-project',
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
        description: '소중한 사람들과의 관계',
        icon: Users,
        color: NODE_TYPE_COLORS.area,
      },
      {
        id: 'set-family-goal',
        type: 'goal',
        title: '가족 시간 확보',
        description: '함께하는 시간 늘리기',
        icon: Target,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-family-area',
      },
      {
        id: 'set-family-project',
        type: 'project',
        title: '주말 가족 활동',
        description: '매주 함께하는 활동 계획',
        icon: CalendarDays,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-family-goal',
      },
      {
        id: 'set-family-todo',
        type: 'todo',
        title: '가족 저녁 식사',
        description: '오늘 함께 저녁 먹기',
        icon: UtensilsCrossed,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-family-project',
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
      },
      {
        id: 'set-career-goal',
        type: 'goal',
        title: '역량 강화',
        description: '전문성 향상하기',
        icon: TrendingUp,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-career-area',
      },
      {
        id: 'set-career-project',
        type: 'project',
        title: '사이드 프로젝트',
        description: '개인 프로젝트 진행',
        icon: Code,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-career-goal',
      },
      {
        id: 'set-career-todo',
        type: 'todo',
        title: '업무 스킬 공부',
        description: '새로운 기술 학습',
        icon: Laptop,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-career-project',
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
        description: '즐거움과 휴식',
        icon: Palette,
        color: NODE_TYPE_COLORS.area,
      },
      {
        id: 'set-hobby-goal',
        type: 'goal',
        title: '새 취미 배우기',
        description: '새로운 관심사 발굴',
        icon: Sparkles,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-hobby-area',
      },
      {
        id: 'set-hobby-project',
        type: 'project',
        title: '여행 계획',
        description: '다음 여행 준비하기',
        icon: Plane,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-hobby-goal',
      },
      {
        id: 'set-hobby-todo',
        type: 'todo',
        title: '취미 활동 1시간',
        description: '오늘 취미 시간 갖기',
        icon: Activity,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-hobby-project',
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
        title: '건강 관리',
        description: '신체적, 정신적 건강',
        icon: Heart,
        color: NODE_TYPE_COLORS.area,
      },
      {
        id: 'set-mindfulness-goal',
        type: 'goal',
        title: '스트레스 관리',
        description: '마음의 안정 찾기',
        icon: Smile,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-mindfulness-area',
      },
      {
        id: 'set-mindfulness-project',
        type: 'project',
        title: '명상 습관',
        description: '매일 명상 루틴 만들기',
        icon: Sparkles,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-mindfulness-goal',
      },
      {
        id: 'set-mindfulness-todo',
        type: 'todo',
        title: '명상 10분',
        description: '오늘 명상하기',
        icon: Clock,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-mindfulness-project',
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
        description: '하루 24시간의 활용',
        icon: Clock,
        color: NODE_TYPE_COLORS.resource,
      },
      {
        id: 'set-productivity-goal',
        type: 'goal',
        title: '효율적인 하루',
        description: '시간 관리 마스터',
        icon: Timer,
        color: NODE_TYPE_COLORS.goal,
        parentId: 'set-productivity-resource',
      },
      {
        id: 'set-productivity-project',
        type: 'project',
        title: '아침 루틴',
        description: '생산적인 아침 만들기',
        icon: Sunrise,
        color: NODE_TYPE_COLORS.project,
        parentId: 'set-productivity-goal',
      },
      {
        id: 'set-productivity-todo',
        type: 'todo',
        title: '기상 후 루틴',
        description: '아침 루틴 실천하기',
        icon: Coffee,
        color: NODE_TYPE_COLORS.todo,
        parentId: 'set-productivity-project',
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
