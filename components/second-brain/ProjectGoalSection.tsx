'use client';

import { memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Goal } from '@/types/second-brain';
import ProjectCard from './ProjectCard';

interface ProjectGoalSectionProps {
  goalId: string | 'no-goal';
  goal?: Goal;
  projects: Project[];
  isExpanded: boolean;
  onToggle: () => void;
  onEditProject: (project: Project) => void;
}

const ProjectGoalSection = memo(function ProjectGoalSection({
  goalId,
  goal,
  projects,
  isExpanded,
  onToggle,
  onEditProject,
}: ProjectGoalSectionProps) {
  // 목표없음 섹션인지 확인
  const isNoGoalSection = goalId === 'no-goal';

  // 목표 색상 (목표없음은 회색)
  const goalColor = isNoGoalSection ? '#9ca3af' : (goal?.color || '#9ca3af');

  return (
    <div className="border-b border-base-300 last:border-b-0">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent hover:opacity-80 transition-opacity"
        aria-label={`${isNoGoalSection ? '목표없음' : goal?.title} 섹션 ${isExpanded ? '접기' : '펼치기'}`}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {/* 색상 인디케이터 */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: goalColor }}
          />
          {/* 그룹명 */}
          <span className="font-semibold text-base">
            {isNoGoalSection ? '목표없음' : goal?.title}
          </span>
          {/* 프로젝트 개수 뱃지 */}
          <span className="badge badge-sm">{projects.length}</span>
        </div>
        {/* 펼치기 아이콘 */}
        <ChevronDown
          className={cn(
            'w-5 h-5 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* 프로젝트 목록 */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-3">
          {projects.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-8">
                <p className="text-base-content/60">
                  프로젝트가 없습니다.
                </p>
              </div>
            </div>
          ) : (
            projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEditClick={onEditProject}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});

export default ProjectGoalSection;
