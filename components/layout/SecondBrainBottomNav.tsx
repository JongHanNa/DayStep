'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Inbox, Search, Target, CheckSquare, Clock, Compass, FileText, Archive, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabItems = [
  { id: 'start', label: '시작', icon: Home, href: '/second-brain/start' },
  { id: 'inbox', label: '수집', icon: Inbox, href: '/second-brain/inbox' },
  { id: 'clarify', label: '명료화', icon: Search, href: '/second-brain/clarify' },
  { id: 'plan', label: '계획', icon: CheckSquare, href: '/second-brain/plan' },
  { id: 'review', label: '점검', icon: Target, href: '/second-brain/review' },
  { id: 'timeline', label: '타임라인', icon: Clock, href: '/' },
  { id: 'goals', label: '목표', icon: Compass, href: '/second-brain/goals' },
  { id: 'notes', label: '노트', icon: FileText, href: '/second-brain/notes' },
  { id: 'archive', label: '아카이브', icon: Archive, href: '/second-brain/archive' },
  { id: 'settings', label: '설정', icon: Settings, href: '/settings' },
];

export default function SecondBrainBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 safe-area-bottom z-50">
      {/* 가로 스크롤 컨테이너 */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max px-2 py-1">
          {tabItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
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
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
