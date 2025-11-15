'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useModalStore } from '@/state/stores/modalStore';
import { useNavigationStore } from '@/state/stores/navigationStore';
import { MAIN_TABS, getActiveGroupFromPath, NavigationGroupType, NAVIGATION_GROUPS } from '@/config/navigation';

export default function SecondBrainBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
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

  // 현재 경로가 어느 그룹에 속하는지 확인 (중앙화된 함수 사용)
  const activeGroupFromPath = getActiveGroupFromPath(pathname || '');

  // 탭 클릭 핸들러
  const handleTabClick = (groupType: NavigationGroupType) => {
    // 같은 그룹을 다시 클릭하면 닫기 (토글)
    if (selectedGroup === groupType) {
      clearSelectedGroup();
    } else {
      // settings 그룹은 메인 페이지로 직접 이동
      if (groupType === 'settings') {
        setSelectedGroup(groupType);
        router.push('/settings');
      } else {
        // 다른 그룹이면 해당 그룹의 첫 번째 탭으로 이동
        const group = NAVIGATION_GROUPS[groupType];
        const firstItem = group.items[0];

        if (firstItem) {
          setSelectedGroup(groupType);
          router.push(firstItem.href);
        }
      }
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 safe-area-bottom z-50">
      <div className="flex justify-around items-center px-2 py-1">
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon;

          // 활성 상태 결정: 그룹 선택 또는 현재 경로 기반
          const isActive = selectedGroup === tab.groupType ||
                          (selectedGroup === null && activeGroupFromPath === tab.groupType);

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.groupType)}
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
  );
}
