'use client';

import { Target, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SubTabType = 'areas' | 'resources';

interface AreaResourceSubTabsProps {
  activeSubTab: SubTabType;
  onSubTabChange: (subTab: SubTabType) => void;
  counts: {
    areas: number;
    resources: number;
  };
}

const SUB_TABS = [
  { id: 'areas' as SubTabType, label: '영역', icon: Target },
  { id: 'resources' as SubTabType, label: '자원', icon: Archive },
];

export default function AreaResourceSubTabs({
  activeSubTab,
  onSubTabChange,
  counts,
}: AreaResourceSubTabsProps) {
  return (
    <div className="overflow-x-auto">
      <div className="tabs tabs-boxed inline-flex">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => onSubTabChange(tab.id)}
              className={cn('tab', activeSubTab === tab.id && 'tab-active')}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
              {count > 0 && (
                <span className="ml-1 badge badge-sm">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
