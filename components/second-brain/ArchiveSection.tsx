'use client';

import { memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Goal, Project, AreaResource } from '@/types/second-brain';
import ArchiveCard from './ArchiveCard';

interface ArchiveSectionProps {
  title: string;
  items: (Goal | Project | AreaResource)[];
  type: 'goal' | 'project' | 'area-resource';
  isExpanded: boolean;
  onToggle: () => void;
  onEditItem: (item: Goal | Project | AreaResource) => void;
  // 목표: 하위 프로젝트 정보 맵
  projectStatsMap?: Map<string, { total: number; inProgress: number; notStarted: number }>;
  // 프로젝트: 하위 할일 정보 맵
  todoStatsMap?: Map<string, { total: number; inProgress: number; completed: number }>;
  // 프로젝트: 목표 제목 맵
  goalTitleMap?: Map<string, string>;
  iconColor?: string;
}

const ArchiveSection = memo(function ArchiveSection({
  title,
  items,
  type,
  isExpanded,
  onToggle,
  onEditItem,
  projectStatsMap,
  todoStatsMap,
  goalTitleMap,
  iconColor = '#9ca3af',
}: ArchiveSectionProps) {
  return (
    <div className="border-b border-base-300 last:border-b-0">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent hover:opacity-80 transition-opacity"
        aria-label={`${title} 섹션 ${isExpanded ? '접기' : '펼치기'}`}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {/* 색상 인디케이터 */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: iconColor }}
          />
          {/* 섹션명 */}
          <span className="font-semibold text-base">{title}</span>
          {/* 항목 개수 뱃지 */}
          <span className="badge badge-sm">{items.length}</span>
        </div>
        {/* 펼치기 아이콘 */}
        <ChevronDown
          className={cn(
            'w-5 h-5 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* 항목 목록 */}
      {isExpanded && (
        <div className="px-4 pb-3">
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="card bg-base-200">
                <div className="card-body text-center py-8">
                  <p className="text-base-content/60">
                    {type === 'goal' ? '중단/완료된 목표가 없습니다.' :
                     type === 'project' ? '중단/완료된 프로젝트가 없습니다.' :
                     '아카이브된 영역/자원이 없습니다.'}
                  </p>
                </div>
              </div>
            ) : (
              items.map((item) => {
                // 목표: 하위 프로젝트 현황
                const projectStats = type === 'goal' && projectStatsMap
                  ? projectStatsMap.get(item.id)
                  : undefined;

                // 프로젝트: 하위 할일 현황
                const todoStats = type === 'project' && todoStatsMap
                  ? todoStatsMap.get(item.id)
                  : undefined;

                // 프로젝트: 목표 제목
                const goalTitle = type === 'project' && goalTitleMap
                  ? goalTitleMap.get(item.id)
                  : undefined;

                // 달성률
                const progress = 'progress' in item ? item.progress || 0 : 0;

                return (
                  <ArchiveCard
                    key={`${type}-${item.id}`}
                    item={item}
                    type={type}
                    onEditClick={onEditItem}
                    projectStats={projectStats}
                    todoStats={todoStats}
                    progress={progress}
                    goalTitle={goalTitle}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default ArchiveSection;
