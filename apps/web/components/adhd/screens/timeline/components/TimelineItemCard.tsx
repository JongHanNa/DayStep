import { format } from 'date-fns';
import {
  CheckCircle2, Clock, Trash2, Circle, Repeat, Zap, Play,
  AlertTriangle, XCircle, SkipForward, Pause, MinusCircle, RotateCcw
} from 'lucide-react';
import { MissedTodoActionPanel } from '@/components/shared/MissedTodoActionPanel';
import { getTimeStatus, getTimeStatusText, type TimeStatusResult } from '@/lib/utils/timeStatus';
import { TimeProgressBar } from '@/components/shared/TimeProgressBar';
import { useTodoStore } from '@/state/stores/todoStore';
import type { Note } from '@/types/domain';
import type { TimelineItem, ProjectMapValue, DepartmentMapValue } from '../types';

interface TimelineItemCardProps {
  item: TimelineItem;
  date: Date;
  currentTime: Date;
  projectMap: Map<string, ProjectMapValue>;
  departmentMap: Map<string, DepartmentMapValue>;
  showFuelBadges: boolean;
  getLinkedFuels: (item: TimelineItem) => Note[];
  expandedFuelId: string | null;
  onExpandFuel: (id: string | null) => void;
  onToggleComplete: (item: TimelineItem) => void;
  onCancelExclusion: (item: TimelineItem) => void;
  onUnskipTodo: (item: TimelineItem) => void;
  onEditClick: (item: TimelineItem) => void;
  onDelete: (todoId: string) => void;
  onRestoreOriginal: (item: TimelineItem) => void;
  onOpenPostponeSheet: (item: TimelineItem) => void;
  onSkipTodo: (item: TimelineItem, reason: 'not_needed' | 'missed') => void;
  onStartFocus?: (item: TimelineItem) => void;
}

