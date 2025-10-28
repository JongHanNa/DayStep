'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Inbox, Search, CheckSquare, Target, Clock, Compass, FileText, Archive, BookOpen, FolderOpen, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/state/stores/navigationStore';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

interface GroupMenuProps {
  groupType: 'routine' | 'productivity' | 'start';
}

const menuItems: Record<'routine' | 'productivity' | 'start', MenuItem[]> = {
  routine: [
    { id: 'inbox', label: '수집', icon: Inbox, href: '/second-brain/inbox' },
    { id: 'clarify', label: '명료화', icon: Search, href: '/second-brain/clarify' },
    { id: 'plan', label: '계획', icon: CheckSquare, href: '/second-brain/plan' },
    { id: 'review', label: '점검', icon: Target, href: '/second-brain/review' },
  ],
  productivity: [
    { id: 'timeline', label: '타임라인', icon: Clock, href: '/timeline' },
    { id: 'goal-compass', label: '목표 나침반', icon: Compass, href: '/second-brain/goal-compass' },
    { id: 'notes', label: '노트', icon: FileText, href: '/second-brain/notes' },
    { id: 'archive', label: '아카이브', icon: Archive, href: '/second-brain/archive' },
  ],
  start: [
    { id: 'areas', label: '책임', icon: Target, href: '/second-brain/areas' },
    { id: 'resources', label: '자원', icon: BookOpen, href: '/second-brain/resources' },
    { id: 'goals', label: '목표', icon: Compass, href: '/second-brain/goals' },
    { id: 'projects', label: '프로젝트', icon: FolderOpen, href: '/second-brain/projects' },
    { id: 'routine', label: '루틴', icon: CheckSquare, href: '/routine' },
  ],
};

export default function GroupMenu({ groupType }: GroupMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { clearSelectedGroup } = useNavigationStore();
  const items = menuItems[groupType];

  // 화면 크기 감지 (모바일: ≤640px)
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileScreen(window.innerWidth <= 640);
    };

    // 초기 체크
    checkScreenSize();

    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 클릭한 버튼 위치에 맞게 꼬리 위치 계산
  // 하단 네비: [시스템 설명(0), 시작(1), 루틴(2), 생산성(3), 설정(4)]
  const totalTabs = 5;
  const buttonIndex = groupType === 'start' ? 1 : groupType === 'routine' ? 2 : 3;

  // 화면 중앙을 기준으로 버튼까지의 상대 위치 계산
  const containerCenter = 50; // 말풍선 중앙 (화면 기준 50%)
  const buttonScreenPosition = ((buttonIndex + 0.5) / totalTabs) * 100; // 37.5% 또는 62.5%
  const offset = buttonScreenPosition - containerCenter; // -12.5% 또는 +12.5%
  const tailPosition = `calc(50% + ${offset}vw)`;

  // 꼬리 표시 조건: Capacitor 환경 OR 웹 모바일 화면
  const shouldShowTail =
    process.env.BUILD_TARGET === 'mobile' ||
    (process.env.BUILD_TARGET === 'web' && isMobileScreen);

  const handleItemClick = (href: string) => {
    router.push(href);
    // clearSelectedGroup() 제거 - 메뉴는 조건부 렌더링으로 자동 처리됨
  };

  const handleBackdropClick = () => {
    clearSelectedGroup();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* 배경 (클릭 시 닫힘, 블러 없이 투명) */}
      <div
        className="absolute inset-0 bg-transparent"
        onClick={handleBackdropClick}
      />

      {/* 말풍선 메뉴 컨테이너 - 하단 네비 위 */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center px-4 animate-slide-up-fade">
        {/* 말풍선 박스 */}
        <div className="relative bg-base-100 rounded-3xl shadow-2xl border border-base-300 min-w-[280px] max-w-[90vw]">
          {/* 하단 삼각형 꼬리 (클릭한 버튼 위치) - Capacitor 또는 웹 모바일 화면에서 표시 */}
          {shouldShowTail && (
            <div
              className="absolute -bottom-3 transform -translate-x-1/2"
              style={{ left: tailPosition }}
            >
              <div className="w-6 h-6 bg-base-100 border-r border-b border-base-300 rotate-45" />
            </div>
          )}

          {/* 메뉴 아이템 - 4x1 가로 스크롤 */}
          <div className="flex justify-center overflow-x-auto scrollbar-hide gap-2 px-4 py-3">
            {items.map((item) => {
              const Icon = item.icon;
              const normalizedPathname = pathname?.replace(/\/$/, '') || '';
              const normalizedHref = item.href.replace(/\/$/, '');
              const isActive = normalizedPathname === normalizedHref;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.href)}
                  className={cn(
                    'flex flex-col items-center justify-center flex-shrink-0',
                    'px-4 py-3 rounded-2xl min-w-[70px]',
                    'transition-all duration-200',
                    'active:scale-95',
                    isActive
                      ? 'bg-primary text-primary-content'
                      : 'bg-transparent hover:bg-primary hover:text-primary-content'
                  )}
                >
                  <Icon className="w-6 h-6 mb-1.5" />
                  <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
