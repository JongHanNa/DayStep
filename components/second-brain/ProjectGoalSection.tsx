'use client';

import { memo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Project, Goal } from '@/types/second-brain';
import ProjectCard from './ProjectCard';
import { getUnifiedIcon } from '@/lib/icon-collection';
import type { UnifiedIconKey } from '@/lib/icon-collection';

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

  // 아이콘 컴포넌트
  const IconComponent = goal
    ? getUnifiedIcon(goal.icon as UnifiedIconKey).component
    : null;

  return (
    <div className="space-y-3">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
        aria-label={`${isNoGoalSection ? '목표없음' : goal?.title} 섹션 ${isExpanded ? '접기' : '펼치기'}`}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 아이콘 */}
          {!isNoGoalSection && goal && IconComponent && (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: goal.color,
              }}
            >
              <IconComponent className="w-5 h-5 text-white" />
            </div>
          )}

          {/* 제목 */}
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-semibold text-lg truncate">
              {isNoGoalSection ? '목표없음' : goal?.title}
            </h3>
          </div>

          {/* 프로젝트 개수 뱃지 */}
          <span className="badge badge-lg bg-base-300 flex-shrink-0">
            {projects.length}개
          </span>

          {/* 접기/펼치기 아이콘 */}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 flex-shrink-0" />
          )}
        </div>
      </button>

      {/* 프로젝트 목록 */}
      {isExpanded && (
        <div className="space-y-3 pl-4">
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
