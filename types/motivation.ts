// 동기부여 메시지 시스템 타입 정의
import { UnifiedIconKey } from '@/lib/icon-collection';

export interface MotivationMessage {
  id: string;
  content: string;
  tags: string[];
  icon: UnifiedIconKey;
  color?: string;
  imageUrl?: string; // 이미지 URL (기본 이미지 또는 커스텀 이미지)
  isDefault: boolean; // 사전 정의된 메시지인지 여부
  userId?: string; // 사용자 커스텀 메시지인 경우
  createdAt?: string;
  updatedAt?: string;
}

// 동기부여 메시지 템플릿 (사전 정의된 메시지)
export interface MotivationTemplate {
  id: string;
  content: string;
  tags: string[];
  icon: UnifiedIconKey;
  imageUrl?: string;
  difficulty?: 'easy' | 'medium' | 'hard'; // ADHD 사용자용 난이도
}

// 동기부여 태그
export interface MotivationTag {
  id: string;
  name: string;
  color: string;
  icon: UnifiedIconKey;
  isDefault: boolean; // 기본 태그인지 커스텀 태그인지
  userId?: string; // 사용자 커스텀 태그인 경우
  createdAt?: string;
}

// 할일과 연결된 동기부여 메시지
export interface TodoMotivation {
  todoId: string;
  motivationMessageId: string;
  assignedAt: string;
  isActive: boolean; // 현재 활성화된 메시지인지 여부
}

// 동기부여 메시지 표시 옵션
export interface MotivationDisplayOptions {
  showOnStart: boolean; // 할일 시작 시 팝업 표시
  showOnCard: boolean; // 타임라인 카드에 배지 표시
  showOnReminder: boolean; // 리마인더에 포함
  autoHide: boolean; // 자동으로 숨기기
  hideDelay?: number; // 자동 숨김 딜레이 (ms)
}

// 동기부여 메시지 추천 시스템
export interface MotivationRecommendation {
  todoContent: string;
  recommendedMessages: MotivationMessage[];
  confidence: number; // 추천 신뢰도 (0-1)
  reason: string; // 추천 이유
}

// 동기부여 통계
export interface MotivationStats {
  totalViews: number;
  effectiveViews: number; // 실제로 도움이 된 조회수
  tagUsage: Record<string, number>;
  averageEngagement: number;
  lastUsed?: string;
}

// 기본 동기부여 태그들
export const DEFAULT_MOTIVATION_TAGS: MotivationTag[] = [
  {
    id: 'resist_temptation',
    name: '유혹 이겨내기',
    color: 'rgb(71, 85, 105)', // slate-600
    icon: 'lucide-Shield',
    isDefault: true,
  },
  {
    id: 'focus_boost',
    name: '집중력 향상',
    color: 'rgb(100, 116, 139)', // slate-500
    icon: 'lucide-Target',
    isDefault: true,
  },
  {
    id: 'goal_reminder',
    name: '목표 상기',
    color: 'rgb(148, 163, 184)', // slate-400
    icon: 'lucide-Flag',
    isDefault: true,
  },
  {
    id: 'positive_affirmation',
    name: '긍정적 확언',
    color: 'rgb(156, 163, 175)', // gray-400
    icon: 'lucide-Heart',
    isDefault: true,
  },
  {
    id: 'habit_building',
    name: '습관 형성',
    color: 'rgb(107, 114, 128)', // gray-500
    icon: 'lucide-Repeat',
    isDefault: true,
  },
  {
    id: 'stress_relief',
    name: '스트레스 완화',
    color: 'rgb(75, 85, 99)', // gray-600
    icon: 'lucide-Smile',
    isDefault: true,
  },
  {
    id: 'productivity',
    name: '생산성',
    color: 'rgb(55, 65, 81)', // gray-700
    icon: 'lucide-Zap',
    isDefault: true,
  },
  {
    id: 'personal_growth',
    name: '개인 성장',
    color: 'rgb(31, 41, 55)', // gray-800
    icon: 'lucide-TrendingUp',
    isDefault: true,
  },
];

// 기본 동기부여 이미지들
export const DEFAULT_MOTIVATION_IMAGES = {
  success: '/images/motivation/success.svg',
  goal: '/images/motivation/goal.svg',
  focus: '/images/motivation/focus.svg',
  growth: '/images/motivation/growth.svg',
  strength: '/images/motivation/strength.svg',
  peace: '/images/motivation/peace.svg',
  energy: '/images/motivation/energy.svg',
  celebration: '/images/motivation/celebration.svg',
} as const;