'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Settings, Crown, LogOut, Sun, Moon } from 'lucide-react';
import ADHDNavItem from './ADHDNavItem';
import { AvatarImage } from '@/components/ui/optimized-image';
import { useADHDNavigation } from './useADHDNavigation';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';

/**
 * ADHD 모드 웹용 좌측 사이드바
 *
 * md(768px) 이상에서만 표시
 * 구조: Avatar(상단 + 드롭다운) - 메인 네비게이션
 */
export default function ADHDSidebar() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { navItems, activeTab, handleNavClick } = useADHDNavigation();
  const { enterSettingsMode } = useADHDModeStore();

  // 드롭다운 상태
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // settings 제외한 메인 네비게이션 아이템
  const mainNavItems = navItems.filter(item => item.id !== 'settings');

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // 로그아웃 핸들러
  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  // 설정 모드로 전환 (URL 변경 없음)
  const handleSettings = () => {
    setIsDropdownOpen(false);
    enterSettingsMode('main');
  };

  // 구독 관리 모드로 전환 (URL 변경 없음)
  const handlePremium = () => {
    setIsDropdownOpen(false);
    enterSettingsMode('subscription');
  };

  // 다크모드 토글
  const handleToggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-base-200 border-r border-base-300 flex flex-col items-center py-4 z-30">
      {/* 상단: 사용자 아바타 + 드롭다운 */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center mb-6 hover:bg-base-100 transition-colors"
          aria-label="메뉴"
          title="메뉴"
        >
          <AvatarImage
            src={user?.user_metadata?.avatar_url}
            alt="프로필"
            size={40}
            fallback={user?.email?.charAt(0).toUpperCase() || 'U'}
          />
        </button>

        {/* 드롭다운 메뉴 */}
        {isDropdownOpen && (
          <div className="absolute left-full ml-2 top-0 w-40 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50">
            <button
              onClick={handleSettings}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 rounded-t-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">설정</span>
            </button>
            <button
              onClick={handlePremium}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 transition-colors"
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-sm">프리미엄</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">로그아웃</span>
            </button>
            {/* 다크모드 토글 */}
            <div className="flex items-center justify-between w-full px-4 py-3 border-t border-base-300">
              <div className="flex items-center gap-3">
                {resolvedTheme === 'dark' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
                <span className="text-sm">다크모드</span>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={resolvedTheme === 'dark'}
                onChange={handleToggleTheme}
              />
            </div>
          </div>
        )}
      </div>

      {/* 중앙: 메인 네비게이션 */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {mainNavItems.map(item => (
          <ADHDNavItem
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeTab === item.id}
            onClick={() => handleNavClick(item.id)}
            variant="sidebar"
          />
        ))}
      </nav>
    </aside>
  );
}
