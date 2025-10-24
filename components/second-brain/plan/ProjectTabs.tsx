'use client';

import { Folder, FolderOpen } from 'lucide-react';
import type { Project } from '@/types/second-brain';
import { getUnifiedIcon } from '@/lib/icon-collection';

interface ProjectTabsProps {
  projects: Project[];
  selectedProjectId: string | null;
  projectFilterType: 'active' | 'not_started';
  onProjectSelect: (projectId: string | null) => void;
  onProjectFilterChange: (type: 'active' | 'not_started') => void;
}

export default function ProjectTabs({
  projects,
  selectedProjectId,
  projectFilterType,
  onProjectSelect,
  onProjectFilterChange,
}: ProjectTabsProps) {
  return (
    <div className="bg-base-200 border-b border-base-300">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* 프로젝트 상태 필터 탭 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onProjectFilterChange('active')}
            className={`btn btn-sm ${projectFilterType === 'active' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
          >
            <FolderOpen className="w-4 h-4" />
            진행중인 프로젝트
          </button>
          <button
            onClick={() => onProjectFilterChange('not_started')}
            className={`btn btn-sm ${projectFilterType === 'not_started' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
          >
            <Folder className="w-4 h-4" />
            시작 안한 프로젝트
          </button>
        </div>

        {/* 프로젝트 목록 */}
        {projects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onProjectSelect(null)}
              className={`btn btn-sm ${selectedProjectId === null ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
            >
              전체
            </button>
            {projects.map((project) => {
              const IconComponent = project.icon ? getUnifiedIcon(project.icon) : Folder;
              return (
                <button
                  key={project.id}
                  onClick={() => onProjectSelect(project.id)}
                  className={`btn btn-sm ${selectedProjectId === project.id ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
                  style={{
                    borderColor: selectedProjectId === project.id ? project.color : 'transparent',
                    borderWidth: selectedProjectId === project.id ? '2px' : '0',
                  }}
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
            {projectFilterType === 'active' ? '진행중인 프로젝트가 없습니다.' : '시작 안한 프로젝트가 없습니다.'}
          </div>
        )}
      </div>
    </div>
  );
}
