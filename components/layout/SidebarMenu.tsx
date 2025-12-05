'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, Settings, Plus, Filter, ChevronRight, ArrowRight, RotateCcw } from 'lucide-react';
import { useSidebarStore } from '@/state/stores/sidebarStore';
import { NAVIGATION_GROUPS, NavigationGroupType, NavigationItem } from '@/config/navigation';
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

  // 메뉴 아이템 버튼 렌더링 (공통)
  const renderMenuItem = (item: NavigationItem, indent: number = 0) => {
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
            : 'text-base-content hover:bg-base-300'
        }`}
        style={{ marginLeft: indent }}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="font-medium">{item.label}</span>
      </button>
    );
  };

  // 시작 그룹 트리 구조 렌더링
  const renderStartGroup = () => {
    const group = NAVIGATION_GROUPS.start;
    const areasResources = group.items.find(i => i.id === 'areas-resources');
    const goals = group.items.find(i => i.id === 'goals');
    const projects = group.items.find(i => i.id === 'projects');

    return (
      <div className="mb-2">
        {/* 그룹 헤더 */}
        <div className="px-5 py-2">
          <span className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
            {group.label}
          </span>
        </div>

        {/* 트리 구조: 책임/자원 → 목표 → 프로젝트 */}
        <div className="px-2">
          {/* 책임/자원 (통합 메뉴) */}
          <div>
            {areasResources && renderMenuItem(areasResources)}
          </div>

          {/* 연결선: 책임/자원 → 목표 */}
          <div className="flex items-center pl-4 py-1">
            <div className="flex items-center text-base-content/40">
              <div className="w-4 h-[2px] bg-base-content/20" />
              <ChevronRight className="w-4 h-4 -ml-1" />
            </div>
          </div>

          {/* 목표 (중간 레벨) */}
          <div className="pl-4">
            {goals && renderMenuItem(goals)}
          </div>

          {/* 연결선: 목표 → 프로젝트 */}
          <div className="flex items-center pl-8 py-1">
            <div className="flex items-center text-base-content/40">
              <div className="w-4 h-[2px] bg-base-content/20" />
              <ChevronRight className="w-4 h-4 -ml-1" />
            </div>
          </div>

          {/* 프로젝트 (최하위 레벨) */}
          <div className="pl-8">
            {projects && renderMenuItem(projects)}
          </div>
        </div>
      </div>
    );
  };

  // 워크플로우 그룹 사이클 구조 렌더링
  const renderWorkflowGroup = () => {
    const group = NAVIGATION_GROUPS.routine;
    const items = group.items;

    return (
      <div className="mb-2">
        {/* 그룹 헤더 */}
        <div className="px-5 py-2">
          <span className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
            {group.label}
          </span>
        </div>

        {/* 사이클 시각화 */}
        <div className="px-2">
          {/* 사이클 컨테이너 */}
          <div className="relative bg-base-300/50 rounded-xl p-3">
            {/* 상단: 수집 → 명료화 */}
            <div className="flex items-center gap-1">
              <div className="flex-1">{items[0] && renderMenuItem(items[0])}</div>
              <ArrowRight className="w-4 h-4 text-base-content/40 shrink-0" />
              <div className="flex-1">{items[1] && renderMenuItem(items[1])}</div>
            </div>

            {/* 중앙 연결: 순환 화살표 */}
            <div className="flex justify-between items-center py-2 px-4">
              <div className="flex items-center text-base-content/40">
                <RotateCcw className="w-3 h-3" />
                <span className="text-[10px] ml-1">사이클</span>
              </div>
              <div className="h-[2px] flex-1 mx-3 bg-gradient-to-r from-base-content/20 via-base-content/10 to-base-content/20" />
              <ArrowRight className="w-4 h-4 text-base-content/40 rotate-90" />
            </div>

            {/* 하단: 점검 ← 계획 */}
            <div className="flex items-center gap-1">
              <div className="flex-1">{items[3] && renderMenuItem(items[3])}</div>
              <ArrowRight className="w-4 h-4 text-base-content/40 shrink-0 rotate-180" />
              <div className="flex-1">{items[2] && renderMenuItem(items[2])}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 일반 그룹 렌더링 (생산성 등)
  const renderDefaultGroup = (groupType: NavigationGroupType) => {
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
          {group.items.map((item) => renderMenuItem(item))}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="left"
        className="w-[280px] sm:w-[320px] p-0 bg-base-200 flex flex-col"
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
            // 그룹별 커스텀 렌더링
            if (groupType === 'start') {
              return <div key={groupType}>{renderStartGroup()}</div>;
            }
            if (groupType === 'routine') {
              return <div key={groupType}>{renderWorkflowGroup()}</div>;
            }
            return <div key={groupType}>{renderDefaultGroup(groupType)}</div>;
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
