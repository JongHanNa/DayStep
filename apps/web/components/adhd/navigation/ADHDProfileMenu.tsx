'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Settings, Crown, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { AvatarImage } from '@/components/ui/optimized-image';

type ADHDProfileMenuVariant = 'sidebar' | 'tabbar';

interface ADHDProfileMenuProps {
  variant: ADHDProfileMenuVariant;
}

/**
 * ADHD 모드 공통 프로필 메뉴 컴포넌트
 *
 * - variant='sidebar': 좌측 사이드바 상단용 (오른쪽으로 펼쳐지는 드롭다운)
 * - variant='tabbar' : 모바일 하단 탭바용 (탭바 위로 위쪽으로 펼쳐지는 드롭다운)
 */
export default function ADHDProfileMenu({ variant }: ADHDProfileMenuProps) {
  const router = useRouter();
  const { user, appUser, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  const handleAdmin = () => {
    setIsDropdownOpen(false);
    router.push('/admin');
  };

  const handleSettings = () => {
    setIsDropdownOpen(false);
    router.push('/adhd/settings');
  };

  const handlePremium = () => {
    setIsDropdownOpen(false);
    router.push('/adhd/settings/subscription');
  };

  const handleToggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const buttonCommonClasses = `
    rounded-full bg-base-300 flex items-center justify-center
    hover:bg-base-100 transition-colors
  `;

  const buttonClasses =
    variant === 'sidebar'
      ? `w-10 h-10 ${buttonCommonClasses}`
      : `w-10 h-10 ${buttonCommonClasses}`;

  const dropdownPositionClasses =
    variant === 'sidebar'
      ? 'left-full ml-2 top-0'
      : 'right-0 bottom-full mb-2';

  return (
    <div className={variant === 'sidebar' ? 'relative' : 'relative flex items-center justify-center'}>
      <div ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={buttonClasses}
          aria-label="프로필 메뉴"
          title="프로필 메뉴"
        >
          <AvatarImage
            src={user?.user_metadata?.avatar_url}
            alt="프로필"
            size={40}
            fallback={user?.email?.charAt(0).toUpperCase() || 'U'}
          />
        </button>

        {isDropdownOpen && (
          <div
            className={`absolute ${dropdownPositionClasses} w-44 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50`}
          >
            {appUser?.isAdmin && (
              <button
                onClick={handleAdmin}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 rounded-t-lg transition-colors"
              >
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm">관리자</span>
              </button>
            )}
            <button
              onClick={handleSettings}
              className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-base-200 ${appUser?.isAdmin ? '' : 'rounded-t-lg'} transition-colors`}
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
    </div>
  );
}

