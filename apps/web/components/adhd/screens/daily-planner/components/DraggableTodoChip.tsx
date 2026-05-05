'use client';

import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';

import { CheckCircle2, Circle, MinusCircle, XCircle, Repeat, Clock, Play, X, RotateCcw, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { MissedTodoActionPanel } from '@/components/shared/MissedTodoActionPanel';
import type { Todo } from '@/entities/todo/Todo';
import { useTodoStore } from '@/state/stores/todoStore';
import { unifiedIconsCollection } from '@/lib/icon-collection';
import { getTimeStatus, getTimeStatusText } from '@/lib/utils/timeStatus';
import type { ProjectMapValue, DepartmentMapValue } from '../../timeline/types';

// 아이콘 이름을 Lucide 컴포넌트로 변환
const getTodoIcon = (iconName?: string | null): React.ComponentType<any> | null => {
  if (!iconName) return null;
  const capitalizedName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  const iconKey = `lucide-${capitalizedName}`;
  const iconData = unifiedIconsCollection[iconKey];
  return iconData?.component || null;
};

interface LinkedMotivation {
  id: string;
  title: string;
  content: string;
}

interface DraggableTodoChipProps {
  todo: Todo;
  showTime?: boolean;
  hideOverdue?: boolean;
  projectMap?: Map<string, ProjectMapValue>;
  departmentMap?: Map<string, DepartmentMapValue>;
  highlightProjectId?: string | null;
  linkedMotivations?: LinkedMotivation[];
  expandedMotivationId?: string | null;
  onExpandMotivation?: (id: string | null) => void;
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
  onUnskip?: (todo: Todo) => void;
  onSkipTodo?: (todo: Todo, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
  onRestoreOriginal?: (todo: Todo) => void;
  onStartFocus?: (todo: Todo) => void;
  onUnassign?: (todo: Todo) => void;
}

export function DraggableTodoChip({ todo, showTime = false, hideOverdue = false, projectMap, departmentMap, highlightProjectId, linkedMotivations, expandedMotivationId, onExpandMotivation, onEditClick, onToggle, onUnskip, onSkipTodo, onPostpone, onRestoreOriginal, onStartFocus, onUnassign }: DraggableTodoChipProps) {
  const toggleTodo = useTodoStore(s => s.toggleTodo);
  const hasSubtasks = useTodoStore(s => s.hasSubtasks);
  const getSubtaskProgress = useTodoStore(s => s.getSubtaskProgress);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${todo.id}`,
    data: { type: 'todo', todoId: todo.id },
  });

  const style = isDragging ? {
    opacity: 0.4,
  } : undefined;

  const timeStr = showTime && todo.startTime && todo.scheduleType !== 'anytime'
    ? (() => {
        const start = new Date(todo.startTime!).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
        if (todo.endTime) {
          const end = new Date(todo.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
          return `${start}-${end}`;
        }
        return start;
      })()
    : null;

  const isSkipped = todo.skipStatus !== null && todo.skipStatus !== undefined;

  // 시간 상태 계산
  const timeStatus = todo.scheduleType === 'timed' && todo.startTime
    ? getTimeStatus(todo.startTime, todo.endTime ?? null, todo.completed)
    : null;
  const isMissedNotSkipped = timeStatus?.status === 'missed' && !todo.completed && !isSkipped;
  const timeStatusText = timeStatus ? getTimeStatusText(timeStatus) : null;

  // 프로젝트/부서 정보
  const projectInfo = todo.projectId && projectMap ? projectMap.get(todo.projectId) : undefined;
  const departmentInfo = todo.departmentId && departmentMap ? departmentMap.get(todo.departmentId) : undefined;

  // 하이라이트 필터: highlightProjectId가 설정되어 있고 현재 할일의 프로젝트가 다르면 dim
  const isDimmed = highlightProjectId != null && todo.projectId !== highlightProjectId;

  // 클릭 vs 드래그 구분을 위한 핸들러
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    listeners?.onPointerDown?.(e as any);
  };

  const handleClick = () => {
    // 드래그 중이 아닌 경우에만 편집 모달 열기
    if (!isDragging && onEditClick) {
      onEditClick(todo);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={`group flex flex-col rounded-lg transition-all
        ${isDragging ? 'shadow-lg z-50' : ''}
        ${isDimmed ? 'opacity-30' : ''}
      `}
    >
      {/* 칩 본체 — 사이드바 + 콘텐츠 */}
      <div className="flex overflow-hidden rounded-lg">
        {/* 프로젝트 컬러 사이드바 */}
        {projectInfo?.color && (
          <div
            className="w-1 flex-shrink-0 rounded-l-lg"
            style={{ backgroundColor: projectInfo.color }}
          />
        )}

        <div
          className={`flex-1 flex flex-col gap-0.5 px-2 py-1.5 text-sm cursor-grab active:cursor-grabbing
            ${isMissedNotSkipped
              ? 'bg-warning/10 border border-warning/30'
              : isSkipped
                ? 'bg-base-200 text-base-content/40 line-through'
                : todo.completed
                  ? 'bg-base-200 text-base-content/40 line-through'
                  : 'bg-base-100 hover:bg-base-300'}
            ${projectInfo?.color ? 'rounded-r-lg' : 'rounded-lg'}
          `}
        >
          {/* 첫째 줄: 체크 + 시간 + 아이콘 + 제목 + 버튼들 */}
          <div className="flex items-center gap-2">
            {/* 완료 체크 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isSkipped && onUnskip) {
                  onUnskip(todo);
                } else if (onToggle) {
                  onToggle(todo);
                } else {
                  toggleTodo(todo.id);
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-shrink-0 flex items-center justify-center"
            >
              {isSkipped ? (
                todo.skipStatus === 'missed'
                  ? <XCircle className="w-5 h-5 text-error" />
                  : <MinusCircle className="w-5 h-5 text-base-content/50" />
              ) : todo.completed ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <Circle className="w-5 h-5 text-base-content/40" />
              )}
            </button>

            {/* 시간 */}
            {timeStr && (
              <span className="flex-shrink-0 text-xs text-base-content/50 font-mono">
                {timeStr}
              </span>
            )}

            {/* 아이콘 */}
            {todo.icon && (() => {
              const TodoIcon = getTodoIcon(todo.icon);
              return TodoIcon ? <TodoIcon className="w-4 h-4 flex-shrink-0" /> : null;
            })()}

            {/* 반복 아이콘 */}
            {todo.recurrencePattern && (
              <Repeat className="w-3 h-3 text-base-content/40 flex-shrink-0" />
            )}

            {/* 제목 */}
            <span className="truncate flex-1">{todo.title}</span>

            {/* 서브태스크 진행도 배지 */}
            {hasSubtasks(todo.id) && (() => {
              const progress = getSubtaskProgress(todo.id);
              return (
                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-base-300 text-base-content/60 font-medium">
                  {progress.completed}/{progress.total}
                </span>
              );
            })()}

            {/* 종료시간 경과 표시 */}
            {!hideOverdue && timeStatus?.status === 'missed' && !todo.completed && !isSkipped && timeStatusText?.primary && (
              <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] text-error">
                <Clock className="w-3 h-3" />
                {timeStatusText.primary}
              </span>
            )}

            {/* 배치 해제 버튼 */}
            {onUnassign && !todo.completed && !isSkipped && (
              <button
                onClick={(e) => { e.stopPropagation(); onUnassign(todo); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-shrink-0 w-5 h-5 rounded-full hover:bg-error/20 text-base-content/40 hover:text-error flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="배치 해제"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* 포커스 시작 버튼 */}
            {onStartFocus && !todo.completed && !isSkipped && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartFocus(todo);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="포커스 시작"
              >
                <Play className="w-3 h-3" />
              </button>
            )}

            {/* 완료/스킵 상태 배지 */}
            {(todo.completed || isSkipped) && (
              <span className={`flex-shrink-0 text-[10px] px-1 rounded ${
                todo.completed ? 'bg-success/20 text-success' :
                todo.skipStatus === 'missed' ? 'bg-error/20 text-error' :
                'bg-base-300 text-base-content/50'
              }`}>
                {todo.completed ? '완료' : todo.skipStatus === 'missed' ? '놓침' : '필요없었음'}
              </span>
            )}
          </div>

          {/* 둘째 줄: 프로젝트/부서 배지 (Timeline과 동일 스타일) */}
          {(projectInfo || departmentInfo) && (
            <div className="flex flex-wrap gap-1 ml-7">
              {projectInfo && (
                <span
                  className="badge badge-xs gap-1"
                  style={{
                    backgroundColor: projectInfo.color ? `${projectInfo.color}20` : undefined,
                    borderColor: projectInfo.color || undefined,
                    color: projectInfo.color || undefined,
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
                    color: departmentInfo.color || undefined,
                  }}
                >
                  {departmentInfo.icon && <span>{departmentInfo.icon}</span>}
                  {departmentInfo.name}
                </span>
              )}
            </div>
          )}

          {/* 진행률 바 */}
          {timeStatus?.status === 'in_progress' && (
            <div className="ml-7 mt-1">
              <div className="h-1 bg-base-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${timeStatus.progressPercent}%` }}
                />
              </div>
              {timeStatusText?.secondary && (
                <span className="text-[10px] text-base-content/50">{timeStatusText.secondary}</span>
              )}
            </div>
          )}

          {/* 연결된 원동력(motivation) 배지 */}
          {linkedMotivations && linkedMotivations.length > 0 && (
            <div className="flex flex-col gap-0.5 ml-7 mt-1 overflow-hidden">
              {linkedMotivations.map(motivation => {
                const text = motivation.title && motivation.content
                  ? `${motivation.title} - ${motivation.content}`
                  : motivation.title || motivation.content;
                const isExpanded = expandedMotivationId === motivation.id;

                return (
                  <div
                    key={motivation.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpandMotivation?.(isExpanded ? null : motivation.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="inline-flex items-start gap-0.5 px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-600 dark:text-orange-400 cursor-pointer hover:bg-orange-500/30 transition-all"
                  >
                    <Zap className={`w-3 h-3 flex-shrink-0 ${isExpanded ? 'mt-0.5' : ''}`} />
                    <span className={isExpanded ? '' : 'line-clamp-1'}>{text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 미뤄둔 할일 패널 */}
      {todo.parentRecurringTodoId && todo.originalStartTime && !todo.completed && (
        <div
          className="p-2 bg-info/10 rounded-lg border border-info/20"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-base-content/60 mb-2">
            미뤄둔 할일이에요. (원래 {format(new Date(todo.originalStartTime), 'HH:mm')}) 어떻게 할까요?
          </p>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle ? onToggle(todo) : toggleTodo(todo.id);
              }}
              className="btn btn-xs btn-ghost text-success gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              미룸완료
            </button>
            {onRestoreOriginal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestoreOriginal(todo);
                }}
                className="btn btn-xs btn-ghost text-info gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                원래대로 복원
              </button>
            )}
          </div>
        </div>
      )}

      {/* "어떻게 기록할까요?" 패널 — 미뤄둔 할일이 아닌 경우만 */}
      {isMissedNotSkipped && !hideOverdue && !(todo.parentRecurringTodoId && todo.originalStartTime && !todo.completed) && (
        <MissedTodoActionPanel
          variant="chip"
          onComplete={() => onToggle ? onToggle(todo) : toggleTodo(todo.id)}
          onPostpone={() => onPostpone?.(todo)}
          onSkipNotNeeded={() => onSkipTodo?.(todo, 'not_needed')}
          onSkipMissed={() => onSkipTodo?.(todo, 'missed')}
        />
      )}
    </div>
  );
}