export function TimelineItemCard({
  item,
  date,
  currentTime,
  projectMap,
  departmentMap,
  showFuelBadges,
  getLinkedFuels,
  expandedFuelId,
  onExpandFuel,
  onToggleComplete,
  onCancelExclusion,
  onUnskipTodo,
  onEditClick,
  onDelete,
  onRestoreOriginal,
  onOpenPostponeSheet,
  onSkipTodo,
  onStartFocus,
}: TimelineItemCardProps) {
  const hasSubtasks = useTodoStore(s => s.hasSubtasks);
  const getSubtaskProgress = useTodoStore(s => s.getSubtaskProgress);

  const projectInfo = item.projectId ? projectMap.get(item.projectId) : undefined;
  const departmentInfo = item.departmentId ? departmentMap.get(item.departmentId) : undefined;

  // 시간 상태 계산
  const timeStatus: TimeStatusResult | null =
    item.scheduleType === 'timed' && item.startTime
      ? getTimeStatus(item.startTime, item.endTime ?? null, item.completed)
      : null;
  const timeStatusText = timeStatus ? getTimeStatusText(timeStatus) : null;

  // 놓침 상태 확인
  const isMissedNotSkipped = timeStatus?.status === 'missed' && !item.completed && !item.isSkipped;

  // 일반 할일 skipStatus도 처리
  const isSkippedOrSkipStatus = item.isSkipped || item.skipStatus;
  const skipReason = item.isSkipped ? item.exclusionReason : item.skipStatus;

  // 배경색
  const bgColor =
    item.isSkipped
      ? 'bg-base-200'
      : item.completed
        ? 'bg-base-200'
        : timeStatus?.status === 'in_progress'
          ? 'bg-amber-50'
          : 'bg-transparent';

  // 왼쪽 보더 색상
  const borderColor =
    isSkippedOrSkipStatus
      ? skipReason === 'postponed'
        ? 'border-l-warning'
        : skipReason === 'missed'
          ? 'border-l-error'
          : 'border-l-base-300'
      : item.completed
        ? 'border-l-success'
        : timeStatus?.status === 'in_progress'
          ? 'border-l-warning'
          : timeStatus?.status === 'missed'
            ? 'border-l-error'
            : item.color
              ? `border-l-[${item.color}]`
              : 'border-l-primary';

  // 펄스 애니메이션
  const pulseAnimation =
    timeStatus?.status === 'in_progress' && !isSkippedOrSkipStatus ? 'animate-pulse' : '';

  // 완료/제외 상태 및 호버 효과
  const itemHoverEffect = (item.completed || isSkippedOrSkipStatus)
    ? 'opacity-50 hover:opacity-70 hover:shadow-md hover:-translate-y-0.5'
    : 'hover:shadow-md hover:-translate-y-0.5';

  // 상태 배지 텍스트 생성
  const getStatusBadgeText = (): string => {
    if (item.completed) {
      if ((item.isActualExecution || item.originalTodo?.parentRecurringTodoId) && item.originalStartTime) {
        return item.originalEndTime
          ? `미룸 완료 (원래 ${format(new Date(item.originalStartTime), 'HH:mm')} ~ ${format(new Date(item.originalEndTime), 'HH:mm')})`
          : `미룸 완료 (원래 ${format(new Date(item.originalStartTime), 'HH:mm')})`;
      }
      return '완료';
    }
    if (skipReason === 'postponed') {
      if (item.postponedToTime && item.postponedToStartTime) {
        return `미룸 (→ ${format(new Date(item.postponedToStartTime), 'HH:mm')} ~ ${format(new Date(item.postponedToTime), 'HH:mm')})`;
      }
      if (item.postponedToTime) {
        return `미룸 (→ ${format(new Date(item.postponedToTime), 'HH:mm')})`;
      }
      return '미뤘음';
    }
    if (skipReason === 'missed') return '놓침';
    if (skipReason === 'not_needed') return '필요없었음';
    return '건너뜀';
  };

  const statusBadgeClass =
    item.completed ? 'bg-success/20 text-success' :
    skipReason === 'postponed' ? 'bg-warning/20 text-warning' :
    skipReason === 'missed' ? 'bg-error/20 text-error' :
    'bg-base-300 text-base-content/50';

  return (
    <div
      className={`group relative flex items-start gap-3 p-3 rounded-lg border-l-4 ${bgColor} ${borderColor} ${pulseAnimation} ${itemHoverEffect} transition-all`}
    >
      {/* 일반 카드 차단 레이어 */}
      {!item.completed && !isSkippedOrSkipStatus && (
        <div className="absolute inset-0 z-0 bg-base-200 pointer-events-none rounded-r-lg" />
      )}

      {/* 시간/날짜 표시 */}
      <div className="relative w-14 flex-shrink-0 text-xs text-base-content/50 pt-0.5">
        {item.scheduleType === 'timed' && item.startTime ? (
          <span>{format(item.startTime, 'HH:mm')}</span>
        ) : (
          <span className="text-emerald-600">언제든지</span>
        )}
      </div>

      {/* 완료 토글 / 제외 취소 아이콘 */}
      <button
        onClick={() => {
          if (item.isSkipped) {
            onCancelExclusion(item);
          } else if (item.skipStatus) {
            onUnskipTodo(item);
          } else {
            onToggleComplete(item);
          }
        }}
        className={`relative flex-shrink-0 ${
          isSkippedOrSkipStatus
            ? skipReason === 'postponed'
              ? 'text-warning hover:text-warning/80'
              : skipReason === 'missed'
                ? 'text-error hover:text-error/80'
                : 'text-base-content/50 hover:text-base-content/70'
            : item.completed
              ? 'text-success'
              : timeStatus?.status === 'missed'
                ? 'text-error'
                : 'text-base-content/40'
        }`}
        title={isSkippedOrSkipStatus ? '클릭하여 제외 취소' : item.completed ? '미완료로 변경' : '완료로 변경'}
      >
        {isSkippedOrSkipStatus ? (
          skipReason === 'postponed' ? <Pause className="w-5 h-5" /> :
          skipReason === 'missed' ? <XCircle className="w-5 h-5" /> :
          skipReason === 'not_needed' ? <MinusCircle className="w-5 h-5" /> :
          <SkipForward className="w-5 h-5" />
        ) : item.completed ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : timeStatus?.status === 'missed' ? (
          <AlertTriangle className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      {/* 내용 (클릭 시 편집 모달) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onEditClick(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEditClick(item);
          }
        }}
        className="relative flex-1 min-w-0 text-left cursor-pointer"
      >
        {/* 시간 범위 표시 (시작+종료 시간 있는 경우) */}
        {item.scheduleType === 'timed' && item.startTime && item.endTime && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-base-content/50">
              {format(item.startTime, 'HH:mm')} - {format(item.endTime, 'HH:mm')}
            </span>
            {(isSkippedOrSkipStatus || item.completed) && (
              <span className={`badge badge-xs ${statusBadgeClass}`}>
                {getStatusBadgeText()}
              </span>
            )}
          </div>
        )}

        {/* 상태 배지 (endTime 없는 경우, 완료/제외) */}
        {item.scheduleType === 'timed' && item.startTime && !item.endTime && (isSkippedOrSkipStatus || item.completed) && (
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge badge-xs ${statusBadgeClass}`}>
              {getStatusBadgeText()}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {item.isRecurrenceInstance && (
            <Repeat className="w-3 h-3 text-base-content/40 flex-shrink-0" />
          )}
          <span className={`text-sm ${
            isSkippedOrSkipStatus
              ? 'line-through text-base-content/40'
              : item.completed
                ? 'line-through text-base-content/50'
                : 'text-base-content'
          }`}>
            {item.title}
          </span>
          {hasSubtasks(item.id) && (() => {
            const progress = getSubtaskProgress(item.id);
            return (
              <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-base-300 text-base-content/60 font-medium ml-1">
                {progress.completed}/{progress.total}
              </span>
            );
          })()}
        </div>

        {/* 시간 상태 UI (진행 중/놓침) */}
        {timeStatus && (timeStatus.status === 'in_progress' || timeStatus.status === 'missed') && (
          <div className="mt-2 space-y-1">
            {timeStatus.status === 'in_progress' && (
              <>
                <div className="flex items-center gap-2 text-xs text-warning">
                  <Clock className="w-3 h-3" />
                  <span>{timeStatusText?.primary}</span>
                </div>
                <TimeProgressBar
                  percent={timeStatus.progressPercent ?? 0}
                  variant="warning"
                  height="sm"
                  animated={true}
                />
                <div className="flex items-center gap-2 text-xs text-warning">
                  <Clock className="w-3 h-3" />
                  <span>{timeStatusText?.secondary}</span>
                </div>
              </>
            )}
            {timeStatus.status === 'missed' && !isSkippedOrSkipStatus && (
              <div className="text-xs text-error">
                <span>{timeStatusText?.primary}</span>
              </div>
            )}
          </div>
        )}

        {/* 맥락 배지 (프로젝트/부서) */}
        {(projectInfo || departmentInfo) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {projectInfo && (
              <span
                className="badge badge-xs gap-1"
                style={{
                  backgroundColor: projectInfo.color ? `${projectInfo.color}20` : undefined,
                  borderColor: projectInfo.color || undefined,
                  color: projectInfo.color || undefined
                }}
              >
                {projectInfo.icon && <span>{projectInfo.icon}</span>}
                {projectInfo.title}
              </span>
            )}
            {departmentInfo && (
              <span
                className="badge badge-xs gap-1"
                style={{
                  backgroundColor: departmentInfo.color ? `${departmentInfo.color}20` : undefined,
                  borderColor: departmentInfo.color || undefined,
                  color: departmentInfo.color || undefined
                }}
              >
                {departmentInfo.icon && <span>{departmentInfo.icon}</span>}
                {departmentInfo.name}
              </span>
            )}
          </div>
        )}

        {/* 연결된 실행 원동력 표시 */}
        {showFuelBadges && (() => {
          const linkedFuels = getLinkedFuels(item);
          if (linkedFuels.length === 0) return null;

          return (
            <div className="flex flex-col gap-1 mt-1.5 overflow-hidden">
              {linkedFuels.map(fuel => {
                const text = fuel.title && fuel.content
                  ? `${fuel.title} - ${fuel.content}`
                  : fuel.title || fuel.content;
                const isExpanded = expandedFuelId === fuel.id;

                return (
                  <div
                    key={fuel.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpandFuel(isExpanded ? null : fuel.id);
                    }}
                    className="inline-flex items-start gap-0.5 px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-600 dark:text-orange-400 cursor-pointer hover:bg-orange-500/30 transition-all"
                  >
                    <Zap className={`w-3 h-3 flex-shrink-0 ${isExpanded ? 'mt-0.5' : ''}`} />
                    <span className={isExpanded ? '' : 'line-clamp-1'}>{text}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* 미룸 생성 항목 전용 선택지 */}
        {(() => {
          const isPostponedCreatedItem =
            item.originalTodo?.parentRecurringTodoId &&
            !item.completed &&
            !item.isRecurrenceInstance &&
            item.originalTodo?.originalStartTime;

          if (isPostponedCreatedItem) {
            const originalTimeText = item.originalStartTime && item.originalEndTime
              ? ` (원래 ${format(new Date(item.originalStartTime), 'HH:mm')} ~ ${format(new Date(item.originalEndTime), 'HH:mm')})`
              : item.originalStartTime
                ? ` (원래 ${format(new Date(item.originalStartTime), 'HH:mm')})`
                : '';

            return (
              <div
                className="mt-2 p-2 bg-info/10 rounded-lg border border-info/20"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs text-base-content/60 mb-2">
                  미뤄둔 할일이에요.{originalTimeText} 어떻게 할까요?
                </p>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(item);
                    }}
                    className="btn btn-xs btn-ghost text-success gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    미룸완료
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestoreOriginal(item);
                    }}
                    className="btn btn-xs btn-ghost text-info gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    원래대로 복원
                  </button>
                </div>
              </div>
            );
          }

          // 일반 놓친 할일
          if (isMissedNotSkipped) {
            return (
              <MissedTodoActionPanel
                onComplete={() => onToggleComplete(item)}
                onPostpone={() => onOpenPostponeSheet(item)}
                onSkipNotNeeded={() => onSkipTodo(item, 'not_needed')}
                onSkipMissed={() => onSkipTodo(item, 'missed')}
              />
            );
          }

          return null;
        })()}
      </div>

      {/* 포커스 시작 버튼 (미완료 + 스킵되지 않은 할일만) */}
      {onStartFocus && !item.completed && !isSkippedOrSkipStatus && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartFocus(item);
          }}
          className={`btn btn-xs rounded-full flex-shrink-0 ${
            timeStatus?.status === 'in_progress'
              ? 'btn-primary text-white animate-pulse'
              : 'bg-violet-100 text-violet-600 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50 opacity-0 group-hover:opacity-100'
          }`}
          title="포커스 시작"
        >
          <Play className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 삭제 버튼 (반복 인스턴스, 미룸 생성 항목은 삭제 불가) */}
      {!item.isRecurrenceInstance && !item.originalTodo?.parentRecurringTodoId && (
        <button
          onClick={() => onDelete(item.id)}
          className="btn btn-ghost btn-xs rounded-full text-error opacity-0 group-hover:opacity-100"
          title="삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
