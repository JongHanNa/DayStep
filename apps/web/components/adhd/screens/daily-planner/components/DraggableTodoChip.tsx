'use client';

import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';

import { CheckCircle2, Circle, MinusCircle, XCircle, Pause, Repeat, Clock, Play } from 'lucide-react';
import type { Todo } from '@/entities/todo/Todo';
import { useTodoStore } from '@/state/stores/todoStore';
import { unifiedIconsCollection } from '@/lib/icon-collection';
import { getTimeStatus, getTimeStatusText } from '@/lib/utils/timeStatus';

// 아이콘 이름을 Lucide 컴포넌트로 변환
const getTodoIcon = (iconName?: string | null): React.ComponentType<any> | null => {
  if (!iconName) return null;
  const capitalizedName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  const iconKey = `lucide-${capitalizedName}`;
  const iconData = unifiedIconsCollection[iconKey];
  return iconData?.component || null;
};

interface DraggableTodoChipProps {
  todo: Todo;
  showTime?: boolean;
  hideOverdue?: boolean;
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
  onUnskip?: (todo: Todo) => void;
  onSkipTodo?: (todo: Todo, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
  onStartFocus?: (todo: Todo) => void;
}

export function DraggableTodoChip({ todo, showTime = false, hideOverdue = false, onEditClick, onToggle, onUnskip, onSkipTodo, onPostpone, onStartFocus }: DraggableTodoChipProps) {
  const toggleTodo = useTodoStore(s => s.toggleTodo);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${todo.id}`,
    data: { type: 'todo', todoId: todo.id },
  });

  const style = isDragging ? {
    opacity: 0.4,
  } : undefined;

  const timeStr = showTime && todo.startTime
    ? new Date(todo.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;

  const isSkipped = todo.skipStatus !== null && todo.skipStatus !== undefined;

  // 시간 상태 계산
  const timeStatus = todo.scheduleType === 'timed' && todo.startTime
    ? getTimeStatus(todo.startTime, todo.endTime ?? null, todo.completed)
    : null;
  const isMissedNotSkipped = timeStatus?.status === 'missed' && !todo.completed && !isSkipped;
  const timeStatusText = timeStatus ? getTimeStatusText(timeStatus) : null;

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
      className={`group flex flex-col rounded-lg transition-colors
        ${isDragging ? 'shadow-lg z-50' : ''}
      `}
    >
      {/* 칩 본체 */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 text-sm cursor-grab active:cursor-grabbing
          ${isMissedNotSkipped
            ? 'bg-warning/10 border border-warning/30 rounded-lg'
            : isSkipped
              ? 'bg-base-200 text-base-content/40 line-through rounded-lg'
              : todo.completed
                ? 'bg-base-200 text-base-content/40 line-through rounded-lg'
                : 'bg-base-100 hover:bg-base-300 rounded-lg'}
        `}
      >
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
          <span className="flex-shrink-0 text-xs text-base-content/50 font-mono w-10">
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

        {/* 종료시간 경과 표시 */}
        {!hideOverdue && timeStatus?.status === 'missed' && !todo.completed && !isSkipped && timeStatusText?.primary && (
          <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] text-error">
            <Clock className="w-3 h-3" />
            {timeStatusText.primary}
          </span>
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

      {/* "어떻게 기록할까요?" 패널 */}
      {isMissedNotSkipped && (
        <div
          className="px-2 py-1.5 bg-warning/5 border border-t-0 border-warning/20 rounded-b-lg"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] text-base-content/50 mb-1">어떻게 기록할까요?</p>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onToggle) onToggle(todo);
                else toggleTodo(todo.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="btn btn-xs btn-ghost text-success gap-0.5"
            >
              <CheckCircle2 className="w-3 h-3" />
              완료했음
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onPostpone) onPostpone(todo);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="btn btn-xs btn-ghost text-warning gap-0.5"
            >
              <Pause className="w-3 h-3" />
              미뤘음
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSkipTodo) onSkipTodo(todo, 'not_needed');
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="btn btn-xs btn-ghost text-base-content/60 gap-0.5"
            >
              <MinusCircle className="w-3 h-3" />
              필요없었음
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSkipTodo) onSkipTodo(todo, 'missed');
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="btn btn-xs btn-ghost text-error gap-0.5"
            >
              <XCircle className="w-3 h-3" />
              놓침
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
