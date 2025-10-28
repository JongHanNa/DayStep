'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Home, CheckSquare, Target, Settings, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModalStore } from '@/state/stores/modalStore';
import { useNavigationStore } from '@/state/stores/navigationStore';
import GroupMenu from './GroupMenu';

interface MainTab {
  id: string;
  label: string;
  icon: typeof Home;
  href?: string;
  groupType?: 'routine' | 'productivity' | 'start';
}

const mainTabs: MainTab[] = [
  { id: 'system-info', label: '시스템 설명', icon: BookOpen, href: '/second-brain/start' },
  { id: 'start', label: '시작', icon: Home, groupType: 'start' },
  { id: 'routine', label: '워크플로우', icon: CheckSquare, groupType: 'routine' },
  { id: 'productivity', label: '생산성', icon: Target, groupType: 'productivity' },
  { id: 'settings', label: '설정', icon: Settings, href: '/settings' },
];

// 시작 그룹 경로
const startPaths = [
  '/second-brain/areas',
  '/second-brain/resources',
  '/second-brain/goals',
  '/second-brain/projects',
  '/routine',
];

// 루틴 그룹 경로
const routinePaths = [
  '/second-brain/inbox',
  '/second-brain/clarify',
  '/second-brain/plan',
  '/second-brain/review',
];

// 생산성 그룹 경로
const productivityPaths = [
  '/timeline',
  '/second-brain/goal-compass',
  '/second-brain/notes',
  '/second-brain/archive',
];

export default function SecondBrainBottomNav() {
  const pathname = usePathname();
  const isModalOpen = useModalStore((state) => state.isModalOpen);
  const { selectedGroup, setSelectedGroup, clearSelectedGroup } = useNavigationStore();

  // pathname이 변경되면 그룹 메뉴 자동 닫기
  useEffect(() => {
    clearSelectedGroup();
  }, [pathname, clearSelectedGroup]);

  // 네비게이션을 숨길 페이지 목록
  const hiddenPaths = ['/', '/login'];
  const isOnboarding = pathname?.startsWith('/second-brain/onboarding');
  const isHiddenPath = hiddenPaths.includes(pathname || '');

  // 모달이 열려있으면 네비게이션 숨기기
  if (isModalOpen) {
    return null;
  }

  // 온보딩, 랜딩, 로그인 페이지에서는 네비게이션 숨기기
  if (isOnboarding || isHiddenPath) {
    return null;
  }

  // 현재 경로가 어느 그룹에 속하는지 확인
  const normalizedPathname = pathname?.replace(/\/$/, '') || '';
  const isStartActive = startPaths.some(
    (path) => normalizedPathname === path.replace(/\/$/, '')
  );
  const isRoutineActive = routinePaths.some(
    (path) => normalizedPathname === path.replace(/\/$/, '')
  );
  const isProductivityActive = productivityPaths.some(
    (path) => normalizedPathname === path.replace(/\/$/, '')
  );

  // 탭 클릭 핸들러 (토글 기능)
  const handleTabClick = (tab: MainTab) => {
    if (tab.groupType) {
      // 같은 그룹을 다시 클릭하면 닫기 (토글)
      if (selectedGroup === tab.groupType) {
        clearSelectedGroup();
      } else {
        // 다른 그룹이면 전환
        setSelectedGroup(tab.groupType);
      }
    }
  };

  return (
    <>
      {/* 그룹 메뉴 (조건부 렌더링) */}
      {selectedGroup && <GroupMenu groupType={selectedGroup} />}

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 safe-area-bottom z-50">
        <div className="flex justify-around items-center px-2 py-1">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            let isActive = false;

            // 활성 상태 결정
            if (tab.href) {
              const normalizedHref = tab.href.replace(/\/$/, '');
              isActive = normalizedPathname === normalizedHref;
            } else if (tab.groupType === 'start') {
              // 시작 메뉴창이 열려있으면 활성화, 닫혀있으면 경로 기반 활성화
              isActive = selectedGroup === 'start' || (selectedGroup === null && isStartActive);
            } else if (tab.groupType === 'routine') {
              // 루틴 메뉴창이 열려있으면 활성화, 닫혀있으면 경로 기반 활성화
              isActive = selectedGroup === 'routine' || (selectedGroup === null && isRoutineActive);
            } else if (tab.groupType === 'productivity') {
              // 생산성 메뉴창이 열려있으면 활성화, 닫혀있으면 경로 기반 활성화
              isActive = selectedGroup === 'productivity' || (selectedGroup === null && isProductivityActive);
            }

            // 링크 또는 버튼
            if (tab.href) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    'flex flex-col items-center justify-center',
                    'min-w-[70px] px-3 py-2 rounded-lg',
                    'transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-content'
                      : 'text-base-content/70 hover:bg-base-200 active:scale-95'
                  )}
                >
                  <Icon className={cn('w-5 h-5 mb-1', isActive ? 'stroke-[2.5]' : 'stroke-2')} />
                  <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  'flex flex-col items-center justify-center',
                  'min-w-[70px] px-3 py-2 rounded-lg',
                  'transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-content'
                    : 'text-base-content/70 hover:bg-base-200 active:scale-95'
                )}
              >
                <Icon className={cn('w-5 h-5 mb-1', isActive ? 'stroke-[2.5]' : 'stroke-2')} />
                <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
