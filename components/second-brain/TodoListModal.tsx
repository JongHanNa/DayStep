'use client';

import { useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { format } from 'date-fns';
import { getUnifiedIcon } from '@/lib/icon-collection';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import type { Project } from '@/types/second-brain';
import { useModalStore } from '@/state/stores/modalStore';

interface TodoItem {
  id: string;
  title: string;
  clarification?: string;
  nextActionStatuses?: string[];
  scheduledDate?: Date;
  isHighlight: boolean;
  completed: boolean;
  projectIds?: string[];
  noteIds?: string[];
  displayOrder?: number;
}

interface TodoListModalProps {
  open: boolean;
  date: Date | null;
  todos: TodoItem[];
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onClose: () => void;
  onTodoClick: (todo: TodoItem) => void;
  onToggleComplete: (todoId: string) => void;
}

export default function TodoListModal({
  open,
  date,
  todos,
  project,
  onClose,
  onTodoClick,
  onToggleComplete,
}: TodoListModalProps) {
  const { openModal, closeModal } = useModalStore();

  // 모달 열림/닫힘 상태 관리
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  if (!open || !date) return null;

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-base-300">
          <h3 className="text-lg font-bold">
            {format(date, 'M월 d일')} 할일 ({todos.length}개)
          </h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 할일 목록 */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {todos.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              할일이 없습니다.
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                onClick={() => onTodoClick(todo)}
                className="p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
              >
                {/* 제목 + 하이라이트 */}
                <div className="flex items-center gap-2 mb-2">
                  <p className={`text-sm font-medium flex-1 ${todo.completed ? 'line-through text-base-content/50' : ''}`}>
                    {todo.title}
                  </p>
                  {todo.isHighlight && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                  )}
                </div>

                {/* 명료화 */}
                {todo.clarification && (
                  <p className="text-xs text-base-content/60 mb-2 line-clamp-2">
                    {todo.clarification}
                  </p>
                )}

                {/* 프로젝트 배지 */}
                {project && (
                  <div className="flex items-center gap-1 mb-2">
                    <div className="text-xs bg-base-300 px-2 py-1 rounded-full flex items-center gap-1">
                      {project.icon && (() => {
                        const IconComponent = getUnifiedIcon(project.icon as UnifiedIconKey).component;
                        return (
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: project.color }}
                          >
                            <IconComponent className="w-3 h-3 text-white" />
                          </div>
                        );
                      })()}
                      <span className="font-medium">{project.title}</span>
                    </div>
                  </div>
                )}

                {/* 완료 체크박스 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleComplete(todo.id);
                    }}
                    className="checkbox checkbox-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xs text-base-content/60">완료</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
