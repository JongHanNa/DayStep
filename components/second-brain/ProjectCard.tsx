'use client';

import { memo } from 'react';
import type { Project } from '@/types/second-brain';
import { getUnifiedIcon } from '@/lib/icon-collection';
import type { UnifiedIconKey } from '@/lib/icon-collection';

interface ProjectCardProps {
  project: Project;
  onEditClick: (project: Project) => void;
}

const ProjectCard = memo(function ProjectCard({ project, onEditClick }: ProjectCardProps) {
  const IconComponent = getUnifiedIcon(project.icon as UnifiedIconKey).component;

  // 진행률 계산
  const progress = project.progress || 0;

  // 상태 표시 텍스트
  const statusLabels = {
    not_started: '시작 안함',
    active: '진행중',
    on_hold: '중단',
    completed: '완료',
    archived: '보관됨',
  };

  // 상태별 색상
  const statusColors = {
    not_started: 'bg-base-content/10 text-base-content/70',
    active: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    on_hold: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
    archived: 'bg-base-content/10 text-base-content/50',
  };

  // 카드 클릭 시 편집 모달 열기
  const handleClick = () => {
    onEditClick(project);
  };

  return (
    <div
      onClick={handleClick}
      className="flex flex-col p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${project.title} 프로젝트 상세 보기`}
    >
      {/* 상단: 아이콘 + 제목 + 상태 뱃지 */}
      <div className="flex items-start gap-3 mb-3">
        {/* 아이콘 */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: project.color,
          }}
        >
          <IconComponent className="w-6 h-6 text-white" />
        </div>

        {/* 제목 + 상태 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
            {project.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge badge-sm ${statusColors[project.status]}`}>
              {statusLabels[project.status]}
            </span>
            {project.goal && (
              <span className="text-xs text-base-content/60 truncate">
                🎯 {project.goal.title}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 설명 (있을 경우) */}
      {project.description && (
        <p className="text-sm text-base-content/70 line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      {/* 진행률 프로그레스 바 */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs text-base-content/60">
          <span>진행률</span>
          <span className="font-medium">
            {project.completed_todos}/{project.total_todos} ({progress}%)
          </span>
        </div>
        <div className="w-full bg-base-300 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: project.color,
            }}
          />
        </div>
      </div>

      {/* 날짜 정보 (있을 경우) */}
      {(project.start_date || project.target_end_date) && (
        <div className="flex items-center gap-2 mt-3 text-xs text-base-content/60">
          {project.start_date && (
            <span>시작: {new Date(project.start_date).toLocaleDateString('ko-KR')}</span>
          )}
          {project.start_date && project.target_end_date && <span>~</span>}
          {project.target_end_date && (
            <span>종료: {new Date(project.target_end_date).toLocaleDateString('ko-KR')}</span>
          )}
        </div>
      )}
    </div>
  );
});

export default ProjectCard;
