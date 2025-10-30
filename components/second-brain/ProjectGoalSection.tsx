'use client';

import { memo, useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Goal } from '@/types/second-brain';
import ProjectCard from './ProjectCard';

// 진행상황 타입 정의
type ProjectStatus = 'not_started' | 'in_progress' | 'paused' | 'completed';
type StatusFilter = 'all' | ProjectStatus;

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

  // 선택된 진행상황 상태 (기본값: 전체)
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');

  // 진행상황별 라벨
  const statusLabels: Record<ProjectStatus, string> = {
    not_started: '시작 안함',
    in_progress: '진행중',
    paused: '중단',
    completed: '완료',
  };

  // 진행상황별 프로젝트 개수 계산
  const statusCounts = useMemo(() => {
    return {
      all: projects.length,
      not_started: projects.filter((p) => p.status === 'not_started').length,
      in_progress: projects.filter((p) => p.status === 'in_progress').length,
      paused: projects.filter((p) => p.status === 'paused').length,
      completed: projects.filter((p) => p.status === 'completed').length,
    };
  }, [projects]);

  // 선택된 상태에 따라 프로젝트 필터링
  const filteredProjects = useMemo(() => {
    if (selectedStatus === 'all') {
      return projects;
    }
    return projects.filter((p) => p.status === selectedStatus);
  }, [projects, selectedStatus]);

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
        <div className="px-4 pb-3">
          {/* 진행상황별 탭 */}
          {projects.length > 0 && (
            <div className="mb-4 overflow-x-auto">
              <div className="tabs tabs-boxed inline-flex">
                {/* 전체 탭 */}
                <button
                  onClick={() => setSelectedStatus('all')}
                  className={cn(
                    'tab',
                    selectedStatus === 'all' && 'tab-active'
                  )}
                >
                  전체
                  <span className="ml-1 badge badge-sm">
                    {statusCounts.all}
                  </span>
                </button>

                {/* 진행중 탭 */}
                <button
                  onClick={() => setSelectedStatus('in_progress')}
                  className={cn(
                    'tab',
                    selectedStatus === 'in_progress' && 'tab-active'
                  )}
                  disabled={statusCounts.in_progress === 0}
                >
                  {statusLabels.in_progress}
                  <span className="ml-1 badge badge-sm">
                    {statusCounts.in_progress}
                  </span>
                </button>

                {/* 시작 안함 탭 */}
                <button
                  onClick={() => setSelectedStatus('not_started')}
                  className={cn(
                    'tab',
                    selectedStatus === 'not_started' && 'tab-active'
                  )}
                  disabled={statusCounts.not_started === 0}
                >
                  {statusLabels.not_started}
                  <span className="ml-1 badge badge-sm">
                    {statusCounts.not_started}
                  </span>
                </button>

                {/* 완료 탭 */}
                <button
                  onClick={() => setSelectedStatus('completed')}
                  className={cn(
                    'tab',
                    selectedStatus === 'completed' && 'tab-active'
                  )}
                  disabled={statusCounts.completed === 0}
                >
                  {statusLabels.completed}
                  <span className="ml-1 badge badge-sm">
                    {statusCounts.completed}
                  </span>
                </button>

                {/* 중단 탭 */}
                <button
                  onClick={() => setSelectedStatus('paused')}
                  className={cn(
                    'tab',
                    selectedStatus === 'paused' && 'tab-active'
                  )}
                  disabled={statusCounts.paused === 0}
                >
                  {statusLabels.paused}
                  <span className="ml-1 badge badge-sm">
                    {statusCounts.paused}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 필터링된 프로젝트 목록 */}
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="card bg-base-200">
                <div className="card-body text-center py-8">
                  <p className="text-base-content/60">
                    프로젝트가 없습니다.
                  </p>
                </div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="card bg-base-200">
                <div className="card-body text-center py-8">
                  <p className="text-base-content/60">
                    해당 진행상황의 프로젝트가 없습니다.
                  </p>
                </div>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEditClick={onEditProject}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default ProjectGoalSection;
