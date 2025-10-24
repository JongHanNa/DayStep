'use client';

import { useState } from 'react';
import { AlertCircle, ArrowRight, Pause, Briefcase, RotateCcw } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import type { Todo } from '@/entities/todo/Todo';

interface UnscheduledTodosListProps {
  overdueTodos: any[];
  nextActionTodos: any[];
  projectTodos: any[];
  waitingTodos: any[];
  onResetOverdue: () => void;
}

export default function UnscheduledTodosList({
  overdueTodos,
  nextActionTodos,
  projectTodos,
  waitingTodos,
  onResetOverdue,
}: UnscheduledTodosListProps) {
  const [activeTab, setActiveTab] = useState<'overdue' | 'nextAction' | 'project' | 'waiting'>('overdue');

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <h2 className="text-lg font-bold mb-4">날짜 설정 필요</h2>

      {/* 탭 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`btn btn-sm ${activeTab === 'overdue' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
        >
          <AlertCircle className="w-4 h-4" />
          기한지남 ({overdueTodos.length})
        </button>
        <button
          onClick={() => setActiveTab('nextAction')}
          className={`btn btn-sm ${activeTab === 'nextAction' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
        >
          <ArrowRight className="w-4 h-4" />
          다음행동 ({nextActionTodos.length})
        </button>
        <button
          onClick={() => setActiveTab('project')}
          className={`btn btn-sm ${activeTab === 'project' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
        >
          <Briefcase className="w-4 h-4" />
          진행중인 프로젝트별 할일 ({projectTodos.length})
        </button>
        <button
          onClick={() => setActiveTab('waiting')}
          className={`btn btn-sm ${activeTab === 'waiting' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
        >
          <Pause className="w-4 h-4" />
          대기중 ({waitingTodos.length})
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[400px]">
        {activeTab === 'overdue' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-base-content/70">기한이 지난 할일들</p>
              {overdueTodos.length > 0 && (
                <button
                  onClick={onResetOverdue}
                  className="btn btn-sm btn-ghost text-error rounded-full"
                >
                  <RotateCcw className="w-4 h-4" />
                  초기화
                </button>
              )}
            </div>
            {overdueTodos.length === 0 ? (
              <div className="text-center py-12 text-base-content/50">
                기한이 지난 할일이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {overdueTodos.map((todo) => (
                  <DraggableTodoItem key={todo.id} todo={todo} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'nextAction' && (
          <div>
            <p className="text-sm text-base-content/70 mb-3">다음행동으로 분류된 할일들</p>
            {nextActionTodos.length === 0 ? (
              <div className="text-center py-12 text-base-content/50">
                다음행동 할일이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {nextActionTodos.map((todo) => (
                  <DraggableTodoItem key={todo.id} todo={todo} showNextActionStatuses />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'project' && (
          <div>
            <p className="text-sm text-base-content/70 mb-3">프로젝트별로 그룹화된 할일들</p>
            {projectTodos.length === 0 ? (
              <div className="text-center py-12 text-base-content/50">
                프로젝트 할일이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {projectTodos.map((todo) => (
                  <DraggableTodoItem key={todo.id} todo={todo} showClarification />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'waiting' && (
          <div>
            <p className="text-sm text-base-content/70 mb-3">대기중인 할일들</p>
            {waitingTodos.length === 0 ? (
              <div className="text-center py-12 text-base-content/50">
                대기중인 할일이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {waitingTodos.map((todo) => (
                  <DraggableTodoItem key={todo.id} todo={todo} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 드래그 가능한 할일 아이템
interface DraggableTodoItemProps {
  todo: any;
  showNextActionStatuses?: boolean;
  showClarification?: boolean;
}

function DraggableTodoItem({ todo, showNextActionStatuses, showClarification }: DraggableTodoItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    data: todo,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-base-100 p-3 rounded-lg cursor-move hover:opacity-80 transition-opacity"
    >
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={todo.completed} className="checkbox checkbox-sm mt-1" readOnly />
        <div className="flex-1">
          <p className="font-medium">{todo.title}</p>
          {showNextActionStatuses && todo.nextActionStatuses && todo.nextActionStatuses.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {todo.nextActionStatuses.map((status: string) => (
                <span key={status} className="badge badge-sm bg-base-200">
                  {status}
                </span>
              ))}
            </div>
          )}
          {showClarification && todo.clarification && (
            <span className="badge badge-sm bg-base-200 mt-1">{todo.clarification}</span>
          )}
        </div>
      </div>
    </div>
  );
}
