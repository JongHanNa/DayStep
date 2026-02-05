'use client';

import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Check } from 'lucide-react';
import type { Todo } from '@/entities/todo/Todo';
import { useTodoStore } from '@/state/stores/todoStore';

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
        ${todo.completed ? 'bg-base-200 text-base-content/40 line-through' : 'bg-base-100 hover:bg-base-300'}
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
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
          ${todo.completed ? 'bg-primary border-primary text-primary-content' : 'border-base-content/30 hover:border-primary'}
        `}
      >
        {todo.completed && <Check className="w-3 h-3" />}
      </button>

      {/* 시간 */}
      {timeStr && (
        <span className="flex-shrink-0 text-xs text-base-content/50 font-mono w-10">
          {timeStr}
        </span>
      )}

      {/* 아이콘 */}
      {todo.icon && (
        <span className="flex-shrink-0 text-sm">{todo.icon}</span>
      )}

      {/* 제목 */}
      <span className="truncate flex-1">{todo.title}</span>
    </div>
  );
}
