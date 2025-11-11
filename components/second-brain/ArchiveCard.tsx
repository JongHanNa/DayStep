'use client';

import { memo } from 'react';
import type { Goal, Project, AreaResource } from '@/types/second-brain';
import { getUnifiedIcon } from '@/lib/icon-collection';
import type { UnifiedIconKey } from '@/lib/icon-collection';

interface ArchiveCardProps {
  item: Goal | Project | AreaResource;
  type: 'goal' | 'project' | 'area-resource';
  onEditClick: (item: Goal | Project | AreaResource) => void;
  // 목표: 하위 프로젝트 현황
  projectStats?: {
    total: number;
    inProgress: number;
    notStarted: number;
  };
  // 프로젝트: 하위 할일 현황
  todoStats?: {
    total: number;
    inProgress: number;
    completed: number;
  };
  // 달성률
  progress?: number;
  // 목표 정보 (프로젝트용)
  goalTitle?: string;
}

const ArchiveCard = memo(function ArchiveCard({
  item,
  type,
  onEditClick,
  projectStats,
  todoStats,
  progress = 0,
  goalTitle,
}: ArchiveCardProps) {
  const IconComponent = getUnifiedIcon(item.icon as UnifiedIconKey);

  // 상태 표시 텍스트
  const getStatusLabel = () => {
    if (type === 'area-resource') {
      return '아카이브';
    }
    if ('status' in item) {
      const statusLabels = {
        not_started: '시작 안함',
        in_progress: '진행중',
        paused: '중단',
        completed: '완료',
      };
      return statusLabels[item.status as keyof typeof statusLabels] || item.status;
    }
    return '';
  };

  // 상태별 색상
  const getStatusColor = () => {
    if (type === 'area-resource') {
      return 'bg-base-content/10 text-base-content/70';
    }
    if ('status' in item) {
      const statusColors = {
        not_started: 'bg-base-content/10 text-base-content/70',
        in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        paused: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
      };
      return statusColors[item.status as keyof typeof statusColors] || 'bg-base-content/10 text-base-content/70';
    }
    return 'bg-base-content/10 text-base-content/70';
  };

  // 카드 클릭 시 편집 모달 열기
  const handleClick = () => {
    onEditClick(item);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div
        onClick={handleClick}
        className="flex flex-col p-4 bg-white hover:bg-base-100 transition-colors cursor-pointer group"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`${item.title} ${type === 'goal' ? '목표' : type === 'project' ? '프로젝트' : '영역/자원'} 상세 보기`}
      >
        {/* 상단: 아이콘 + 제목 + 상태 뱃지 */}
        <div className="flex items-start gap-3 mb-3">
          {/* 아이콘 */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: item.color,
            }}
          >
            <IconComponent className="w-6 h-6 text-white" />
          </div>

          {/* 제목 + 상태 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`badge badge-sm ${getStatusColor()}`}>
                {getStatusLabel()}
              </span>
              {/* 목표 정보 (프로젝트용) */}
              {type === 'project' && goalTitle && (
                <span className="text-xs text-base-content/60 truncate">
                  🎯 {goalTitle}
                </span>
              )}
              {/* 영역/자원 타입 표시 */}
              {type === 'area-resource' && 'status' in item && item.status === 'archived' && (
                <span className="text-xs text-base-content/60">
                  {/* 원래는 area인지 resource인지 구분 필요 */}
                  📚 영역·자원
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 프로젝트 현황 (목표용) */}
        {type === 'goal' && projectStats && (
          <div className="mb-3 text-sm text-base-content/70">
            프로젝트: {projectStats.inProgress}개 진행중, {projectStats.notStarted}개 시작 안함
          </div>
        )}

        {/* 할일 현황 (프로젝트용) */}
        {type === 'project' && todoStats && (
          <div className="mb-3 text-sm text-base-content/70">
            할일: {todoStats.inProgress}개 진행중, {todoStats.completed}개 완료
          </div>
        )}

        {/* 달성률 프로그레스 바 */}
        {(type === 'goal' || type === 'project') && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs text-base-content/60">
              <span>달성률</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ArchiveCard;
