'use client';

import { Folder, FolderOpen } from 'lucide-react';
import type { Project } from '@/types/second-brain';
import { getUnifiedIcon, type UnifiedIconKey } from '@/lib/icon-collection';

interface ProjectTabsProps {
  allProjects: Project[]; // 전체 프로젝트 (카운트 계산용)
  projects: Project[]; // 필터링된 프로젝트 (표시용)
  projectFilterType: 'in_progress' | 'not_started';
  onProjectFilterChange: (type: 'in_progress' | 'not_started') => void;
  onProjectClick: (project: Project) => void;
}

export default function ProjectTabs({
  allProjects,
  projects,
  projectFilterType,
  onProjectFilterChange,
  onProjectClick,
}: ProjectTabsProps) {
  // 프로젝트 상태별 카운트 계산 (전체 프로젝트에서 계산)
  const activeCount = allProjects.filter(p => p.status === 'in_progress').length;
  const notStartedCount = allProjects.filter(p => p.status === 'not_started').length;

  return (
    <div className="bg-base-200 border-b border-base-300">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* 프로젝트 상태 필터 탭 (클릭 가능) */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onProjectFilterChange('in_progress')}
            className={`btn btn-sm ${projectFilterType === 'in_progress' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
          >
            <FolderOpen className="w-4 h-4" />
            <span className="text-sm">진행중인 프로젝트</span>
            <span className="badge badge-sm bg-base-100">{activeCount}</span>
          </button>
          <button
            onClick={() => onProjectFilterChange('not_started')}
            className={`btn btn-sm ${projectFilterType === 'not_started' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
          >
            <Folder className="w-4 h-4" />
            <span className="text-sm">시작 안한 프로젝트</span>
            <span className="badge badge-sm bg-base-100">{notStartedCount}</span>
          </button>
        </div>

        {/* 프로젝트 목록 ("전체" 버튼 제거) */}
        {projects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => {
              const IconComponent = project.icon ? getUnifiedIcon(project.icon as UnifiedIconKey) : Folder;
              return (
                <button
                  key={project.id}
                  onClick={() => onProjectClick(project)}
                  className="btn btn-sm btn-ghost rounded-full hover:bg-base-300"
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: project.color }}>
                    <IconComponent className="w-3 h-3 text-white" />
                  </div>
                  {project.title}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-base-content/60">
            프로젝트가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
