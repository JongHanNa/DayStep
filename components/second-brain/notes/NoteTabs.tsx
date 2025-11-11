'use client';

import { Inbox, BookmarkCheck, FileText, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NoteTabType = 'inbox' | 'read_later' | 'draft' | 'area_resource';

interface NoteTabsProps {
  activeTab: NoteTabType;
  onTabChange: (tab: NoteTabType) => void;
  counts: {
    inbox: number;
    read_later: number;
    draft: number;
    area_resource: number;
  };
}

const TABS = [
  { id: 'inbox' as NoteTabType, label: '수집함', icon: Inbox },
  { id: 'read_later' as NoteTabType, label: '나중에 보기', icon: BookmarkCheck },
  { id: 'draft' as NoteTabType, label: '월고', icon: FileText },
  { id: 'area_resource' as NoteTabType, label: '영역·자원', icon: FolderOpen },
];

export default function NoteTabs({ activeTab, onTabChange, counts }: NoteTabsProps) {
  return (
    <div className="overflow-x-auto">
      <div className="tabs tabs-boxed inline-flex">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.id];

          return (
            <button
              key={tab.id}
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
          );
        })}
      </div>
    </div>
  );
}
