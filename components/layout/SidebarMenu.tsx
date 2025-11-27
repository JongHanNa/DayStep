'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, Settings, Plus, Filter } from 'lucide-react';
import { useSidebarStore } from '@/state/stores/sidebarStore';
import { NAVIGATION_GROUPS, NavigationGroupType } from '@/config/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import Image from 'next/image';

export default function SidebarMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, close } = useSidebarStore();
  const { appUser, user } = useAuth();

  // 사용자 이름과 아바타
  const userName = appUser?.name || user?.email?.split('@')[0] || '사용자';
  const userAvatar = user?.user_metadata?.avatar_url as string | undefined;

  const handleNavigate = (href: string) => {
    router.push(href);
    close();
  };

  const handleSettingsClick = () => {
    router.push('/settings');
    close();
  };

  // 그룹 순서 정의 (설정 제외)
  const groupOrder: NavigationGroupType[] = ['start', 'routine', 'productivity'];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="left"
        className="w-[280px] sm:w-[320px] p-0 bg-base-300 flex flex-col"
        hideOverlay
      >
        {/* 접근성을 위한 숨겨진 제목/설명 */}
        <SheetTitle className="sr-only">네비게이션 메뉴</SheetTitle>
        <SheetDescription className="sr-only">앱 네비게이션 메뉴입니다</SheetDescription>

        {/* 프로필 영역 */}
        <div className="p-5 border-b border-base-200 safe-area-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 아바타 */}
              <div className="relative">
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={userName}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-content text-lg font-semibold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* 프리미엄 뱃지 */}
                {appUser?.hasActiveSubscription && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px]">👑</span>
                  </div>
                )}
              </div>
              {/* 이름 */}
              <span className="font-semibold text-base-content text-lg">
                {userName}
              </span>
            </div>

            {/* 알림/설정 아이콘 */}
            <div className="flex items-center gap-1">
              <button
                className="btn btn-ghost btn-circle btn-sm"
                aria-label="알림"
              >
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={handleSettingsClick}
                className="btn btn-ghost btn-circle btn-sm"
                aria-label="설정"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 메뉴 영역 */}
        <div className="flex-1 overflow-y-auto py-2">
          {groupOrder.map((groupType) => {
            const group = NAVIGATION_GROUPS[groupType];
            if (!group.items.length) return null;

            return (
              <div key={groupType} className="mb-2">
                {/* 그룹 헤더 */}
                <div className="px-5 py-2">
                  <span className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>

                {/* 메뉴 아이템들 */}
                <div className="px-2">
                  {group.items.map((item) => {
                    // 루트 경로('/')는 정확히 일치할 때만 활성화, 나머지는 startsWith 사용
                    const isActive = item.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.href)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                          isActive
                            ? 'bg-primary text-primary-content'
                            : 'text-base-content hover:bg-base-200'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 고정 버튼 */}
        <div className="p-4 border-t border-base-200 safe-area-bottom">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                // TODO: 추가 기능 구현
                close();
              }}
              className="btn btn-ghost gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>추가</span>
            </button>
            <button
              className="btn btn-ghost btn-circle"
              aria-label="필터"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
