'use client';

import { Home, BookHeart, Lightbulb, Settings, LucideIcon } from 'lucide-react';
import { NavItemId } from './useADHDNavigation';

// 아이콘 매핑
const iconMap: Record<string, LucideIcon> = {
  Home,
  BookHeart,
  Lightbulb,
  Settings,
};

interface ADHDNavItemProps {
  id: NavItemId;
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  variant: 'sidebar' | 'tabbar';
}

/**
 * ADHD 네비게이션 아이템 컴포넌트
 *
 * 사이드바와 하단탭에서 공통으로 사용
 */
export default function ADHDNavItem({
  id,
  label,
  icon,
  isActive,
  onClick,
  variant,
}: ADHDNavItemProps) {
  const IconComponent = iconMap[icon];

  if (!IconComponent) {
    console.warn(`Icon not found: ${icon}`);
    return null;
  }

  if (variant === 'sidebar') {
    return (
      <button
        onClick={onClick}
        className={`
          w-12 h-12 flex items-center justify-center rounded-xl
          transition-all duration-200 group relative
          ${isActive
            ? 'bg-primary text-primary-content'
            : 'text-base-content/60 hover:bg-base-300 hover:text-base-content'
          }
        `}
        aria-label={label}
        title={label}
      >
        <IconComponent className="w-6 h-6" />
        {/* 툴팁 */}
        <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-base-300 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {label}
        </span>
      </button>
    );
  }

  // tabbar variant
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex flex-col items-center justify-center gap-1 py-2
        transition-all duration-200
        ${isActive
          ? 'text-primary'
          : 'text-base-content/50 active:text-base-content/70'
        }
      `}
      aria-label={label}
    >
      <IconComponent className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
