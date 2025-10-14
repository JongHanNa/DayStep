'use client';

import { memo } from 'react';
import type { Project } from '@/types/second-brain';

interface ProjectStatusTabsProps {
  projects: Project[];
  selectedStatus: 'not_started' | 'active' | 'on_hold' | 'completed';
  onStatusChange: (status: 'not_started' | 'active' | 'on_hold' | 'completed') => void;
}

const ProjectStatusTabs = memo(function ProjectStatusTabs({
  projects,
  selectedStatus,
  onStatusChange,
}: ProjectStatusTabsProps) {
  // 각 상태별 프로젝트 개수 계산
  const statusCounts = {
    not_started: projects.filter((p) => p.status === 'not_started').length,
    active: projects.filter((p) => p.status === 'active').length,
    on_hold: projects.filter((p) => p.status === 'on_hold').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  };

  const tabs = [
    { value: 'not_started' as const, label: '시작 안함', count: statusCounts.not_started },
    { value: 'active' as const, label: '진행중', count: statusCounts.active },
    { value: 'on_hold' as const, label: '중단', count: statusCounts.on_hold },
    { value: 'completed' as const, label: '완료', count: statusCounts.completed },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
      {tabs.map((tab) => {
        const isSelected = selectedStatus === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onStatusChange(tab.value)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors
              ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-base-200 hover:bg-base-300 text-base-content'
              }
            `}
            aria-label={`${tab.label} 프로젝트 ${tab.count}개`}
            aria-pressed={isSelected}
          >
            <span>{tab.label}</span>
            <span
              className={`
                badge badge-sm
                ${isSelected ? 'badge-ghost' : 'bg-base-300'}
              `}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
});

export default ProjectStatusTabs;
