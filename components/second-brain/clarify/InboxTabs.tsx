'use client';

import { Zap, FileText, Folder, Target } from 'lucide-react';

export type InboxTabType = 'todos' | 'notes' | 'projects' | 'goals';

interface InboxTabsProps {
  activeTab: InboxTabType;
  onTabChange: (tab: InboxTabType) => void;
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

export default function InboxTabs({ activeTab, onTabChange, counts }: InboxTabsProps) {
  return (
    <div className="flex gap-2 p-2 bg-base-200 rounded-full overflow-x-auto scrollbar-hide">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200
              ${isActive ? 'bg-primary text-primary-content scale-105 shadow-lg' : 'bg-transparent hover:bg-base-300'}
            `}
          >
            <Icon className="w-4 h-4" />
            <span className="font-medium">{tab.label}</span>
            {count > 0 && (
              <span
                className={`
                  badge badge-sm
                  ${isActive ? 'badge-neutral' : 'badge-primary'}
                `}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
