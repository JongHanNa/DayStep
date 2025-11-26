'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, ArrowRight, Pause, Briefcase, RotateCcw, ChevronDown, Zap } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { InboxItem, Project } from '@/types/second-brain';
import type { NextActionContextItem } from '@/types';

interface UnscheduledTodosListProps {
  overdueTodos: InboxItem[];
  nextActionTodos: InboxItem[];
  projectTodos: InboxItem[];
  waitingTodos: InboxItem[];
  projects: Project[];
  nextActionContexts?: NextActionContextItem[];
  onResetOverdue: () => void;
  onTodoClick?: (item: InboxItem) => void;
}

// 명료화 상태를 한글 라벨로 변환
function getClarificationLabel(clarification?: string): string {
  if (!clarification || clarification === 'none') return '선택 안함';

  const labelMap: Record<string, string> = {
    'reminder': '다시알림',
    'someday': '언젠가',
    'waiting': '대기중',
    'next_action': '다음행동',
    'schedule_clear': '일정',
  };

  return labelMap[clarification] || clarification;
}

export default function UnscheduledTodosList({
  overdueTodos,
  nextActionTodos,
  projectTodos,
  waitingTodos,
  projects,
  nextActionContexts,
  onResetOverdue,
  onTodoClick,
}: UnscheduledTodosListProps) {
  const [activeTab, setActiveTab] = useState<'overdue' | 'nextAction' | 'project' | 'waiting'>('overdue');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // 프로젝트 아코디언 토글
  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // 진행 중인 프로젝트에 연결된 할일 수 계산
  const projectAssignedTodosCount = useMemo(() => {
    const inProgressProjectIds = projects
      .filter(p => p.status === 'in_progress')
      .map(p => p.id);
    return projectTodos.filter(todo =>
      todo.project_id && inProgressProjectIds.includes(todo.project_id)
    ).length;
  }, [projectTodos, projects]);

  // 진행 중인 프로젝트 기준으로 할일 그룹화 (할일 0개여도 프로젝트 표시)
  const groupTodosByProject = (todos: InboxItem[]) => {
    // 진행 중인 프로젝트 목록 기준으로 그룹 생성
    const inProgressProjects = projects.filter(p => p.status === 'in_progress');

    return inProgressProjects.map(project => ({
      projectId: project.id,
      projectName: project.title,
      todos: todos.filter(todo => todo.project_id === project.id),
    }));
  };

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
          진행중인 프로젝트별 할일 ({projectAssignedTodosCount})
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
                  <DraggableTodoItem key={todo.id} todo={todo} showDate onTodoClick={onTodoClick} />
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
                  <DraggableTodoItem
                    key={todo.id}
                    todo={todo}
                    showNextActionStatuses
                    nextActionContexts={nextActionContexts}
                    onTodoClick={onTodoClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'project' && (
          <div>
            {projects.filter(p => p.status === 'in_progress').length === 0 ? (
              <div className="text-center py-12 text-base-content/50">
                진행 중인 프로젝트가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {groupTodosByProject(projectTodos).map((group) => {
                  const isExpanded = expandedProjects.has(group.projectId);
                  return (
                    <div key={group.projectId || 'no-project'}>
                      {/* 클릭 가능한 아코디언 헤더 */}
                      <button
                        onClick={() => toggleProject(group.projectId)}
                        className="w-full flex items-center justify-between gap-2 bg-base-300 py-2 px-3 rounded-lg hover:bg-base-300/80 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" style={{ color: '#808080' }} />
                          <span className="font-semibold" style={{ color: '#808080' }}>
                            {group.projectName}
                          </span>
                          <span className="badge badge-sm bg-base-200" style={{ color: '#808080' }}>
                            {group.todos.length}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 text-base-content/50 transition-transform duration-200',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </button>

                      {/* 콘텐츠 (접기/펼치기) */}
                      <div
                        className={cn(
                          'overflow-hidden transition-all duration-200 ease-out',
                          isExpanded ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'
                        )}
                      >
                        <div className="space-y-2 pl-2">
                          {group.todos.length === 0 ? (
                            <div className="text-sm text-base-content/50 py-2 px-2">
                              날짜 설정이 필요한 할일이 없습니다.
                            </div>
                          ) : (
                            group.todos.map((todo) => (
                              <DraggableTodoItem
                                key={todo.id}
                                todo={todo}
                                showClarification
                                onTodoClick={onTodoClick}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                  <DraggableTodoItem key={todo.id} todo={todo} onTodoClick={onTodoClick} />
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
  todo: InboxItem;
  showNextActionStatuses?: boolean;
  showClarification?: boolean;
  showDate?: boolean;
  nextActionContexts?: NextActionContextItem[];
  onTodoClick?: (item: InboxItem) => void;
}

function DraggableTodoItem({
  todo,
  showNextActionStatuses,
  showClarification,
  showDate,
  nextActionContexts,
  onTodoClick
}: DraggableTodoItemProps) {
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

  const handleClick = (e: React.MouseEvent) => {
    // 드래그 중에는 클릭 이벤트 무시
    if (!isDragging && onTodoClick) {
      onTodoClick(todo);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className="bg-base-100 p-3 rounded-lg cursor-move hover:opacity-80 transition-opacity"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="font-medium">{todo.content}</p>

          {/* 날짜 표시 */}
          {showDate && todo.scheduled_date && (
            <p className="text-sm text-base-content/60 mt-1">
              {format(new Date(todo.scheduled_date), 'yyyy.MM.dd')}
            </p>
          )}

          {/* 다음행동상황 badges */}
          {showNextActionStatuses && nextActionContexts && todo.next_action_context_ids && todo.next_action_context_ids.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {todo.next_action_context_ids.map((contextId: string) => {
                const context = nextActionContexts.find(c => c.id === contextId);
                if (!context) return null;
                return (
                  <span key={contextId} className="inline-flex items-center gap-1 badge badge-sm bg-base-200">
                    <Zap className="w-3 h-3" />
                    {context.title}
                  </span>
                );
              })}
            </div>
          )}
          {/* 기존 next_action_status (레거시) */}
          {showNextActionStatuses && todo.next_action_status && (
            <div className="flex flex-wrap gap-1 mt-1">
              {todo.next_action_status.split(', ').map((status: string) => (
                <span key={status} className="badge badge-sm bg-base-200">
                  {status}
                </span>
              ))}
            </div>
          )}
          {showClarification && todo.clarification && (
            <span className="badge badge-sm bg-base-200 mt-1">{getClarificationLabel(todo.clarification)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
