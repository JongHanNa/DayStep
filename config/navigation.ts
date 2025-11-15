import {
  Home,
  Target,
  BookOpen,
  Compass,
  FolderOpen,
  CheckSquare,
  Inbox,
  Search,
  Clock,
  Calendar,
  FileText,
  Archive,
  Settings,
  User,
  Bell,
  Palette,
  Shield,
  LucideIcon
} from 'lucide-react';

// 네비게이션 그룹 타입
export type NavigationGroupType = 'start' | 'routine' | 'productivity' | 'settings';

// 메뉴 아이템 인터페이스
export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

// 네비게이션 그룹 인터페이스
export interface NavigationGroup {
  id: NavigationGroupType;
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

// 전체 네비게이션 설정
export const NAVIGATION_GROUPS: Record<NavigationGroupType, NavigationGroup> = {
  start: {
    id: 'start',
    label: '시작',
    icon: Home,
    items: [
      { id: 'areas', label: '책임', icon: Target, href: '/second-brain/areas' },
      { id: 'resources', label: '자원', icon: BookOpen, href: '/second-brain/resources' },
      { id: 'goals', label: '목표', icon: Compass, href: '/second-brain/goals' },
      { id: 'projects', label: '프로젝트', icon: FolderOpen, href: '/second-brain/projects' },
      { id: 'routine', label: '루틴', icon: CheckSquare, href: '/routine' },
    ]
  },
  routine: {
    id: 'routine',
    label: '워크플로우',
    icon: CheckSquare,
    items: [
      { id: 'inbox', label: '수집', icon: Inbox, href: '/second-brain/inbox' },
      { id: 'clarify', label: '명료화', icon: Search, href: '/second-brain/clarify' },
      { id: 'plan', label: '계획', icon: CheckSquare, href: '/second-brain/plan' },
      { id: 'review', label: '점검', icon: Target, href: '/second-brain/review' },
    ]
  },
  productivity: {
    id: 'productivity',
    label: '생산성',
    icon: Target,
    items: [
      { id: 'timeline', label: '타임라인', icon: Clock, href: '/timeline' },
      { id: 'calendar', label: '달력', icon: Calendar, href: '/second-brain/calendar' },
      { id: 'goal-compass', label: '목표 나침반', icon: Compass, href: '/second-brain/goal-compass' },
      { id: 'notes', label: '노트', icon: FileText, href: '/second-brain/notes' },
      { id: 'archive', label: '아카이브', icon: Archive, href: '/second-brain/archive' },
    ]
  },
  settings: {
    id: 'settings',
    label: '설정',
    icon: Settings,
    items: [] // 설정은 메인 페이지(/settings)만 사용, 상단 탭 없음
  }
} as const;

// 하단 네비게이션 메인 탭 배열 (순서 중요)
export const MAIN_TABS: Array<{
  id: NavigationGroupType;
  label: string;
  icon: LucideIcon;
  groupType: NavigationGroupType;
}> = [
  { id: 'start', label: '시작', icon: Home, groupType: 'start' },
  { id: 'routine', label: '워크플로우', icon: CheckSquare, groupType: 'routine' },
  { id: 'productivity', label: '생산성', icon: Target, groupType: 'productivity' },
  { id: 'settings', label: '설정', icon: Settings, groupType: 'settings' },
];

// 유틸리티 함수: 특정 그룹의 모든 경로 배열 반환
export const getGroupPaths = (groupType: NavigationGroupType): string[] => {
  return NAVIGATION_GROUPS[groupType].items.map(item => item.href);
};

// 유틸리티 함수: 현재 경로에서 활성 그룹 찾기
export const getActiveGroupFromPath = (pathname: string): NavigationGroupType | null => {
  for (const [groupType, group] of Object.entries(NAVIGATION_GROUPS)) {
    const isActive = group.items.some(item => pathname.startsWith(item.href));
    if (isActive) return groupType as NavigationGroupType;
  }
  return null;
};

// 유틸리티 함수: 현재 경로에서 활성 아이템 찾기
export const getActiveItemFromPath = (pathname: string, groupType: NavigationGroupType): NavigationItem | null => {
  const group = NAVIGATION_GROUPS[groupType];
  return group.items.find(item => pathname.startsWith(item.href)) || null;
};
