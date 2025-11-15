'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  NAVIGATION_GROUPS,
  NavigationGroupType,
  getActiveItemFromPath
} from '@/config/navigation';

interface DynamicTopTabsProps {
  groupType: NavigationGroupType;
}

export default function DynamicTopTabs({ groupType }: DynamicTopTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);

  const group = NAVIGATION_GROUPS[groupType];
  const activeItem = getActiveItemFromPath(pathname, groupType);

  // Fade-in 애니메이션 (그룹 변경 시에만)
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [groupType]);

  const handleTabClick = (href: string) => {
    router.push(href);
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-[60] h-auto bg-base-100 border-b border-base-300',
        'transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* 스크롤 가능한 탭 컨테이너 */}
      <div className="overflow-x-auto scrollbar-hide">
        <nav className="flex gap-2 px-4 pt-3 pb-3 max-sm:pt-10 min-w-max">
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem?.id === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.href)}
                className={cn(
                  // 기본 스타일
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'whitespace-nowrap transition-all duration-200',
                  'text-sm font-medium',

                  // 활성 상태
                  isActive && [
                    'bg-primary text-primary-content',
                    'font-semibold shadow-sm'
                  ],

                  // 비활성 상태
                  !isActive && [
                    'text-base-content/70 hover:text-base-content',
                    'hover:bg-base-200'
                  ]
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 그룹 제목 표시 (선택적, 필요시 활성화) */}
      {/*
      <div className="px-4 py-2 text-xs text-base-content/50 border-t border-base-300">
        {group.label}
      </div>
      */}
    </div>
  );
}
