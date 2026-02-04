import {
  Flag,
  Users,
  BarChart3,
  Sparkles,
  MessageSquare,
  BookOpen,
  Clock,
  Target,
  Lightbulb,
  Inbox,
  PenLine,
  MessageCircle,
  Heart,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// 타입 정의
// ============================================================================

export type ADHDGroupId = 'dashboard' | 'project' | 'fuel' | 'relationship';

export type ADHDSubViewId =
  | 'banner'
  | 'contact'
  | 'activity'
  | 'ai-plan'
  | 'ai-chat'
  | 'guide'
  | 'timeline'
  | 'execute'
  | 'motivation'
  | 'organize'
  | 'record'
  | 'news'
  | 'gratitude';

export interface ADHDScreenHelp {
  title: string;
  difficulty: string;
  help: string;
}

export interface ADHDScreenItem {
  id: ADHDSubViewId;
  label: string;
  icon: LucideIcon;
  isPro?: boolean;
  help?: ADHDScreenHelp;
}

export interface ADHDScreenGroup {
  id: ADHDGroupId;
  title: string;
  items: ADHDScreenItem[];
}

// ============================================================================
// 화면 데이터 (Single Source of Truth)
// ============================================================================

export const ADHD_SCREENS: Record<ADHDGroupId, ADHDScreenGroup> = {
  dashboard: {
    id: 'dashboard',
    title: '대시보드',
    items: [
      { id: 'banner', label: '배너', icon: Flag },
      { id: 'contact', label: '연락', icon: Users, isPro: true },
      { id: 'activity', label: '활동', icon: BarChart3, isPro: true },
    ],
  },
  project: {
    id: 'project',
    title: '미룸방지',
    items: [
      { id: 'ai-plan', label: 'AI 계획', icon: Sparkles },
      { id: 'ai-chat', label: 'AI 채팅', icon: MessageSquare },
      { id: 'guide', label: '가이드', icon: BookOpen },
    ],
  },
  fuel: {
    id: 'fuel',
    title: '머릿속정리',
    items: [
      {
        id: 'timeline',
        label: '타임라인',
        icon: Clock,
        help: {
          title: '타임라인',
          difficulty:
            '자기 모니터링(Self-Monitoring) 결함. "내가 뭘 했지?" 파악이 어렵습니다.',
          help: '완료한 할일 시간순 시각화 → 작은 성취도 눈에 보임, 자기효능감 강화!',
        },
      },
      {
        id: 'execute',
        label: '실행',
        icon: Target,
        help: {
          title: '실행',
          difficulty:
            '과제 시작의 어려움(Task Initiation). 해야 할 건 알지만 시작 버튼이 안 눌려요.',
          help: '타이머 + 방해차단 + 원동력 상기 → 시작의 마찰을 줄여 첫 발을 내딛도록 도움!',
        },
      },
      {
        id: 'motivation',
        label: '원동력',
        icon: Lightbulb,
        help: {
          title: '원동력',
          difficulty:
            '동기 유지 결함(Motivation Deficit). 중요한 건 알지만 하고 싶은 마음이 안 생겨요.',
          help: '왜 해야 하는지, 완료 후 기분을 미리 적어두고 → 실행 전 다시 보며 동기 충전!',
        },
      },
      {
        id: 'organize',
        label: '정리',
        icon: Inbox,
        help: {
          title: '정리',
          difficulty:
            '조직화 결함. 머릿속이 복잡하고 할일이 뒤엉켜 어디서 시작할지 막막해요.',
          help: '미분류 할일만 모아서 표시 → 정리해야 할 것만 집중, 인지 부하 감소!',
        },
      },
    ],
  },
  relationship: {
    id: 'relationship',
    title: '관계기록',
    items: [
      {
        id: 'record',
        label: '기록',
        icon: PenLine,
        help: {
          title: '기록',
          difficulty:
            '작업기억(Working Memory) 결함으로 대화 내용, 약속, 부탁 등을 쉽게 잊어버립니다. "들었는데 기억이 안 나요"',
          help: '만남 직후 바로 기록 → 외부 기억 저장소 역할. 부탁/약속을 할일로 연동하여 잊어버림 방지!',
        },
      },
      {
        id: 'news',
        label: '소식',
        icon: MessageCircle,
        isPro: true,
        help: {
          title: '소식',
          difficulty:
            '시간 감각 왜곡(Time Blindness)으로 "언제 연락했더라?" 추적이 어렵습니다. 관계 소홀 인식이 늦어요.',
          help: '기록된 소식을 시간순 조회 → 연락 빈도 시각화, 소홀한 관계 파악에 도움!',
        },
      },
      {
        id: 'gratitude',
        label: '감사',
        icon: Heart,
        isPro: true,
        help: {
          title: '감사',
          difficulty:
            '부정 편향(Negativity Bias) 강화. 감정 조절 어려움으로 좌절감에 쉽게 압도됩니다.',
          help: '감사한 순간 기록 → 긍정 경험 의도적 회상, 정서 균형 회복에 도움!',
        },
      },
    ],
  },
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 모든 서브뷰의 아이콘/레이블 설정을 반환
 * ADHDSidebar, ADHDBottomTabBar에서 사용
 */
export const getSubViewConfig = (): Record<
  string,
  { icon: LucideIcon; label: string }
> => {
  const config: Record<string, { icon: LucideIcon; label: string }> = {};

  Object.values(ADHD_SCREENS).forEach((group) => {
    group.items.forEach((item) => {
      config[item.id] = { icon: item.icon, label: item.label };
    });
  });

  return config;
};

/**
 * 특정 그룹의 Pro 전용 탭 ID 목록 반환
 */
export const getProOnlyTabIds = <T extends string>(
  groupId: ADHDGroupId
): T[] => {
  const group = ADHD_SCREENS[groupId];
  if (!group) return [];

  return group.items
    .filter((item) => item.isPro)
    .map((item) => item.id as T);
};

/**
 * 특정 그룹의 탭 목록을 React 컴포넌트용 형태로 변환
 */
export const getGroupTabs = (groupId: ADHDGroupId) => {
  const group = ADHD_SCREENS[groupId];
  if (!group) return [];

  return group.items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    proOnly: item.isPro,
  }));
};

/**
 * 특정 그룹의 도움말 콘텐츠 맵 반환
 */
export const getGroupHelpContent = (
  groupId: ADHDGroupId
): Record<string, ADHDScreenHelp> => {
  const group = ADHD_SCREENS[groupId];
  if (!group) return {};

  const helpContent: Record<string, ADHDScreenHelp> = {};

  group.items.forEach((item) => {
    if (item.help) {
      helpContent[item.id] = item.help;
    }
  });

  return helpContent;
};
