'use client';

import { useEffect, useState, useMemo } from 'react';
import { Inbox, FolderOpen, Target, AlertCircle } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';
import { Todo } from '@/entities/todo/Todo';

interface OrganizeNeededViewProps {
  userId: string;
}

/**
 * 정리 탭 - 미분류 할일들 정리
 *
 * ADHD 관점:
 * - 분류 강요 없이, 정리가 필요한 것들만 모아서 표시
 * - "프로젝트 없는 할일", "목표 없는 프로젝트" 등
 * - 나중에 연결 OK: 할일 먼저 만들고, 여기서 한꺼번에 정리
 */
export function OrganizeNeededView({ userId }: OrganizeNeededViewProps) {
  const { todos, fetchAllTodos } = useTodoStore();
  const [isLoading, setIsLoading] = useState(true);

  // 프로젝트/목표 관련 기능 제거됨 - 빈 배열로 대체
  const projects: { id: string; title: string }[] = [];
  const goals: { id: string; title: string }[] = [];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAllTodos();
      setIsLoading(false);
    };
    loadData();
  }, [userId, fetchAllTodos]);

  // 프로젝트/목표 매핑 생성
  const projectMap = useMemo(() => {
    return new Map(projects.map(p => [p.id, p]));
  }, [projects]);

  const goalMap = useMemo(() => {
    return new Map(goals.map(g => [g.id, g]));
  }, [goals]);

  // 프로젝트 없는 할일 (완료되지 않은 것만)
  const orphanTodos = useMemo(() => {
    return todos.filter(todo => !todo.completed && !todo.projectId);
  }, [todos]);

  // 날짜 없는 할일 (완료되지 않은 것만)
  const undatedTodos = useMemo(() => {
    return todos.filter(todo => !todo.completed && !todo.startTime);
  }, [todos]);

  // 목표 없는 프로젝트 (완료되지 않은 것만) - 프로젝트 기능 제거됨
  const orphanProjects: { id: string; title: string }[] = [];

  // 할일 없는 프로젝트 (완료되지 않은 것만) - 프로젝트 기능 제거됨
  const emptyProjects: { id: string; title: string; goal_id?: string }[] = [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  const totalIssues = orphanTodos.length + undatedTodos.length + orphanProjects.length + emptyProjects.length;

  if (totalIssues === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-base-content/60">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-success" />
        </div>
        <p className="font-semibold text-success">완벽하게 정리되어 있어요!</p>
        <p className="text-sm mt-1">정리할 항목이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* 요약 카드 */}
      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-warning mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">정리가 필요한 항목</span>
        </div>
        <p className="text-sm text-base-content/70">
          총 {totalIssues}개의 항목이 정리를 기다리고 있어요.
          <br />
          <span className="text-xs text-base-content/50">
            (정리하지 않아도 괜찮아요. 필요할 때 하면 됩니다)
          </span>
        </p>
      </div>

      {/* 프로젝트 없는 할일 */}
      {orphanTodos.length > 0 && (
        <div className="bg-base-100 rounded-xl border border-base-200">
          <div className="flex items-center gap-2 p-4 border-b border-base-200">
            <FolderOpen className="w-5 h-5 text-info" />
            <span className="font-semibold">프로젝트 없는 할일</span>
            <span className="badge badge-sm badge-info">{orphanTodos.length}</span>
          </div>
          <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
            {orphanTodos.slice(0, 10).map(todo => (
              <div key={todo.id} className="flex items-center gap-2 p-2 bg-base-200 rounded-lg">
                <span className="text-sm truncate flex-1">{todo.title}</span>
                {/* 향후 프로젝트 연결 버튼 추가 */}
              </div>
            ))}
            {orphanTodos.length > 10 && (
              <p className="text-xs text-base-content/50 text-center">
                +{orphanTodos.length - 10}개 더 있음
              </p>
            )}
          </div>
        </div>
      )}

      {/* 날짜 없는 할일 */}
      {undatedTodos.length > 0 && (
        <div className="bg-base-100 rounded-xl border border-base-200">
          <div className="flex items-center gap-2 p-4 border-b border-base-200">
            <Inbox className="w-5 h-5 text-warning" />
            <span className="font-semibold">날짜 없는 할일</span>
            <span className="badge badge-sm badge-warning">{undatedTodos.length}</span>
          </div>
          <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
            {undatedTodos.slice(0, 10).map(todo => {
              const project = todo.projectId ? projectMap.get(todo.projectId) : undefined;
              return (
                <div key={todo.id} className="flex items-center gap-2 p-2 bg-base-200 rounded-lg">
                  <span className="text-sm truncate flex-1">{todo.title}</span>
                  {project && (
                    <span className="badge badge-xs badge-ghost">
                      {project.title}
                    </span>
                  )}
                </div>
              );
            })}
            {undatedTodos.length > 10 && (
              <p className="text-xs text-base-content/50 text-center">
                +{undatedTodos.length - 10}개 더 있음
              </p>
            )}
          </div>
        </div>
      )}

      {/* 목표 없는 프로젝트 */}
      {orphanProjects.length > 0 && (
        <div className="bg-base-100 rounded-xl border border-base-200">
          <div className="flex items-center gap-2 p-4 border-b border-base-200">
            <Target className="w-5 h-5 text-secondary" />
            <span className="font-semibold">목표 없는 프로젝트</span>
            <span className="badge badge-sm badge-secondary">{orphanProjects.length}</span>
          </div>
          <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
            {orphanProjects.slice(0, 10).map((project) => (
              <div key={project.id} className="flex items-center gap-2 p-2 bg-base-200 rounded-lg">
                <span className="text-sm truncate flex-1">{project.title}</span>
              </div>
            ))}
            {orphanProjects.length > 10 && (
              <p className="text-xs text-base-content/50 text-center">
                +{orphanProjects.length - 10}개 더 있음
              </p>
            )}
          </div>
        </div>
      )}

      {/* 할일 없는 프로젝트 */}
      {emptyProjects.length > 0 && (
        <div className="bg-base-100 rounded-xl border border-base-200">
          <div className="flex items-center gap-2 p-4 border-b border-base-200">
            <FolderOpen className="w-5 h-5 text-base-content/50" />
            <span className="font-semibold">할일 없는 프로젝트</span>
            <span className="badge badge-sm">{emptyProjects.length}</span>
          </div>
          <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
            {emptyProjects.slice(0, 10).map((project) => {
              const goal = project.goal_id ? goalMap.get(project.goal_id) : undefined;
              return (
                <div key={project.id} className="flex items-center gap-2 p-2 bg-base-200 rounded-lg">
                  <span className="text-sm truncate flex-1">{project.title}</span>
                  {goal && (
                    <span className="badge badge-xs badge-ghost">
                      {goal.title}
                    </span>
                  )}
                </div>
              );
            })}
            {emptyProjects.length > 10 && (
              <p className="text-xs text-base-content/50 text-center">
                +{emptyProjects.length - 10}개 더 있음
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
