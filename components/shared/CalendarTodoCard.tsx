'use client';

import { Clock } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface InboxItem {
  id: string;
  title: string;
  completed: boolean;
  isHighlight?: boolean;
  startTime?: string;
  color?: string;
}

interface CalendarTodoCardProps {
  todo: InboxItem;
  onClick?: () => void;
  onToggle?: (id: string) => void;
  showCheckbox?: boolean;
  enableDragDrop?: boolean;
  isSpanning?: boolean;
  segmentPosition?: 'single' | 'first' | 'middle' | 'last';
  projectColor?: string;
  dragId?: string;
  dropId?: string;
}

/**
 * 달력에서 사용하는 공통 할일 카드 컴포넌트
 * 프로젝트 편집 모달의 심플한 디자인을 기준으로 구현
 */
export default function CalendarTodoCard({
  todo,
  onClick,
  onToggle,
  showCheckbox = false,
  enableDragDrop = false,
  isSpanning = false,
  segmentPosition = 'single',
  projectColor,
  dragId,
  dropId,
}: CalendarTodoCardProps) {
  // 드래그 앤 드롭 (옵션)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId || `todo-${todo.id}`,
    data: { todoId: todo.id, type: 'todo' },
    disabled: !enableDragDrop,
  });

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: dropId || `todo-${todo.id}`,
    data: { todoId: todo.id, type: 'todo' },
    disabled: !enableDragDrop,
  });

  // 두 개의 ref를 결합
  const setRefs = (node: HTMLDivElement | null) => {
    if (enableDragDrop) {
      setNodeRef(node);
      setDropNodeRef(node);
    }
  };

  // 세그먼트 위치에 따른 border-radius 결정
  const getBorderRadius = () => {
    if (!isSpanning) return 'rounded';

    switch (segmentPosition) {
      case 'single':
        return 'rounded-lg';
      case 'first':
        return 'rounded-l-lg rounded-r-none';
      case 'middle':
        return 'rounded-none';
      case 'last':
        return 'rounded-l-none rounded-r-lg';
      default:
        return 'rounded-lg';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle(todo.id);
    }
  };

  return (
    <div
      ref={enableDragDrop ? setRefs : undefined}
      {...(enableDragDrop ? attributes : {})}
      {...(enableDragDrop ? listeners : {})}
      onClick={handleClick}
      className={`
        transition-colors cursor-pointer text-xs
        ${isDragging ? 'opacity-50' : ''}
        ${isOver ? 'ring-2 ring-primary' : ''}
        ${
          isSpanning
            ? `bg-white hover:bg-gray-50 border-2 border-base-300 ${getBorderRadius()}
             ${segmentPosition === 'first' || segmentPosition === 'single' ? 'pl-1.5' : 'pl-0'}
             ${segmentPosition === 'last' || segmentPosition === 'single' ? 'pr-1.5' : 'pr-0'}
             py-1.5`
            : 'bg-white hover:bg-gray-50 border-2 border-base-300 rounded p-1.5'
        }
      `}
    >
      {/* 제목 + 하이라이트 */}
      <div className="flex items-center gap-1.5 mb-1">
        <p
          className={`flex-1 font-medium line-clamp-1 ${
            todo.completed ? 'line-through text-base-content/50' : ''
          }`}
        >
          {todo.title}
        </p>
        {todo.isHighlight && (
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: projectColor || todo.color || '#808080' }}
          />
        )}
      </div>

      {/* 메타 정보 */}
      {todo.startTime && (
        <div className="flex items-center gap-2 text-[10px] text-base-content/60">
          <div className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            <span>{todo.startTime}</span>
          </div>
        </div>
      )}

      {/* 체크박스 (옵션) */}
      {showCheckbox && onToggle && (
        <div className="mt-1 pt-1 border-base-300">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={(e) => {
              e.stopPropagation();
              if (onToggle) {
                onToggle(todo.id);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="checkbox checkbox-xs"
          />
        </div>
      )}
    </div>
  );
}
