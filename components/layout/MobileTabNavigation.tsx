'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Clock, Settings } from 'lucide-react';
import { usePlatformUI } from '@/hooks/usePlatformUI';

const tabItems = [
  {
    id: 'timeline',
    label: '타임라인',
    icon: Clock,
    href: '/',
  },
  {
    id: 'settings',
    label: '설정',
    icon: Settings,
    href: '/settings',
  },
];

export function MobileTabNavigation() {
  const pathname = usePathname();
  const { isMobile } = usePlatformUI();

  // 데스크탑에서는 렌더링하지 않음
  if (!isMobile) {
    return null;
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-center h-16 px-4">
        {tabItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-4 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`${item.label} 탭`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}