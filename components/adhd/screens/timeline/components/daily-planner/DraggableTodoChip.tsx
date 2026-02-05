'use client';

import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Circle, MinusCircle, XCircle } from 'lucide-react';
import type { Todo } from '@/entities/todo/Todo';
import { useTodoStore } from '@/state/stores/todoStore';
import { unifiedIconsCollection } from '@/lib/icon-collection';

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
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
}

export function DraggableTodoChip({ todo, showTime = false, onEditClick, onToggle }: DraggableTodoChipProps) {
  const toggleTodo = useTodoStore(s => s.toggleTodo);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `chip-${todo.id}`,
    data: { type: 'todo', todoId: todo.id },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const timeStr = showTime && todo.startTime
    ? new Date(todo.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;

  const isSkipped = todo.skipStatus !== null && todo.skipStatus !== undefined;

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
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-grab active:cursor-grabbing transition-colors
        ${isSkipped ? 'bg-base-200 text-base-content/40 line-through' : todo.completed ? 'bg-base-200 text-base-content/40 line-through' : 'bg-base-100 hover:bg-base-300'}
        ${isDragging ? 'shadow-lg z-50' : ''}
      `}
    >
      {/* 완료 체크 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onToggle) {
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

      {/* 제목 */}
      <span className="truncate flex-1">{todo.title}</span>

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
  );
}
