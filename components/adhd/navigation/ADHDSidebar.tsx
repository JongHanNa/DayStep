'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { User } from 'lucide-react';
import ADHDNavItem from './ADHDNavItem';
import { useADHDNavigation } from './useADHDNavigation';

/**
 * ADHD 모드 웹용 좌측 사이드바
 *
 * md(768px) 이상에서만 표시
 * 구조: Avatar(상단) - 메인 네비게이션 - Settings(하단)
 */
export default function ADHDSidebar() {
  const router = useRouter();
  const { user } = useAuth();
  const { navItems, activeTab, handleNavClick } = useADHDNavigation();

  // settings 제외한 메인 네비게이션 아이템
  const mainNavItems = navItems.filter(item => item.id !== 'settings');
  const settingsItem = navItems.find(item => item.id === 'settings');

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-base-200 border-r border-base-300 flex flex-col items-center py-4 z-30">
      {/* 상단: 사용자 아바타 */}
      <button
        onClick={() => router.push('/settings')}
        className="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center mb-6 hover:bg-base-100 transition-colors"
        aria-label="설정"
        title="설정"
      >
        {user?.user_metadata?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.user_metadata.avatar_url}
            alt="프로필"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <User className="w-5 h-5 text-base-content/60" />
        )}
      </button>

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

      {/* 하단: 설정 */}
      {settingsItem && (
        <div className="mt-auto">
          <ADHDNavItem
            id={settingsItem.id}
            label={settingsItem.label}
            icon={settingsItem.icon}
            isActive={activeTab === settingsItem.id}
            onClick={() => handleNavClick(settingsItem.id)}
            variant="sidebar"
          />
        </div>
      )}
    </aside>
  );
}
