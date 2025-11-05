'use client';

import { Zap, FileText, Folder, Target, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InboxTabType = 'todos' | 'notes' | 'projects' | 'goals';

interface InboxTabsProps {
  activeTab: InboxTabType;
  onTabChange: (tab: InboxTabType) => void;
  onGuideClick: (tab: InboxTabType) => void;
  counts: {
    todos: number;
    notes: number;
    projects: number;
    goals: number;
  };
}

const TABS = [
  { id: 'todos' as InboxTabType, label: '할일 수집함', icon: Zap },
  { id: 'notes' as InboxTabType, label: '노트 수집함', icon: FileText },
  { id: 'projects' as InboxTabType, label: '프로젝트 수집함', icon: Folder },
  { id: 'goals' as InboxTabType, label: '목표 수집함', icon: Target },
];

export default function InboxTabs({ activeTab, onTabChange, onGuideClick, counts }: InboxTabsProps) {
  return (
    <div className="overflow-x-auto">
      <div className="tabs tabs-boxed inline-flex">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.id];

          return (
            <div key={tab.id} className="relative flex items-center">
              <button
                onClick={() => onTabChange(tab.id)}
                className={cn('tab', activeTab === tab.id && 'tab-active')}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 badge badge-sm">
                    {count}
                  </span>
                )}
              </button>
              {/* 정보 아이콘 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGuideClick(tab.id);
                }}
                className="ml-1 p-1 hover:bg-base-300/50 rounded-full transition-colors"
                aria-label={`${tab.label} 가이드 보기`}
              >
                <Info className="w-4 h-4 text-base-content/50" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
